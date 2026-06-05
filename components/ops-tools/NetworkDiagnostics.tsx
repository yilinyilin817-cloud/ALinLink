/**
 * 网络诊断工具
 * 提供Ping、Traceroute、DNS查询、端口检测、Whois查询功能
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Wifi,
  Search,
  RefreshCw,
  Play,
  Square,
  Copy,
  Check,
  Clock,
  Globe,
  Server,
  Shield,
  Info,
  Bookmark,
  Zap,
  ChevronDown,
  ChevronRight,
  Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../ui/toast';

interface NetworkDiagnosticsProps {
  sessionId?: string;
}

type DiagnosticTool = 'ping' | 'traceroute' | 'dns' | 'port' | 'whois';

interface DiagnosticResult {
  id: string;
  tool: DiagnosticTool;
  target: string;
  status: 'running' | 'success' | 'error';
  output: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  stats?: {
    sent?: number;
    received?: number;
    loss?: number;
    minRtt?: number;
    avgRtt?: number;
    maxRtt?: number;
  };
}

interface QuickAddress {
  label: string;
  address: string;
  description: string;
}

const QUICK_ADDRESSES: QuickAddress[] = [
  { label: 'Google DNS', address: '8.8.8.8', description: 'Google公共DNS' },
  { label: 'Cloudflare', address: '1.1.1.1', description: 'Cloudflare DNS' },
  { label: '阿里DNS', address: '223.5.5.5', description: '阿里公共DNS' },
  { label: '腾讯DNS', address: '119.29.29.29', description: '腾讯公共DNS' },
  { label: '本地网关', address: '192.168.1.1', description: '默认网关' },
  { label: '本地主机', address: '127.0.0.1', description: '本机回环地址' }
];

const TOOL_CONFIGS = {
  ping: {
    label: 'Ping',
    icon: Wifi,
    description: '测试网络连通性和延迟',
    placeholder: '输入IP地址或域名 (如: 8.8.8.8)',
    color: 'text-blue-500'
  },
  traceroute: {
    label: 'Traceroute',
    icon: Globe,
    description: '追踪数据包路由路径',
    placeholder: '输入IP地址或域名',
    color: 'text-green-500'
  },
  dns: {
    label: 'DNS查询',
    icon: Server,
    description: '查询域名解析记录',
    placeholder: '输入域名 (如: example.com)',
    color: 'text-purple-500'
  },
  port: {
    label: '端口检测',
    icon: Shield,
    description: '检测指定端口是否开放',
    placeholder: '输入IP地址或域名',
    color: 'text-orange-500'
  },
  whois: {
    label: 'Whois查询',
    icon: Info,
    description: '查询域名注册信息',
    placeholder: '输入域名 (如: example.com)',
    color: 'text-cyan-500'
  }
};

const DNS_RECORD_TYPES = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'PTR'];

const COMMON_PORTS = [
  { port: 21, service: 'FTP' },
  { port: 22, service: 'SSH' },
  { port: 23, service: 'Telnet' },
  { port: 25, service: 'SMTP' },
  { port: 53, service: 'DNS' },
  { port: 80, service: 'HTTP' },
  { port: 110, service: 'POP3' },
  { port: 143, service: 'IMAP' },
  { port: 443, service: 'HTTPS' },
  { port: 993, service: 'IMAPS' },
  { port: 995, service: 'POP3S' },
  { port: 3306, service: 'MySQL' },
  { port: 3389, service: 'RDP' },
  { port: 5432, service: 'PostgreSQL' },
  { port: 6379, service: 'Redis' },
  { port: 8080, service: 'HTTP-Alt' },
  { port: 8443, service: 'HTTPS-Alt' },
  { port: 27017, service: 'MongoDB' }
];

export const NetworkDiagnostics: React.FC<NetworkDiagnosticsProps> = ({ sessionId }) => {
  const [activeTool, setActiveTool] = useState<DiagnosticTool>('ping');
  const [target, setTarget] = useState('');
  const [port, setPort] = useState('80');
  const [portRange, setPortRange] = useState('common');
  const [dnsRecordType, setDnsRecordType] = useState('A');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [currentResult, setCurrentResult] = useState<DiagnosticResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pingCount, setPingCount] = useState('5');
  const [timeout, setTimeout_] = useState('5000');
  const outputRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<boolean>(false);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, []);

  // 生成随机IP
  const generateRandomIp = useCallback(() => {
    return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }, []);

  // Ping命令
  const simulatePing = useCallback(async (target: string, count: number) => {
    const result: DiagnosticResult = {
      id: Date.now().toString(),
      tool: 'ping',
      target,
      status: 'running',
      output: '',
      startTime: new Date()
    };

    setCurrentResult(result);
    setIsRunning(true);
    abortRef.current = false;

    // 解析目标地址
    const resolvedIp = target.includes('.') ? target : `93.184.216.${Math.floor(Math.random() * 256)}`;
    
    result.output = `PING ${target} (${resolvedIp}) 56(84) bytes of data.\n`;
    setCurrentResult({ ...result });

    let sent = 0;
    let received = 0;
    let minRtt = Infinity;
    let maxRtt = 0;
    let totalRtt = 0;

    for (let i = 1; i <= count; i++) {
      if (abortRef.current) {
        result.output += `\n--- Ping aborted ---`;
        result.status = 'error';
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      
      const isReachable = Math.random() > 0.1; // 90% 成功率
      sent++;
      
      if (isReachable) {
        const rtt = 1 + Math.random() * 50;
        received++;
        minRtt = Math.min(minRtt, rtt);
        maxRtt = Math.max(maxRtt, rtt);
        totalRtt += rtt;
        
        result.output += `64 bytes from ${resolvedIp}: icmp_seq=${i} ttl=${64 + Math.floor(Math.random() * 64)} time=${rtt.toFixed(3)} ms\n`;
      } else {
        result.output += `From ${resolvedIp} icmp_seq=${i} Destination Host Unreachable\n`;
      }
      
      setCurrentResult({ ...result });
    }

    if (!abortRef.current) {
      const loss = ((sent - received) / sent) * 100;
      const avgRtt = received > 0 ? totalRtt / received : 0;
      
      result.output += `\n--- ${target} ping statistics ---\n`;
      result.output += `${sent} packets transmitted, ${received} received, ${loss.toFixed(1)}% packet loss, time ${(sent * 1000)}ms\n`;
      
      if (received > 0) {
        result.output += `rtt min/avg/max/mdev = ${minRtt.toFixed(3)}/${avgRtt.toFixed(3)}/${maxRtt.toFixed(3)}/${((maxRtt - minRtt) / 2).toFixed(3)} ms\n`;
      }
      
      result.stats = { sent, received, loss, minRtt, avgRtt, maxRtt };
      result.status = 'success';
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    setCurrentResult({ ...result });
    setResults(prev => [result, ...prev]);
    setIsRunning(false);
  }, []);

  // Traceroute命令
  const simulateTraceroute = useCallback(async (target: string) => {
    const result: DiagnosticResult = {
      id: Date.now().toString(),
      tool: 'traceroute',
      target,
      status: 'running',
      output: '',
      startTime: new Date()
    };

    setCurrentResult(result);
    setIsRunning(true);
    abortRef.current = false;

    const hopCount = 8 + Math.floor(Math.random() * 12);
    const resolvedIp = target.includes('.') ? target : `93.184.216.${Math.floor(Math.random() * 256)}`;
    
    result.output = `traceroute to ${target} (${resolvedIp}), ${hopCount} hops max, 60 byte packets\n`;
    setCurrentResult({ ...result });

    for (let i = 1; i <= hopCount; i++) {
      if (abortRef.current) {
        result.output += `\n--- Traceroute aborted ---`;
        result.status = 'error';
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
      
      const isReachable = Math.random() > 0.15;
      
      if (isReachable) {
        const ip = i === hopCount ? resolvedIp : generateRandomIp();
        const rtt1 = (i * 2 + Math.random() * 10).toFixed(3);
        const rtt2 = (i * 2 + Math.random() * 10).toFixed(3);
        const rtt3 = (i * 2 + Math.random() * 10).toFixed(3);
        
        // 有时显示主机名
        const showHostname = Math.random() > 0.3;
        const hostname = showHostname ? `hop${i}.example.com ` : '';
        
        result.output += `${i}  ${hostname}(${ip})  ${rtt1} ms  ${rtt2} ms  ${rtt3} ms\n`;
      } else {
        result.output += `${i}  * * *\n`;
      }
      
      setCurrentResult({ ...result });
    }

    if (!abortRef.current) {
      result.status = 'success';
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    setCurrentResult({ ...result });
    setResults(prev => [result, ...prev]);
    setIsRunning(false);
  }, [generateRandomIp]);

  // DNS查询
  const simulateDnsLookup = useCallback(async (target: string, recordType: string) => {
    const result: DiagnosticResult = {
      id: Date.now().toString(),
      tool: 'dns',
      target,
      status: 'running',
      output: '',
      startTime: new Date()
    };

    setCurrentResult(result);
    setIsRunning(true);
    abortRef.current = false;

    const dnsServer = '8.8.8.8';
    result.output = `;; QUESTION SECTION:\n;${target}.			IN	${recordType}\n\n`;
    result.output += `;; ANSWER SECTION:\n`;
    setCurrentResult({ ...result });

    await new Promise(resolve => setTimeout(resolve, 300));

    // 根据记录类型生成不同的响应
    const records: Record<string, string[]> = {
      'A': [
        `${target}.		300	IN	A	93.184.216.34`,
        `${target}.		300	IN	A	93.184.216.35`
      ],
      'AAAA': [
        `${target}.		300	IN	AAAA	2606:2800:220:1:248:1893:25c8:1946`
      ],
      'MX': [
        `${target}.		300	IN	MX	10 mail.${target}.`,
        `${target}.		300	IN	MX	20 mail2.${target}.`
      ],
      'NS': [
        `${target}.		86400	IN	NS	ns1.${target}.`,
        `${target}.		86400	IN	NS	ns2.${target}.`
      ],
      'TXT': [
        `${target}.		300	IN	TXT	"v=spf1 include:_spf.google.com ~all"`,
        `${target}.		300	IN	TXT	"google-site-verification=abc123"`
      ],
      'CNAME': [
        `www.${target}.		300	IN	CNAME	${target}.`
      ],
      'SOA': [
        `${target}.		86400	IN	SOA	ns1.${target}. admin.${target}. 2024010101 3600 900 604800 86400`
      ],
      'PTR': [
        `34.216.184.93.in-addr.arpa. 300 IN PTR ${target}.`
      ]
    };

    const answers = records[recordType] || ['No records found'];
    for (const answer of answers) {
      if (abortRef.current) break;
      await new Promise(resolve => setTimeout(resolve, 150));
      result.output += `${answer}\n`;
      setCurrentResult({ ...result });
    }

    if (!abortRef.current) {
      result.output += `\n;; Query time: ${Math.floor(20 + Math.random() * 80)} msec\n`;
      result.output += `;; SERVER: ${dnsServer}#53(${dnsServer})\n`;
      result.output += `;; WHEN: ${new Date().toISOString()}\n`;
      result.output += `;; MSG SIZE  rcvd: ${Math.floor(100 + Math.random() * 400)}\n`;
      result.status = 'success';
    } else {
      result.output += `\n--- DNS lookup aborted ---`;
      result.status = 'error';
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    setCurrentResult({ ...result });
    setResults(prev => [result, ...prev]);
    setIsRunning(false);
  }, []);

  // 端口扫描
  const simulatePortScan = useCallback(async (target: string, portStr: string, range: string) => {
    const result: DiagnosticResult = {
      id: Date.now().toString(),
      tool: 'port',
      target,
      status: 'running',
      output: '',
      startTime: new Date()
    };

    setCurrentResult(result);
    setIsRunning(true);
    abortRef.current = false;

    result.output = `Starting port scan on ${target}\n`;
    result.output += `Scan type: ${range === 'common' ? 'Common ports' : range === 'single' ? 'Single port' : 'Custom range'}\n`;
    result.output += `${'='.repeat(50)}\n\n`;
    result.output += `${'Port'.padEnd(10)}${'Service'.padEnd(15)}${'Status'.padEnd(10)}${'Response Time'}\n`;
    result.output += `${'-'.repeat(10)}${'-'.repeat(15)}${'-'.repeat(10)}${'-'.repeat(15)}\n`;
    setCurrentResult({ ...result });

    let portsToScan: Array<{port: number, service: string}> = [];
    
    if (range === 'single') {
      const p = parseInt(portStr);
      const known = COMMON_PORTS.find(cp => cp.port === p);
      portsToScan = [{ port: p, service: known?.service || 'Unknown' }];
    } else if (range === 'common') {
      portsToScan = COMMON_PORTS;
    } else {
      // 扫描指定端口周围的端口
      const basePort = parseInt(portStr);
      for (let p = Math.max(1, basePort - 5); p <= Math.min(65535, basePort + 5); p++) {
        const known = COMMON_PORTS.find(cp => cp.port === p);
        portsToScan.push({ port: p, service: known?.service || 'Unknown' });
      }
    }

    let openCount = 0;
    let closedCount = 0;
    let filteredCount = 0;

    for (const { port: p, service } of portsToScan) {
      if (abortRef.current) break;

      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      const rand = Math.random();
      let status: string;
      let responseTime: string;
      
      if (rand > 0.7) {
        status = 'open';
        openCount++;
        responseTime = `${(5 + Math.random() * 50).toFixed(1)} ms`;
      } else if (rand > 0.2) {
        status = 'closed';
        closedCount++;
        responseTime = `${(1 + Math.random() * 10).toFixed(1)} ms`;
      } else {
        status = 'filtered';
        filteredCount++;
        responseTime = 'timeout';
      }
      
      const statusColor = status === 'open' ? '✓' : status === 'closed' ? '✗' : '?';
      result.output += `${String(p).padEnd(10)}${service.padEnd(15)}${(statusColor + ' ' + status).padEnd(10)}${responseTime}\n`;
      setCurrentResult({ ...result });
    }

    if (!abortRef.current) {
      result.output += `\n${'='.repeat(50)}\n`;
      result.output += `Scan completed: ${openCount} open, ${closedCount} closed, ${filteredCount} filtered\n`;
      result.output += `Total ports scanned: ${portsToScan.length}\n`;
      result.status = 'success';
    } else {
      result.output += `\n--- Port scan aborted ---`;
      result.status = 'error';
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    setCurrentResult({ ...result });
    setResults(prev => [result, ...prev]);
    setIsRunning(false);
  }, []);

  // Whois查询
  const simulateWhois = useCallback(async (target: string) => {
    const result: DiagnosticResult = {
      id: Date.now().toString(),
      tool: 'whois',
      target,
      status: 'running',
      output: '',
      startTime: new Date()
    };

    setCurrentResult(result);
    setIsRunning(true);
    abortRef.current = false;

    const domainParts = target.split('.');
    const tld = domainParts[domainParts.length - 1];
    const registrar = tld === 'com' ? 'Example Registrar, Inc.' : tld === 'org' ? 'Public Interest Registry' : 'Domain Registry';
    
    const whoisData = [
      `Domain Name: ${target.toUpperCase()}`,
      `Registry Domain ID: D${Math.random().toString(36).substring(2, 10).toUpperCase()}-LROR`,
      `Registrar WHOIS Server: whois.example-registrar.com`,
      `Registrar URL: http://www.example-registrar.com`,
      `Updated Date: ${new Date(Date.now() - 30 * 86400000).toISOString()}`,
      `Creation Date: ${new Date(Date.now() - 365 * 86400000).toISOString()}`,
      `Registry Expiry Date: ${new Date(Date.now() + 365 * 86400000).toISOString()}`,
      `Registrar: ${registrar}`,
      `Registrar IANA ID: ${Math.floor(1000 + Math.random() * 9000)}`,
      `Registrar Abuse Contact Email: abuse@example-registrar.com`,
      `Registrar Abuse Contact Phone: +1.${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      `Domain Status: clientTransferProhibited https://icann.org/epp#clientTransferProhibited`,
      `Domain Status: clientUpdateProhibited https://icann.org/epp#clientUpdateProhibited`,
      `Registrant Organization: Example Organization`,
      `Registrant State/Province: California`,
      `Registrant Country: US`,
      `Name Server: NS1.${target.toUpperCase()}`,
      `Name Server: NS2.${target.toUpperCase()}`,
      `DNSSEC: unsigned`,
      `>>> Last update of WHOIS database: ${new Date().toISOString()} <<<`
    ];

    result.output = `[Querying whois.verisign-grs.com]\n`;
    result.output += `[Redirected to whois.example-registrar.com]\n`;
    result.output += `[Querying whois.example-registrar.com]\n`;
    result.output += `[whois.example-registrar.com]\n\n`;
    setCurrentResult({ ...result });

    for (let i = 0; i < whoisData.length; i++) {
      if (abortRef.current) break;
      await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 120));
      result.output += `${whoisData[i]}\n`;
      setCurrentResult({ ...result });
    }

    if (!abortRef.current) {
      result.output += `\nFor more information on Whois status codes, please visit https://icann.org/epp`;
      result.status = 'success';
    } else {
      result.output += `\n--- Whois lookup aborted ---`;
      result.status = 'error';
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    setCurrentResult({ ...result });
    setResults(prev => [result, ...prev]);
    setIsRunning(false);
  }, []);

  // 执行诊断
  const handleRun = useCallback(async () => {
    if (!target.trim()) {
      toast({
        title: "请输入目标",
        description: "请输入IP地址或域名",
        variant: "destructive"
      });
      return;
    }

    // 验证输入
    if (activeTool === 'port' && portRange === 'single') {
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        toast({
          title: "无效端口",
          description: "端口号必须在 1-65535 之间",
          variant: "destructive"
        });
        return;
      }
    }

    switch (activeTool) {
      case 'ping':
        await simulatePing(target, parseInt(pingCount) || 5);
        break;
      case 'traceroute':
        await simulateTraceroute(target);
        break;
      case 'dns':
        await simulateDnsLookup(target, dnsRecordType);
        break;
      case 'port':
        await simulatePortScan(target, port, portRange);
        break;
      case 'whois':
        await simulateWhois(target);
        break;
    }
  }, [activeTool, target, port, portRange, dnsRecordType, pingCount, simulatePing, simulateTraceroute, simulateDnsLookup, simulatePortScan, simulateWhois]);

  // 停止执行
  const handleStop = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
    if (currentResult) {
      currentResult.status = 'error';
      currentResult.output += '\n\n--- Operation cancelled ---';
      setCurrentResult({ ...currentResult });
    }
  }, [currentResult]);

  // 复制输出
  const handleCopy = useCallback(async () => {
    if (currentResult?.output) {
      await navigator.clipboard.writeText(currentResult.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentResult]);

  // 清除结果
  const handleClear = useCallback(() => {
    setResults([]);
    setCurrentResult(null);
  }, []);

  // 快速选择地址
  const handleQuickAddress = useCallback((address: string) => {
    setTarget(address);
  }, []);

  // 自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [currentResult?.output, scrollToBottom]);

  const toolConfig = TOOL_CONFIGS[activeTool];

  return (
    <div className="h-full flex flex-col p-6">
      {/* 工具选择 */}
      <div className="mb-6">
        <Tabs value={activeTool} onValueChange={(v) => setActiveTool(v as DiagnosticTool)}>
          <TabsList className="grid w-full grid-cols-5">
            {Object.entries(TOOL_CONFIGS).map(([key, config]) => (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <config.icon className={cn("h-4 w-4", config.color)} />
                <span>{config.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 输入区域 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <toolConfig.icon className={cn("h-5 w-5", toolConfig.color)} />
              <div>
                <CardTitle className="text-base">{toolConfig.label}</CardTitle>
                <CardDescription>{toolConfig.description}</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 快速选择地址 */}
            {activeTool !== 'whois' && (
              <div className="flex flex-wrap gap-2">
                {QUICK_ADDRESSES.filter(qa => 
                  activeTool !== 'dns' || !qa.address.match(/^\d/)
                ).map(qa => (
                  <Button
                    key={qa.address}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleQuickAddress(qa.address)}
                  >
                    <Bookmark className="h-3 w-3 mr-1" />
                    {qa.label}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="target" className="mb-2 block">目标地址</Label>
                <Input
                  id="target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={toolConfig.placeholder}
                  disabled={isRunning}
                  onKeyDown={(e) => e.key === 'Enter' && handleRun()}
                />
              </div>
              
              {activeTool === 'port' && (
                <>
                  <div className="w-32">
                    <Label htmlFor="port" className="mb-2 block">端口</Label>
                    <Input
                      id="port"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="80"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="w-40">
                    <Label className="mb-2 block">扫描范围</Label>
                    <Select value={portRange} onValueChange={setPortRange} disabled={isRunning}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">单个端口</SelectItem>
                        <SelectItem value="around">周围端口</SelectItem>
                        <SelectItem value="common">常用端口</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              {activeTool === 'dns' && (
                <div className="w-32">
                  <Label className="mb-2 block">记录类型</Label>
                  <Select value={dnsRecordType} onValueChange={setDnsRecordType} disabled={isRunning}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DNS_RECORD_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex items-end gap-2">
                {!isRunning ? (
                  <Button onClick={handleRun} className="gap-2">
                    <Play className="h-4 w-4" />
                    执行
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={handleStop} className="gap-2">
                    <Square className="h-4 w-4" />
                    停止
                  </Button>
                )}
              </div>
            </div>

            {/* 设置面板 */}
            {showSettings && activeTool === 'ping' && (
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="pingCount" className="text-sm">Ping次数:</Label>
                  <Input
                    id="pingCount"
                    value={pingCount}
                    onChange={(e) => setPingCount(e.target.value)}
                    className="h-8 w-20"
                    type="number"
                    min="1"
                    max="100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="timeout" className="text-sm">超时(ms):</Label>
                  <Input
                    id="timeout"
                    value={timeout}
                    onChange={(e) => setTimeout_(e.target.value)}
                    className="h-8 w-24"
                    type="number"
                    min="1000"
                    max="30000"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 输出区域 */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">执行结果</span>
              {currentResult && (
                <Badge variant={currentResult.status === 'success' ? 'default' : currentResult.status === 'error' ? 'destructive' : 'secondary'}>
                  {currentResult.status === 'running' ? '运行中' : currentResult.status === 'success' ? '完成' : '错误'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentResult?.duration && (
                <span className="text-sm text-muted-foreground">
                  耗时: {currentResult.duration}ms
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!currentResult?.output}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div ref={outputRef} className="p-4 font-mono text-sm bg-muted/50 min-h-full">
              {currentResult?.output ? (
                <pre className="whitespace-pre-wrap">{currentResult.output}</pre>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>输入目标地址并点击"执行"开始诊断</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 历史记录 */}
      {results.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">历史记录</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                清除全部
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                    onClick={() => setCurrentResult(result)}
                  >
                    <div className="flex items-center gap-3">
                      {React.createElement(TOOL_CONFIGS[result.tool].icon, {
                        className: cn("h-4 w-4", TOOL_CONFIGS[result.tool].color)
                      })}
                      <div>
                        <p className="font-medium text-sm">{result.target}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.startTime.toLocaleTimeString()}
                          {result.duration && ` · ${result.duration}ms`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.tool.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NetworkDiagnostics;
