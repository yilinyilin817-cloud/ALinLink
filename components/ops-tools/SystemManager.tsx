/**
 * 系统管理工具
 * 提供进程管理、服务管理、日志查看、系统信息功能
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Activity,
  RefreshCw,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Play,
  Square,
  Pause,
  Trash2,
  Eye,
  Download,
  Settings,
  Terminal,
  FileText,
  Server,
  Monitor,
  Wifi,
  Clock,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
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
import { Progress } from '../ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface SystemManagerProps {
  sessionId?: string;
}

type SystemTool = 'processes' | 'services' | 'logs' | 'info';

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
  user: string;
  startTime: string;
  command: string;
}

interface ServiceInfo {
  name: string;
  status: 'active' | 'inactive' | 'failed' | 'unknown';
  description: string;
  pid?: number;
  memory?: number;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
}

interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  arch: string;
  uptime: string;
  loadAvg: number[];
  cpuCores: number;
  cpuModel: string;
  cpuUsage: number;
  totalMemory: number;
  usedMemory: number;
  totalSwap: number;
  usedSwap: number;
  diskUsage: Array<{
    mount: string;
    total: number;
    used: number;
    available: number;
    percent: number;
  }>;
  networkInterfaces: Array<{
    name: string;
    ip: string;
    mac: string;
    rxBytes: number;
    txBytes: number;
  }>;
}

const TOOL_CONFIGS = {
  processes: {
    label: '进程管理',
    icon: Cpu,
    description: '查看和管理系统进程',
    color: 'text-blue-500'
  },
  services: {
    label: '服务管理',
    icon: Server,
    description: '管理系统服务',
    color: 'text-green-500'
  },
  logs: {
    label: '日志查看',
    icon: FileText,
    description: '查看系统日志',
    color: 'text-purple-500'
  },
  info: {
    label: '系统信息',
    icon: Monitor,
    description: '查看系统详细信息',
    color: 'text-orange-500'
  }
};

export const SystemManager: React.FC<SystemManagerProps> = ({ sessionId }) => {
  const [activeTool, setActiveTool] = useState<SystemTool>('processes');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemCpuUsage, setSystemCpuUsage] = useState<number>(0);
  const [sortField, setSortField] = useState<string>('cpu');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // 模拟进程数据
  const generateMockProcesses = useCallback((cpuCores: number) => {
    const processNames = [
      'node', 'python3', 'nginx', 'mysql', 'redis-server', 'java', 'docker',
      'sshd', 'systemd', 'bash', 'zsh', 'vim', 'chrome', 'firefox', 'code'
    ];

    // 系统总CPU使用率（0-100%）
    const systemCpuUsage = Math.random() * 80 + 10; // 10% - 90%

    const processes: ProcessInfo[] = [];
    // 系统进程（systemd等）通常占一定CPU
    const systemProcesses = ['systemd', 'sshd'];
    for (let i = 0; i < 50; i++) {
      const name = processNames[Math.floor(Math.random() * processNames.length)];
      // 单个进程CPU使用率：系统进程0-2%，其他进程根据名称分配
      let cpu = 0;
      if (systemProcesses.includes(name)) {
        cpu = Math.random() * 2;
      } else if (['python3', 'mysql', 'nginx', 'java'].includes(name)) {
        // 服务型进程 0-15%
        cpu = Math.random() * 15;
      } else {
        // 普通进程 0-8%
        cpu = Math.random() * 8;
      }
      processes.push({
        pid: 1000 + i,
        name,
        cpu: parseFloat(cpu.toFixed(1)),
        memory: Math.random() * 1024,
        status: Math.random() > 0.1 ? 'running' : Math.random() > 0.5 ? 'sleeping' : 'stopped',
        user: Math.random() > 0.3 ? 'root' : 'www-data',
        startTime: new Date(Date.now() - Math.random() * 86400000).toLocaleString(),
        command: `/usr/bin/${name}`
      });
    }
    return { processes, systemCpuUsage };
  }, []);

  // 模拟服务数据
  const generateMockServices = useCallback(() => {
    const serviceList: Array<{name: string, description: string}> = [
      { name: 'nginx', description: '高性能 HTTP 和反向代理服务器' },
      { name: 'mysql', description: 'MySQL 数据库服务' },
      { name: 'redis', description: '内存数据结构存储' },
      { name: 'sshd', description: 'OpenSSH 守护进程' },
      { name: 'docker', description: 'Docker 容器引擎' },
      { name: 'cron', description: '定时任务调度服务' },
      { name: 'rsyslog', description: '系统日志服务' },
      { name: 'systemd-resolved', description: '系统 DNS 解析服务' },
      { name: 'networkd-dispatcher', description: '网络配置变更分发器' },
      { name: 'polkit', description: '权限管理服务' },
      { name: 'accounts-daemon', description: '用户账户管理' },
      { name: 'firewalld', description: '防火墙管理服务' },
      { name: 'postfix', description: '邮件传输代理' }
    ];

    return serviceList.map((svc) => ({
      name: svc.name,
      status: Math.random() > 0.2 ? 'active' : Math.random() > 0.5 ? 'inactive' : 'failed' as const,
      description: svc.description,
      pid: Math.random() > 0.3 ? Math.floor(Math.random() * 10000) : undefined,
      memory: Math.random() > 0.3 ? Math.floor(Math.random() * 1024) : undefined
    }));
  }, []);

  // 模拟日志数据
  const generateMockLogs = useCallback(() => {
    const levels: Array<'info' | 'warn' | 'error' | 'debug'> = ['info', 'warn', 'error', 'debug'];
    const sources = ['systemd', 'sshd', 'nginx', 'mysql', '内核', 'cron', '网络', '认证'];
    const messages = [
      '已接受来自 192.168.1.100 的连接',
      '用户身份验证成功',
      '服务启动成功',
      '磁盘使用率超过 80%',
      '内存使用率过高: 92%',
      '网络接口 eth0 已启用',
      '进程已退出，退出码: 0',
      '配置文件已重新加载',
      '备份任务执行成功',
      '无法连接到数据库服务器',
      '用户 admin 从 10.0.0.50 登录系统',
      '防火墙已更新规则: 允许 443 端口',
      'Docker 容器 nginx-proxy 已重启',
      'SSL 证书将在 7 天后过期',
      '检测到异常登录尝试,已记录',
      '系统时区已更新为 Asia/Shanghai',
      'Nginx 配置文件语法检查通过',
      'MySQL 慢查询日志: 查询耗时 5.2s',
      'Redis 已完成 AOF 重写',
      '计划任务 daily-backup 执行完成',
      '用户 www-data 的密码已更新',
      '内核参数 net.core.somaxconn 已调整',
      '检测到磁盘 I/O 等待过高',
      '应用服务 app-server 健康检查通过',
      'SSH 登录失败次数过多，已临时封禁 IP',
      '系统日志轮转完成',
      'Nginx 访问日志: GET /api/v1/users 200',
      'PHP-FPM 子进程数量已调整至 20',
      '文件 /var/log/messages 已归档',
      '时区同步成功，当前时间已校准'
    ];

    const logs: LogEntry[] = [];
    for (let i = 0; i < 100; i++) {
      logs.push({
        timestamp: new Date(Date.now() - Math.random() * 86400000).toLocaleString('zh-CN'),
        level: levels[Math.floor(Math.random() * levels.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        message: messages[Math.floor(Math.random() * messages.length)]
      });
    }
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, []);

  // 模拟系统信息
  const generateMockSystemInfo = useCallback((): SystemInfo => {
    return {
      hostname: 'prod-server-01',
      os: 'Ubuntu 22.04.3 LTS',
      kernel: '5.15.0-91-generic',
      arch: 'x86_64',
      uptime: '45 days, 12:34:56',
      loadAvg: [1.23, 1.45, 1.67],
      cpuCores: 8,
      cpuModel: 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
      cpuUsage: parseFloat((Math.random() * 60 + 10).toFixed(1)),
      totalMemory: 16384,
      usedMemory: 12288,
      totalSwap: 4096,
      usedSwap: 512,
      diskUsage: [
        { mount: '/', total: 500, used: 350, available: 150, percent: 70 },
        { mount: '/home', total: 1000, used: 600, available: 400, percent: 60 },
        { mount: '/var', total: 200, used: 180, available: 20, percent: 90 }
      ],
      networkInterfaces: [
        { name: 'eth0', ip: '192.168.1.100', mac: '00:11:22:33:44:55', rxBytes: 1234567890, txBytes: 9876543210 },
        { name: 'eth1', ip: '10.0.0.100', mac: '00:11:22:33:44:66', rxBytes: 987654321, txBytes: 123456789 }
      ]
    };
  }, []);

  // 真实获取本机系统信息
  const fetchRealSystemInfo = useCallback(async (): Promise<SystemInfo | null> => {
    try {
      // 检查是否在 Electron 环境中
      const win = window as any;
      if (!win.netcatty?.getSystemInfo) {
        return null;
      }
      const info = await win.netcatty.getSystemInfo();
      if (!info) return null;

      // 平台名称映射
      const osNameMap: Record<string, string> = {
        'win32': info.osVersion || 'Windows',
        'darwin': 'macOS',
        'linux': 'Linux'
      };

      return {
        hostname: info.hostname || 'unknown',
        os: osNameMap[info.platform || ''] || info.osType || 'Unknown',
        kernel: info.kernel || info.osRelease || 'Unknown',
        arch: info.arch || 'Unknown',
        uptime: info.uptime || 'Unknown',
        loadAvg: info.loadAvg || [0, 0, 0],
        cpuCores: info.cpuCores || 0,
        cpuModel: info.cpuModel || 'Unknown',
        cpuUsage: info.cpuUsage || 0,
        totalMemory: info.totalMemory || 0,
        usedMemory: info.usedMemory || 0,
        totalSwap: 0,
        usedSwap: 0,
        diskUsage: [],
        networkInterfaces: (info.networkInterfaces || []).map((n: any) => ({
          name: n.name,
          ip: n.ip,
          mac: n.mac,
          rxBytes: 0,
          txBytes: 0
        }))
      };
    } catch (err) {
      console.error('Failed to fetch real system info:', err);
      return null;
    }
  }, []);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    switch (activeTool) {
      case 'processes': {
        const cores = systemInfo?.cpuCores || 8;
        const { processes: mockProcs, systemCpuUsage: cpuUsage } = generateMockProcesses(cores);
        setProcesses(mockProcs);
        setSystemCpuUsage(cpuUsage);
        break;
      }
      case 'services':
        setServices(generateMockServices());
        break;
      case 'logs':
        setLogs(generateMockLogs());
        break;
      case 'info': {
        // 优先使用真实系统信息（如果是本地主机）
        const realInfo = await fetchRealSystemInfo();
        if (realInfo && !sessionId) {
          setSystemInfo(realInfo);
        } else {
          setSystemInfo(generateMockSystemInfo());
        }
        break;
      }
    }

    setIsLoading(false);
  }, [activeTool, sessionId, systemInfo, generateMockProcesses, generateMockServices, generateMockLogs, generateMockSystemInfo, fetchRealSystemInfo]);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [activeTool, loadData]);

  // 过滤进程
  const filteredProcesses = processes.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 排序进程
  const sortedProcesses = [...filteredProcesses].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    switch (sortField) {
      case 'pid':
        aVal = a.pid;
        bVal = b.pid;
        break;
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'cpu':
        aVal = a.cpu;
        bVal = b.cpu;
        break;
      case 'memory':
        aVal = a.memory;
        bVal = b.memory;
        break;
      default:
        aVal = a.cpu;
        bVal = b.cpu;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  // 过滤服务
  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 过滤日志
  const filteredLogs = logs.filter(l =>
    l.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 格式化字节
  const formatBytes = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }, []);

  // 格式化MB
  const formatMB = useCallback((mb: number) => {
    if (mb < 1024) return `${mb} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  }, []);

  // 获取状态颜色
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'running':
      case 'active':
        return 'text-green-500';
      case 'sleeping':
      case 'inactive':
        return 'text-yellow-500';
      case 'stopped':
      case 'failed':
        return 'text-red-500';
      case 'zombie':
      case 'unknown':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  }, []);

  // 获取状态图标
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'running':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sleeping':
      case 'inactive':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'stopped':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'zombie':
      case 'unknown':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  }, []);

  // 切换排序
  const toggleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }, [sortField]);

  const toolConfig = TOOL_CONFIGS[activeTool];

  return (
    <div className="h-full flex flex-col p-6">
      {/* 工具选择 */}
      <div className="mb-6">
        <Tabs value={activeTool} onValueChange={(v) => setActiveTool(v as SystemTool)}>
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(TOOL_CONFIGS).map(([key, config]) => (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <config.icon className={cn("h-4 w-4", config.color)} />
                <span>{config.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 搜索和过滤 */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`搜索${toolConfig.label}...`}
              className="pl-10"
            />
          </div>
        </div>
        <Button variant="outline" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          刷新
        </Button>
      </div>

      {/* 工具内容 */}
      <div className="flex-1 overflow-hidden">
        {/* 进程管理 */}
        {activeTool === 'processes' && (
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">进程列表</CardTitle>
                  <CardDescription>共 {sortedProcesses.length} 个进程</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(systemCpuUsage > 80 && "border-red-500 text-red-500")}>
                    CPU: {systemCpuUsage.toFixed(1)}%
                  </Badge>
                  <Badge variant="outline">
                    内存: {formatMB(processes.reduce((sum, p) => sum + p.memory, 0))}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 cursor-pointer" onClick={() => toggleSort('pid')}>
                        <div className="flex items-center gap-1">
                          PID
                          {sortField === 'pid' && (sortDir === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                        <div className="flex items-center gap-1">
                          名称
                          {sortField === 'name' && (sortDir === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                        </div>
                      </TableHead>
                      <TableHead className="w-24 cursor-pointer" onClick={() => toggleSort('cpu')}>
                        <div className="flex items-center gap-1">
                          CPU
                          {sortField === 'cpu' && (sortDir === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                        </div>
                      </TableHead>
                      <TableHead className="w-24 cursor-pointer" onClick={() => toggleSort('memory')}>
                        <div className="flex items-center gap-1">
                          内存
                          {sortField === 'memory' && (sortDir === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                        </div>
                      </TableHead>
                      <TableHead className="w-20">状态</TableHead>
                      <TableHead className="w-24">用户</TableHead>
                      <TableHead className="w-32">启动时间</TableHead>
                      <TableHead className="w-20">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProcesses.map((process) => (
                      <TableRow key={process.pid}>
                        <TableCell className="font-mono">{process.pid}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{process.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={process.cpu} className="h-2 w-16" />
                            <span className="text-sm">{process.cpu.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatMB(process.memory)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(process.status)}
                            <span className={cn("text-sm", getStatusColor(process.status))}>
                              {process.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{process.user}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{process.startTime}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* 服务管理 */}
        {activeTool === 'services' && (
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">服务列表</CardTitle>
                  <CardDescription>共 {filteredServices.length} 个服务</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    活跃: {services.filter(s => s.status === 'active').length}
                  </Badge>
                  <Badge variant="destructive">
                    失败: {services.filter(s => s.status === 'failed').length}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {filteredServices.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(service.status)}
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {service.pid && (
                          <Badge variant="outline" className="font-mono">
                            PID: {service.pid}
                          </Badge>
                        )}
                        {service.memory && (
                          <Badge variant="outline">
                            内存: {formatMB(service.memory)}
                          </Badge>
                        )}
                        <Badge
                          variant={service.status === 'active' ? 'default' : service.status === 'failed' ? 'destructive' : 'secondary'}
                          className={cn(
                            service.status === 'active' && 'bg-green-500'
                          )}
                        >
                          {service.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {service.status === 'active' ? (
                            <>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Pause className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* 日志查看 */}
        {activeTool === 'logs' && (
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">系统日志</CardTitle>
                  <CardDescription>共 {filteredLogs.length} 条日志</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-blue-500">
                    Info: {logs.filter(l => l.level === 'info').length}
                  </Badge>
                  <Badge variant="outline" className="text-yellow-500">
                    Warn: {logs.filter(l => l.level === 'warn').length}
                  </Badge>
                  <Badge variant="destructive">
                    Error: {logs.filter(l => l.level === 'error').length}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-1 font-mono text-sm">
                  {filteredLogs.map((log, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-4 p-2 rounded",
                        log.level === 'error' && 'bg-red-500/10',
                        log.level === 'warn' && 'bg-yellow-500/10',
                        log.level === 'info' && 'bg-blue-500/10',
                        log.level === 'debug' && 'bg-gray-500/10'
                      )}
                    >
                      <span className="text-muted-foreground w-40 flex-shrink-0">{log.timestamp}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-16 flex-shrink-0 justify-center",
                          log.level === 'error' && 'border-red-500 text-red-500',
                          log.level === 'warn' && 'border-yellow-500 text-yellow-500',
                          log.level === 'info' && 'border-blue-500 text-blue-500',
                          log.level === 'debug' && 'border-gray-500 text-gray-500'
                        )}
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-muted-foreground w-24 flex-shrink-0">[{log.source}]</span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* 系统信息 */}
        {activeTool === 'info' && systemInfo && (
          <div className="h-full overflow-auto">
            <div className="grid grid-cols-2 gap-6">
              {/* 基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    系统基本信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">主机名</Label>
                      <p className="font-medium">{systemInfo.hostname}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">操作系统</Label>
                      <p className="font-medium">{systemInfo.os}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">内核版本</Label>
                      <p className="font-medium text-sm">{systemInfo.kernel}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">架构</Label>
                      <p className="font-medium">{systemInfo.arch}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">运行时间</Label>
                      <p className="font-medium">{systemInfo.uptime}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">系统时间</Label>
                      <p className="font-medium font-mono text-sm">
                        {new Date().toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CPU信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    CPU信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">处理器型号</Label>
                      <p className="font-medium text-sm mt-1">{systemInfo.cpuModel}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>CPU核心数</Label>
                        <span className="font-medium">{systemInfo.cpuCores} 核</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>当前CPU使用率</Label>
                        <span className={cn(
                          "font-medium",
                          systemInfo.cpuUsage > 80 && "text-red-500",
                          systemInfo.cpuUsage > 60 && systemInfo.cpuUsage <= 80 && "text-yellow-500",
                          systemInfo.cpuUsage <= 60 && "text-green-500"
                        )}>
                          {systemInfo.cpuUsage}%
                        </span>
                      </div>
                      <Progress
                        value={systemInfo.cpuUsage}
                        className={cn(
                          "h-2",
                          systemInfo.cpuUsage > 80 && "[&>div]:bg-red-500",
                          systemInfo.cpuUsage > 60 && systemInfo.cpuUsage <= 80 && "[&>div]:bg-yellow-500",
                          systemInfo.cpuUsage <= 60 && "[&>div]:bg-green-500"
                        )}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>平均负载 (1/5/15分钟)</Label>
                        <span className="font-medium">{systemInfo.loadAvg.join(' / ')}</span>
                      </div>
                      <Progress
                        value={Math.min((systemInfo.loadAvg[0] / systemInfo.cpuCores) * 100, 100)}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        当前负载 / CPU核心数 = {(systemInfo.loadAvg[0] / systemInfo.cpuCores).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 内存信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MemoryStick className="h-4 w-4" />
                    内存信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>物理内存</Label>
                        <span className="font-medium">
                          {formatMB(systemInfo.usedMemory)} / {formatMB(systemInfo.totalMemory)}
                          {systemInfo.totalMemory > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({((systemInfo.usedMemory / systemInfo.totalMemory) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <Progress
                        value={systemInfo.totalMemory > 0 ? (systemInfo.usedMemory / systemInfo.totalMemory) * 100 : 0}
                        className={cn(
                          "h-2",
                          systemInfo.totalMemory > 0 && (systemInfo.usedMemory / systemInfo.totalMemory) > 0.9 && "[&>div]:bg-red-500",
                          systemInfo.totalMemory > 0 && (systemInfo.usedMemory / systemInfo.totalMemory) > 0.75 && (systemInfo.usedMemory / systemInfo.totalMemory) <= 0.9 && "[&>div]:bg-yellow-500"
                        )}
                      />
                    </div>
                    {systemInfo.totalSwap > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>交换空间</Label>
                          <span className="font-medium">
                            {formatMB(systemInfo.usedSwap)} / {formatMB(systemInfo.totalSwap)}
                          </span>
                        </div>
                        <Progress value={(systemInfo.usedSwap / systemInfo.totalSwap) * 100} className="h-2" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 磁盘信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    磁盘信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {systemInfo.diskUsage.length > 0 ? (
                    <div className="space-y-4">
                      {systemInfo.diskUsage.map((disk, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-2">
                            <Label>{disk.mount}</Label>
                            <span className="font-medium">
                              {disk.used}GB / {disk.total}GB ({disk.percent}%)
                            </span>
                          </div>
                          <Progress
                            value={disk.percent}
                            className={cn("h-2", disk.percent > 90 && "[&>div]:bg-red-500")}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <HardDrive className="h-10 w-10 mb-2 opacity-50" />
                      <p className="text-sm">本机磁盘信息需通过 SSH 远程获取</p>
                      <p className="text-xs mt-1">请连接目标主机后查看磁盘使用情况</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 网络信息 */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    网络接口
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {systemInfo.networkInterfaces.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>接口</TableHead>
                          <TableHead>IP地址</TableHead>
                          <TableHead>MAC地址</TableHead>
                          <TableHead>接收</TableHead>
                          <TableHead>发送</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemInfo.networkInterfaces.map((iface) => (
                          <TableRow key={iface.name}>
                            <TableCell className="font-medium">{iface.name}</TableCell>
                            <TableCell className="font-mono">{iface.ip}</TableCell>
                            <TableCell className="font-mono">{iface.mac}</TableCell>
                            <TableCell>{iface.rxBytes > 0 ? formatBytes(iface.rxBytes) : '-'}</TableCell>
                            <TableCell>{iface.txBytes > 0 ? formatBytes(iface.txBytes) : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Network className="h-10 w-10 mb-2 opacity-50" />
                      <p className="text-sm">暂无网络接口信息</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemManager;
