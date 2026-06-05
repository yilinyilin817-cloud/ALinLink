import { useState, useEffect, useRef } from "react";
import { ALinLinkBridge } from "../../../infrastructure/services/ALinLinkBridge";

interface NetworkInterface {
  name: string;
  ip: string;
  netmask: string;
  cidr: string;
  mac: string;
}

interface ScanHost {
  ip: string;
  hostname: string | null;
  services: Array<{ port: number; service: string }>;
  mac: string | null;
  discoveredAt: string;
}

interface ScanProgress {
  scanId: string;
  scanned: number;
  total: number;
  active: number;
  found: number;
}

interface NetworkScanPanelProps {
  onAddHost?: (host: ScanHost) => void;
  onClose?: () => void;
}

export function NetworkScanPanel({ onAddHost, onClose }: NetworkScanPanelProps) {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedCidr, setSelectedCidr] = useState("");
  const [customCidr, setCustomCidr] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [foundHosts, setFoundHosts] = useState<ScanHost[]>([]);
  const [scanPorts, setScanPorts] = useState("22,80,443,3389");
  const [scanTimeout, setScanTimeout] = useState(1000);
  const [concurrency, setConcurrency] = useState(50);
  const [detectHostname, setDetectHostname] = useState(true);
  const [detectServices, setDetectServices] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scanIdRef = useRef<string | null>(null);

  useEffect(() => {
    const loadInterfaces = async () => {
      try {
        const bridge = ALinLinkBridge.get();
        if (!bridge) return;
        const result = await bridge.getNetworkInterfaces?.();
        if (result) {
          setInterfaces(result);
          if (result.length > 0) {
            setSelectedCidr(result[0].cidr);
          }
        }
      } catch (err) {
        console.error("加载网络接口失败:", err);
      }
    };
    loadInterfaces();
  }, []);

  useEffect(() => {
    const bridge = ALinLinkBridge.get();
    if (!bridge) return;

    const handleProgress = (data: ScanProgress) => {
      if (data.scanId === scanIdRef.current) {
        setScanProgress(data);
      }
    };

    const handleHostFound = (data: { scanId: string; host: ScanHost }) => {
      if (data.scanId === scanIdRef.current) {
        setFoundHosts((prev) => [...prev, data.host]);
      }
    };

    const handleComplete = (data: { scanId: string; hosts: ScanHost[] }) => {
      if (data.scanId === scanIdRef.current) {
        setIsScanning(false);
        setFoundHosts(data.hosts);
        scanIdRef.current = null;
      }
    };

    const unsubscribeProgress = bridge.onScanProgress?.(handleProgress);
    const unsubscribeHostFound = bridge.onScanHostFound?.(handleHostFound);
    const unsubscribeComplete = bridge.onScanComplete?.(handleComplete);

    return () => {
      unsubscribeProgress?.();
      unsubscribeHostFound?.();
      unsubscribeComplete?.();
    };
  }, []);

  const handleStartScan = async () => {
    const bridge = ALinLinkBridge.get();
    if (!bridge) {
      setError("桥接不可用");
      return;
    }

    const cidr = customCidr || selectedCidr;
    if (!cidr) {
      setError("请选择或输入 CIDR 网段");
      return;
    }

    setError(null);
    setIsScanning(true);
    setFoundHosts([]);
    setScanProgress(null);

    try {
      const ports = scanPorts
        .split(",")
        .map((p) => parseInt(p.trim(), 10))
        .filter((p) => !isNaN(p));

      const result = await bridge.startNetworkScan?.({
        cidr,
        scanPorts: ports,
        timeout: scanTimeout,
        concurrency,
        detectHostname,
        detectServices,
      });

      if (result) {
        scanIdRef.current = result.scanId;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "扫描失败");
      setIsScanning(false);
    }
  };

  const handleCancelScan = async () => {
    const bridge = ALinLinkBridge.get();
    if (!bridge || !scanIdRef.current) return;

    try {
      await bridge.cancelNetworkScan?.({
        scanId: scanIdRef.current,
      });
      setIsScanning(false);
      scanIdRef.current = null;
    } catch (err) {
      console.error("取消扫描失败:", err);
    }
  };

  const handleQuickScan = async () => {
    const bridge = ALinLinkBridge.get();
    if (!bridge) {
      setError("桥接不可用");
      return;
    }

    setError(null);
    setIsScanning(true);
    setFoundHosts([]);
    setScanProgress(null);

    try {
      const result = await bridge.quickScanNetwork?.({
        ports: [22],
        timeout: 500,
      });

      if (result) {
        scanIdRef.current = result.scanId;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "快速扫描失败");
      setIsScanning(false);
    }
  };

  const handleAddToVault = (host: ScanHost) => {
    if (onAddHost) {
      onAddHost(host);
    }
  };

  const progressPercent = scanProgress
    ? Math.round((scanProgress.scanned / scanProgress.total) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">内网扫描</h2>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-accent rounded" title="关闭">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">网段范围</label>
          <div className="flex gap-2">
            <select
              value={selectedCidr}
              onChange={(e) => { setSelectedCidr(e.target.value); setCustomCidr(""); }}
              className="flex-1 p-2 border rounded bg-background"
              disabled={isScanning}
            >
              <option value="">选择网络接口...</option>
              {interfaces.map((iface, idx) => (
                <option key={`${iface.cidr || idx}-${idx}`} value={iface.cidr}>
                  {iface.name} - {iface.cidr} ({iface.ip})
                </option>
              ))}
            </select>
            <span className="self-center text-muted-foreground">或</span>
            <input
              type="text"
              value={customCidr}
              onChange={(e) => setCustomCidr(e.target.value)}
              placeholder="192.168.1.0/24"
              className="flex-1 p-2 border rounded bg-background"
              disabled={isScanning}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">端口</label>
            <input type="text" value={scanPorts} onChange={(e) => setScanPorts(e.target.value)} placeholder="22,80,443" className="w-full p-2 border rounded bg-background" disabled={isScanning} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">超时 (毫秒)</label>
            <input type="number" value={scanTimeout} onChange={(e) => setScanTimeout(parseInt(e.target.value, 10) || 1000)} min={100} max={10000} className="w-full p-2 border rounded bg-background" disabled={isScanning} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">并发数</label>
            <input type="number" value={concurrency} onChange={(e) => setConcurrency(parseInt(e.target.value, 10) || 50)} min={1} max={200} className="w-full p-2 border rounded bg-background" disabled={isScanning} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">选项</label>
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={detectHostname} onChange={(e) => setDetectHostname(e.target.checked)} disabled={isScanning} />
                <span className="text-sm">解析主机名</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={detectServices} onChange={(e) => setDetectServices(e.target.checked)} disabled={isScanning} />
                <span className="text-sm">检测服务</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isScanning ? (
            <button onClick={handleCancelScan} className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90">
              取消扫描
            </button>
          ) : (
            <>
              <button onClick={handleStartScan} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                开始扫描
              </button>
              <button onClick={handleQuickScan} className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90">
                快速 SSH 扫描
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded border border-destructive/20">{error}</div>
        )}

        {scanProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>扫描中: {scanProgress.scanned}/{scanProgress.total}</span>
              <span>已发现: {scanProgress.found}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="text-xs text-muted-foreground">
              活跃: {scanProgress.active} | 进度: {progressPercent}%
            </div>
          </div>
        )}

        {foundHosts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">已发现主机 ({foundHosts.length})</h3>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-2">IP</th>
                    <th className="text-left p-2">主机名</th>
                    <th className="text-left p-2">服务</th>
                    <th className="text-right p-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {foundHosts.map((host) => (
                    <tr key={host.ip} className="border-t hover:bg-accent">
                      <td className="p-2 font-mono">{host.ip}</td>
                      <td className="p-2">{host.hostname || "-"}</td>
                      <td className="p-2">{host.services.length > 0 ? host.services.map((s) => s.service).join(", ") : "-"}</td>
                      <td className="p-2 text-right">
                        <button onClick={() => handleAddToVault(host)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
                          添加到 Vault
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
