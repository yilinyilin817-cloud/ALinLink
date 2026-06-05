/**
 * Network Scan Bridge - Handles LAN host discovery and port scanning
 * Provides functionality to scan local network for active hosts
 */

const net = require("node:net");
const os = require("node:os");
const { exec } = require("node:child_process");
const { promisify } = require("node:util");

const execAsync = promisify(exec);

// Active scan sessions
const activeScanSessions = new Map();

/**
 * Get local network information
 */
function getLocalNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const results = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      // Skip internal and non-IPv4 addresses
      if (addr.internal || addr.family !== "IPv4") continue;

      const ip = addr.address;
      const netmask = addr.netmask;
      const cidr = ipToCidr(ip, netmask);

      results.push({
        name,
        ip,
        netmask,
        cidr,
        mac: addr.mac,
      });
    }
  }

  return results;
}

/**
 * Convert IP and netmask to CIDR notation
 */
function ipToCidr(ip, netmask) {
  const ipParts = ip.split(".").map(Number);
  const maskParts = netmask.split(".").map(Number);

  // Calculate network address
  const networkParts = ipParts.map((part, i) => part & maskParts[i]);

  // Calculate CIDR prefix length
  let prefixLength = 0;
  for (const part of maskParts) {
    let val = part;
    while (val & 0x80) {
      prefixLength++;
      val <<= 1;
    }
  }

  return `${networkParts.join(".")}/${prefixLength}`;
}

/**
 * Generate IP list from CIDR range
 */
function generateIpList(cidr) {
  const [network, prefixStr] = cidr.split("/");
  const prefix = parseInt(prefixStr, 10);

  if (prefix < 16 || prefix > 30) {
    throw new Error("CIDR prefix must be between 16 and 30");
  }

  const networkParts = network.split(".").map(Number);
  const hostBits = 32 - prefix;
  const numHosts = Math.pow(2, hostBits) - 2; // Exclude network and broadcast

  if (numHosts > 65534) {
    throw new Error("Range too large. Maximum is /16 (65534 hosts)");
  }

  const ips = [];
  const mask = (~0 << hostBits) >>> 0;

  for (let i = 1; i <= numHosts; i++) {
    const ipParts = [...networkParts];
    let carry = i;

    for (let j = 3; j >= 0; j--) {
      const hostPart = carry & 0xff;
      ipParts[j] = (ipParts[j] & ((mask >>> (8 * (3 - j))) & 0xff)) | hostPart;
      carry = carry >>> 8;
    }

    // Skip if same as network or broadcast
    const ipStr = ipParts.join(".");
    if (ipStr === network) continue;

    ips.push(ipStr);
  }

  return ips;
}

/**
 * Check if a host is alive using ping
 */
async function pingHost(ip, timeout = 1000) {
  try {
    const isWindows = process.platform === "win32";
    const pingCmd = isWindows
      ? `ping -n 1 -w ${timeout} ${ip}`
      : `ping -c 1 -W ${Math.ceil(timeout / 1000)} ${ip}`;

    await execAsync(pingCmd, { timeout: timeout + 500, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scan a single TCP port
 */
function scanPort(ip, port, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      cleanup();
      resolve(true);
    });

    socket.on("timeout", () => {
      cleanup();
      resolve(false);
    });

    socket.on("error", () => {
      cleanup();
      resolve(false);
    });

    socket.connect(port, ip);
  });
}

/**
 * Get hostname for an IP address
 */
async function getHostname(ip) {
  try {
    const isWindows = process.platform === "win32";
    const cmd = isWindows
      ? `nslookup ${ip}`
      : `host ${ip}`;

    const { stdout } = await execAsync(cmd, { timeout: 3000, windowsHide: true });

    if (isWindows) {
      const match = stdout.match(/Name:\s+(.+)/i);
      return match ? match[1].trim() : null;
    } else {
      const match = stdout.match(/domain name pointer\s+(.+)/i);
      return match ? match[1].trim().replace(/\.$/, "") : null;
    }
  } catch {
    return null;
  }
}

/**
 * Detect common services on a host
 */
async function detectServices(ip, ports = [22, 80, 443, 3389, 5900, 8080, 8443]) {
  const results = [];

  const checks = ports.map(async (port) => {
    const isOpen = await scanPort(ip, port, 500);
    if (isOpen) {
      results.push({
        port,
        service: getServiceName(port),
      });
    }
  });

  await Promise.all(checks);
  return results;
}

/**
 * Get service name for common ports
 */
function getServiceName(port) {
  const services = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    143: "IMAP",
    443: "HTTPS",
    445: "SMB",
    993: "IMAPS",
    995: "POP3S",
    1433: "MSSQL",
    1521: "Oracle",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    5900: "VNC",
    5901: "VNC-1",
    6379: "Redis",
    8080: "HTTP-Alt",
    8443: "HTTPS-Alt",
    9090: "WebConsole",
    27017: "MongoDB",
  };

  return services[port] || `Port-${port}`;
}

/**
 * Start a network scan
 */
async function startScan(event, payload) {
  const {
    cidr,
    scanPorts = [22, 80, 443, 3389, 5900],
    timeout = 1000,
    concurrency = 50,
    detectHostname = true,
    detectServices: shouldDetectServices = true,
  } = payload;

  const scanId = `scan_${Date.now()}`;
  const sender = event.sender;
  const results = new Map();
  let scanned = 0;
  let active = 0;
  let completed = false;

  // Store scan session
  activeScanSessions.set(scanId, {
    cancelled: false,
    results,
  });

  try {
    const ips = generateIpList(cidr);
    const total = ips.length;

    // Send initial progress
    safeSend(sender, "ALinLink:scan:progress", {
      scanId,
      scanned: 0,
      total,
      active: 0,
      found: 0,
    });

    // Process IPs with concurrency control
    const queue = [...ips];

    async function processNext() {
      if (activeScanSessions.get(scanId)?.cancelled) return;

      while (queue.length > 0 && active < concurrency) {
        const ip = queue.shift();
        active++;

        processIp(ip).finally(() => {
          active--;
          scanned++;

          // Send progress update
          safeSend(sender, "ALinLink:scan:progress", {
            scanId,
            scanned,
            total,
            active,
            found: results.size,
          });

          // Continue processing
          if (queue.length > 0 && !activeScanSessions.get(scanId)?.cancelled) {
            processNext();
          } else if (scanned >= total && !completed) {
            completed = true;
            finishScan();
          }
        });
      }
    }

    async function processIp(ip) {
      try {
        const isAlive = await pingHost(ip, timeout);
        if (!isAlive) return;

        const host = {
          ip,
          hostname: null,
          services: [],
          mac: null,
          discoveredAt: new Date().toISOString(),
        };

        // Get hostname
        if (detectHostname) {
          host.hostname = await getHostname(ip);
        }

        // Detect services
        if (shouldDetectServices) {
          host.services = await detectServices(ip, scanPorts);
        }

        results.set(ip, host);

        // Send host found event
        safeSend(sender, "ALinLink:scan:host-found", {
          scanId,
          host,
        });
      } catch (err) {
        console.error(`[NetworkScan] Error processing ${ip}:`, err.message);
      }
    }

    function finishScan() {
      const hosts = Array.from(results.values());

      // Send completion event
      safeSend(sender, "ALinLink:scan:complete", {
        scanId,
        hosts,
        total,
        found: hosts.length,
      });

      // Cleanup
      activeScanSessions.delete(scanId);
    }

    // Start processing
    await processNext();

    // If no IPs to process (empty range)
    if (ips.length === 0) {
      finishScan();
    }

    return { scanId, total };
  } catch (err) {
    activeScanSessions.delete(scanId);
    throw err;
  }
}

/**
 * Cancel an active scan
 */
function cancelScan(event, payload) {
  const { scanId } = payload;
  const session = activeScanSessions.get(scanId);

  if (session) {
    session.cancelled = true;
    activeScanSessions.delete(scanId);
    return { success: true };
  }

  return { success: false, error: "Scan not found" };
}

/**
 * Quick scan for common SSH hosts
 */
async function quickScan(event, payload) {
  const { ports = [22], timeout = 500 } = payload;

  // Get local network info
  const networks = getLocalNetworkInfo();
  if (networks.length === 0) {
    throw new Error("No local network interfaces found");
  }

  // Use the first non-internal interface
  const network = networks[0];
  const cidr = network.cidr;

  // Start scan with SSH port only
  return startScan(event, {
    cidr,
    scanPorts: ports,
    timeout,
    concurrency: 100,
    detectHostname: true,
    detectServices: false,
  });
}

/**
 * Get local network interfaces
 */
function getNetworkInterfaces() {
  return getLocalNetworkInfo();
}

// Safe send utility
function safeSend(sender, channel, data) {
  try {
    if (sender && !sender.isDestroyed()) {
      sender.send(channel, data);
    }
  } catch (err) {
    console.error(`[NetworkScan] Failed to send ${channel}:`, err.message);
  }
}

/**
 * Initialize the bridge (no-op for now, but maintains consistency)
 */
function init() {
  // No initialization needed
}

/**
 * Register IPC handlers
 */
function registerHandlers(ipcMain) {
  ipcMain.handle("ALinLink:scan:start", startScan);
  ipcMain.handle("ALinLink:scan:cancel", cancelScan);
  ipcMain.handle("ALinLink:scan:quick", quickScan);
  ipcMain.handle("ALinLink:scan:interfaces", getNetworkInterfaces);
}

module.exports = {
  init,
  registerHandlers,
  getLocalNetworkInfo,
  generateIpList,
  pingHost,
  scanPort,
  getHostname,
  detectServices,
};
