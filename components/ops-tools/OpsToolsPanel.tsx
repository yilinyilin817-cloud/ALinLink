/**
 * IT运维调试工具面板
 * 提供网络诊断、系统管理、数据库客户端、HTTP测试等运维工具
 */
import React, { useState, useCallback } from 'react';
import {
  Network,
  Database,
  Globe,
  Server,
  Activity,
  Terminal,
  Wifi,
  Search,
  ArrowLeft,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { NetworkDiagnostics } from './NetworkDiagnostics';
import { SystemManager } from './SystemManager';
import { DatabaseClient } from './DatabaseClient';
import { HttpTester } from './HttpTester';

interface OpsToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  hostLabel?: string;
  embedded?: boolean;
}

type ToolCategory = 'network' | 'system' | 'database' | 'http';

const OPS_TOOLS = [
  {
    id: 'network' as ToolCategory,
    label: '网络诊断',
    icon: Network,
    description: 'Ping、Traceroute、DNS查询、端口检测、Whois',
    color: 'text-blue-500'
  },
  {
    id: 'system' as ToolCategory,
    label: '系统管理',
    icon: Server,
    description: '进程管理、服务管理、日志查看、系统信息',
    color: 'text-green-500'
  },
  {
    id: 'database' as ToolCategory,
    label: '数据库客户端',
    icon: Database,
    description: 'MySQL、PostgreSQL、Redis连接和查询',
    color: 'text-purple-500'
  },
  {
    id: 'http' as ToolCategory,
    label: 'HTTP测试',
    icon: Globe,
    description: 'API请求测试、WebSocket测试、响应分析',
    color: 'text-orange-500'
  }
];

export const OpsToolsPanel: React.FC<OpsToolsPanelProps> = ({
  isOpen,
  onClose,
  sessionId,
  hostLabel,
  embedded = false
}) => {
  const [activeTab, setActiveTab] = useState<ToolCategory>('network');

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">IT运维调试工具</h2>
            {hostLabel && (
              <p className="text-sm text-muted-foreground">目标主机: {hostLabel}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ToolCategory)} className="h-full flex flex-col">
            {/* Tool Categories */}
            <div className="px-6 pt-4 pb-2">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50">
                {OPS_TOOLS.map((tool) => (
                  <TabsTrigger
                    key={tool.id}
                    value={tool.id}
                    className={cn(
                      "flex items-center gap-2 py-3 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm",
                      "transition-all duration-200"
                    )}
                  >
                    <tool.icon className={cn("h-4 w-4", tool.color)} />
                    <span className="font-medium">{tool.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tool Content */}
            <div className="flex-1 overflow-hidden">
              <TabsContent value="network" className="h-full m-0 p-0">
                <NetworkDiagnostics sessionId={sessionId} />
              </TabsContent>
              
              <TabsContent value="system" className="h-full m-0 p-0">
                <SystemManager sessionId={sessionId} />
              </TabsContent>
              
              <TabsContent value="database" className="h-full m-0 p-0">
                <DatabaseClient />
              </TabsContent>
              
              <TabsContent value="http" className="h-full m-0 p-0">
                <HttpTester />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>运维工具集 v1.0</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              关闭
            </Button>
          </div>
        </div>
      </>
    );

  if (embedded) {
    return (
      <div className="h-full flex flex-col bg-background">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-6xl mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {content}
      </div>
    </div>
  );
};

export default OpsToolsPanel;
