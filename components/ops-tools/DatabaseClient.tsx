/**
 * 数据库客户端工具
 * 提供MySQL、PostgreSQL、Redis连接和查询功能
 */
import React, { useState, useCallback } from 'react';
import {
  Database,
  Play,
  Square,
  Copy,
  Check,
  RefreshCw,
  Save,
  Trash2,
  Plus,
  Settings,
  Table,
  Key,
  Terminal,
  Server,
  User,
  Lock,
  Globe,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Download,
  Upload,
  Eye,
  Edit,
  Trash,
  MoreHorizontal,
  Bookmark,
  Star,
  Folder
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
import { Textarea } from '../ui/textarea';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from '../ui/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type DatabaseType = 'mysql' | 'postgresql' | 'redis';

interface ConnectionConfig {
  type: DatabaseType;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

interface QueryResult {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  rowCount: number;
  executionTime: number;
}

interface SavedQuery {
  id: string;
  name: string;
  query: string;
  database: DatabaseType;
  createdAt: Date;
}

const DB_CONFIGS = {
  mysql: {
    label: 'MySQL',
    icon: Database,
    defaultPort: 3306,
    color: 'text-blue-500',
    description: 'MySQL数据库连接'
  },
  postgresql: {
    label: 'PostgreSQL',
    icon: Database,
    defaultPort: 5432,
    color: 'text-purple-500',
    description: 'PostgreSQL数据库连接'
  },
  redis: {
    label: 'Redis',
    icon: Database,
    defaultPort: 6379,
    color: 'text-red-500',
    description: 'Redis数据库连接'
  }
};

interface SqlShortcut {
  id: string;
  name: string;
  category: string;
  query: string;
  icon: React.ReactNode;
  description?: string;
}

const SQL_SHORTCUTS: SqlShortcut[] = [
  // 基础查询
  {
    id: 'select-all',
    name: '查询全部',
    category: '基础查询',
    query: 'SELECT * FROM {table_name} LIMIT 100;',
    icon: <Table className="h-3.5 w-3.5" />,
    description: '查询表中所有数据'
  },
  {
    id: 'select-count',
    name: '统计行数',
    category: '基础查询',
    query: 'SELECT COUNT(*) AS total FROM {table_name};',
    icon: <Filter className="h-3.5 w-3.5" />,
    description: '统计表中记录数'
  },
  {
    id: 'select-columns',
    name: '查看列信息',
    category: '基础查询',
    query: 'DESCRIBE {table_name};',
    icon: <Info className="h-3.5 w-3.5" />,
    description: '查看表结构'
  },
  {
    id: 'select-distinct',
    name: '去重查询',
    category: '基础查询',
    query: 'SELECT DISTINCT {column_name} FROM {table_name};',
    icon: <Filter className="h-3.5 w-3.5" />,
    description: '查询不重复的值'
  },
  // 条件查询
  {
    id: 'where-equal',
    name: '条件查询',
    category: '条件查询',
    query: 'SELECT * FROM {table_name} WHERE {column} = \'{value}\' LIMIT 100;',
    icon: <Search className="h-3.5 w-3.5" />,
    description: '按条件查询数据'
  },
  {
    id: 'where-like',
    name: '模糊查询',
    category: '条件查询',
    query: 'SELECT * FROM {table_name} WHERE {column} LIKE \'%{keyword}%\' LIMIT 100;',
    icon: <Search className="h-3.5 w-3.5" />,
    description: '按关键词模糊查询'
  },
  {
    id: 'where-between',
    name: '范围查询',
    category: '条件查询',
    query: 'SELECT * FROM {table_name} WHERE {column} BETWEEN \'{start}\' AND \'{end}\' LIMIT 100;',
    icon: <Filter className="h-3.5 w-3.5" />,
    description: '按范围查询数据'
  },
  {
    id: 'where-in',
    name: 'IN查询',
    category: '条件查询',
    query: 'SELECT * FROM {table_name} WHERE {column} IN (\'{value1}\', \'{value2}\') LIMIT 100;',
    icon: <Search className="h-3.5 w-3.5" />,
    description: '查询多个值'
  },
  // 排序和分组
  {
    id: 'order-by',
    name: '排序查询',
    category: '排序分组',
    query: 'SELECT * FROM {table_name} ORDER BY {column} DESC LIMIT 100;',
    icon: <SortDesc className="h-3.5 w-3.5" />,
    description: '按列排序'
  },
  {
    id: 'group-by',
    name: '分组统计',
    category: '排序分组',
    query: 'SELECT {column}, COUNT(*) AS count FROM {table_name} GROUP BY {column} ORDER BY count DESC;',
    icon: <Filter className="h-3.5 w-3.5" />,
    description: '按列分组统计'
  },
  {
    id: 'having',
    name: '分组过滤',
    category: '排序分组',
    query: 'SELECT {column}, COUNT(*) AS count FROM {table_name} GROUP BY {column} HAVING count > 1 ORDER BY count DESC;',
    icon: <Filter className="h-3.5 w-3.5" />,
    description: '过滤分组结果'
  },
  // 聚合函数
  {
    id: 'aggregate-sum',
    name: '求和',
    category: '聚合函数',
    query: 'SELECT SUM({column}) AS total FROM {table_name};',
    icon: <Plus className="h-3.5 w-3.5" />,
    description: '计算列的总和'
  },
  {
    id: 'aggregate-avg',
    name: '平均值',
    category: '聚合函数',
    query: 'SELECT AVG({column}) AS average FROM {table_name};',
    icon: <Filter className="h-3.5 w-3.5" />,
    description: '计算列的平均值'
  },
  {
    id: 'aggregate-max',
    name: '最大值',
    category: '聚合函数',
    query: 'SELECT MAX({column}) AS max_value FROM {table_name};',
    icon: <SortDesc className="h-3.5 w-3.5" />,
    description: '获取列的最大值'
  },
  {
    id: 'aggregate-min',
    name: '最小值',
    category: '聚合函数',
    query: 'SELECT MIN({column}) AS min_value FROM {table_name};',
    icon: <SortAsc className="h-3.5 w-3.5" />,
    description: '获取列的最小值'
  },
  // 数据操作
  {
    id: 'insert',
    name: '插入数据',
    category: '数据操作',
    query: 'INSERT INTO {table_name} ({columns}) VALUES ({values});',
    icon: <Plus className="h-3.5 w-3.5" />,
    description: '插入新记录'
  },
  {
    id: 'update',
    name: '更新数据',
    category: '数据操作',
    query: 'UPDATE {table_name} SET {column} = \'{new_value}\' WHERE {condition};',
    icon: <Edit className="h-3.5 w-3.5" />,
    description: '更新记录'
  },
  {
    id: 'delete',
    name: '删除数据',
    category: '数据操作',
    query: 'DELETE FROM {table_name} WHERE {condition};',
    icon: <Trash className="h-3.5 w-3.5" />,
    description: '删除记录'
  },
  // 表操作
  {
    id: 'create-table',
    name: '创建表',
    category: '表操作',
    query: `CREATE TABLE {table_name} (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
    icon: <Plus className="h-3.5 w-3.5" />,
    description: '创建新表'
  },
  {
    id: 'drop-table',
    name: '删除表',
    category: '表操作',
    query: 'DROP TABLE IF EXISTS {table_name};',
    icon: <Trash className="h-3.5 w-3.5" />,
    description: '删除表'
  },
  {
    id: 'alter-table',
    name: '添加列',
    category: '表操作',
    query: 'ALTER TABLE {table_name} ADD COLUMN {column_name} {data_type};',
    icon: <Plus className="h-3.5 w-3.5" />,
    description: '向表中添加新列'
  },
  // 索引操作
  {
    id: 'create-index',
    name: '创建索引',
    category: '索引操作',
    query: 'CREATE INDEX idx_{column} ON {table_name} ({column});',
    icon: <Key className="h-3.5 w-3.5" />,
    description: '创建索引'
  },
  {
    id: 'show-indexes',
    name: '查看索引',
    category: '索引操作',
    query: 'SHOW INDEX FROM {table_name};',
    icon: <Key className="h-3.5 w-3.5" />,
    description: '查看表的索引'
  },
  // 系统信息
  {
    id: 'show-tables',
    name: '查看所有表',
    category: '系统信息',
    query: 'SHOW TABLES;',
    icon: <Table className="h-3.5 w-3.5" />,
    description: '列出所有表'
  },
  {
    id: 'show-databases',
    name: '查看数据库',
    category: '系统信息',
    query: 'SHOW DATABASES;',
    icon: <Database className="h-3.5 w-3.5" />,
    description: '列出所有数据库'
  },
  {
    id: 'show-processlist',
    name: '查看进程',
    category: '系统信息',
    query: 'SHOW PROCESSLIST;',
    icon: <Server className="h-3.5 w-3.5" />,
    description: '查看当前连接'
  }
];

const SHORTCUT_CATEGORIES = [...new Set(SQL_SHORTCUTS.map(s => s.category))];

export const DatabaseClient: React.FC = () => {
  const [activeDb, setActiveDb] = useState<DatabaseType>('mysql');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '',
    database: ''
  });
  const [query, setQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [queryHistory, setQueryHistory] = useState<Array<{ query: string; time: Date; success: boolean }>>([]);
  const [showShortcuts, setShowShortcuts] = useState(true);
  const [selectedShortcutCategory, setSelectedShortcutCategory] = useState<string>('基础查询');
  const [shortcutSearch, setShortcutSearch] = useState('');

  // 应用SQL快捷指令
  const applyShortcut = useCallback((shortcut: SqlShortcut) => {
    let processedQuery = shortcut.query;
    // 如果已选择表，自动替换表名
    if (selectedTable) {
      processedQuery = processedQuery.replace(/\{table_name\}/g, selectedTable);
    }
    setQuery(processedQuery);
  }, [selectedTable]);

  // 过滤快捷指令
  const filteredShortcuts = SQL_SHORTCUTS.filter(s => {
    const matchCategory = selectedShortcutCategory === '全部' || s.category === selectedShortcutCategory;
    const matchSearch = !shortcutSearch || 
      s.name.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
      s.description?.toLowerCase().includes(shortcutSearch.toLowerCase());
    return matchCategory && matchSearch;
  });

  // 更新连接配置
  const updateConfig = useCallback((field: keyof ConnectionConfig, value: string | number) => {
    setConnectionConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  // 切换数据库类型
  const handleDbChange = useCallback((db: DatabaseType) => {
    setActiveDb(db);
    setConnectionConfig(prev => ({
      ...prev,
      type: db,
      port: DB_CONFIGS[db].defaultPort
    }));
    setIsConnected(false);
    setQueryResult(null);
    setTables([]);
    setSelectedTable(null);
  }, []);

  // 连接数据库
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    
    // 模拟连接延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 模拟成功连接
    setIsConnected(true);
    setIsConnecting(false);
    
    // 模拟获取表列表
    const mockTables = ['users', 'orders', 'products', 'categories', 'logs', 'settings'];
    setTables(mockTables);
    
    toast({
      title: "连接成功",
      description: `已连接到 ${connectionConfig.host}:${connectionConfig.port}`
    });
  }, [connectionConfig]);

  // 断开连接
  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setTables([]);
    setSelectedTable(null);
    setQueryResult(null);
    
    toast({
      title: "已断开连接",
      description: "数据库连接已关闭"
    });
  }, []);

  // 执行查询
  const handleExecuteQuery = useCallback(async () => {
    if (!query.trim()) {
      toast({
        title: "请输入查询语句",
        variant: "destructive"
      });
      return;
    }

    setIsExecuting(true);
    
    // 模拟查询执行
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 模拟查询结果
    const mockResult: QueryResult = {
      columns: ['id', 'name', 'email', 'created_at', 'status'],
      rows: [
        [1, '张三', 'zhangsan@example.com', '2024-01-15 10:30:00', 'active'],
        [2, '李四', 'lisi@example.com', '2024-01-16 11:45:00', 'active'],
        [3, '王五', 'wangwu@example.com', '2024-01-17 09:15:00', 'inactive'],
        [4, '赵六', 'zhaoliu@example.com', '2024-01-18 14:20:00', 'active'],
        [5, '钱七', 'qianqi@example.com', '2024-01-19 16:30:00', 'pending']
      ],
      rowCount: 5,
      executionTime: 23
    };

    setQueryResult(mockResult);
    setIsExecuting(false);
    
    // 添加到历史记录
    setQueryHistory(prev => [{
      query,
      time: new Date(),
      success: true
    }, ...prev.slice(0, 49)]);

    toast({
      title: "查询执行成功",
      description: `返回 ${mockResult.rowCount} 行，耗时 ${mockResult.executionTime}ms`
    });
  }, [query]);

  // 保存查询
  const handleSaveQuery = useCallback(() => {
    if (!query.trim()) return;

    const newQuery: SavedQuery = {
      id: Date.now().toString(),
      name: `查询 ${savedQueries.length + 1}`,
      query,
      database: activeDb,
      createdAt: new Date()
    };

    setSavedQueries(prev => [newQuery, ...prev]);
    
    toast({
      title: "查询已保存",
      description: "查询已添加到收藏列表"
    });
  }, [query, activeDb, savedQueries]);

  // 加载保存的查询
  const handleLoadQuery = useCallback((savedQuery: SavedQuery) => {
    setQuery(savedQuery.query);
  }, []);

  // 清除查询
  const handleClearQuery = useCallback(() => {
    setQuery('');
    setQueryResult(null);
  }, []);

  // 复制查询结果
  const handleCopyResult = useCallback(async () => {
    if (!queryResult) return;
    
    const text = [
      queryResult.columns.join('\t'),
      ...queryResult.rows.map(row => row.join('\t'))
    ].join('\n');
    
    await navigator.clipboard.writeText(text);
    
    toast({
      title: "已复制到剪贴板",
      description: "查询结果已复制"
    });
  }, [queryResult]);

  // 查看表结构
  const handleViewTable = useCallback((tableName: string) => {
    setSelectedTable(tableName);
    setQuery(`SELECT * FROM ${tableName} LIMIT 100;`);
  }, []);

  const dbConfig = DB_CONFIGS[activeDb];

  return (
    <div className="h-full flex flex-col p-6">
      {/* 数据库选择 */}
      <div className="mb-6">
        <Tabs value={activeDb} onValueChange={(v) => handleDbChange(v as DatabaseType)}>
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(DB_CONFIGS).map(([key, config]) => (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <config.icon className={cn("h-4 w-4", config.color)} />
                <span>{config.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* 左侧面板 - 连接和表列表 */}
        <div className="w-80 flex flex-col gap-4">
          {/* 连接配置 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <dbConfig.icon className={cn("h-4 w-4", dbConfig.color)} />
                  连接配置
                </CardTitle>
                {isConnected && (
                  <Badge variant="default" className="bg-green-500">
                    已连接
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="host">主机地址</Label>
                <Input
                  id="host"
                  value={connectionConfig.host}
                  onChange={(e) => updateConfig('host', e.target.value)}
                  placeholder="localhost"
                  disabled={isConnected}
                />
              </div>
              <div>
                <Label htmlFor="port">端口</Label>
                <Input
                  id="port"
                  type="number"
                  value={connectionConfig.port}
                  onChange={(e) => updateConfig('port', parseInt(e.target.value))}
                  placeholder={dbConfig.defaultPort.toString()}
                  disabled={isConnected}
                />
              </div>
              <div>
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  value={connectionConfig.username}
                  onChange={(e) => updateConfig('username', e.target.value)}
                  placeholder="root"
                  disabled={isConnected}
                />
              </div>
              <div>
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={connectionConfig.password}
                  onChange={(e) => updateConfig('password', e.target.value)}
                  placeholder="••••••••"
                  disabled={isConnected}
                />
              </div>
              <div>
                <Label htmlFor="database">数据库</Label>
                <Input
                  id="database"
                  value={connectionConfig.database}
                  onChange={(e) => updateConfig('database', e.target.value)}
                  placeholder="数据库名称"
                  disabled={isConnected}
                />
              </div>
              <div className="flex gap-2">
                {!isConnected ? (
                  <Button onClick={handleConnect} disabled={isConnecting} className="flex-1">
                    {isConnecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        连接中...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        连接
                      </>
                    )}
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={handleDisconnect} className="flex-1">
                    <Square className="h-4 w-4 mr-2" />
                    断开
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 表列表 */}
          {isConnected && (
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  数据表
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-1">
                    {tables.map((table) => (
                      <div
                        key={table}
                        className={cn(
                          "flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent",
                          selectedTable === table && "bg-accent"
                        )}
                        onClick={() => handleViewTable(table)}
                      >
                        <div className="flex items-center gap-2">
                          <Table className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{table}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧面板 - 查询和结果 */}
        <div className="flex-1 flex flex-col gap-4">
          {/* SQL快捷指令 */}
          {isConnected && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    SQL快捷指令
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Input
                      value={shortcutSearch}
                      onChange={(e) => setShortcutSearch(e.target.value)}
                      placeholder="搜索指令..."
                      className="h-8 w-40 text-sm"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => setShowShortcuts(!showShortcuts)}
                    >
                      {showShortcuts ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {showShortcuts && (
                <CardContent className="pt-0">
                  {/* 分类标签 */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge
                      variant={selectedShortcutCategory === '全部' ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/90"
                      onClick={() => setSelectedShortcutCategory('全部')}
                    >
                      全部
                    </Badge>
                    {SHORTCUT_CATEGORIES.map(category => (
                      <Badge
                        key={category}
                        variant={selectedShortcutCategory === category ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary/90"
                        onClick={() => setSelectedShortcutCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                  {/* 快捷指令列表 */}
                  <ScrollArea className="h-[140px]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {filteredShortcuts.map(shortcut => (
                        <Tooltip key={shortcut.id}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-auto py-2 px-3 flex flex-col items-start gap-1 text-left"
                              onClick={() => applyShortcut(shortcut)}
                            >
                              <div className="flex items-center gap-1.5 w-full">
                                {shortcut.icon}
                                <span className="text-xs font-medium truncate">{shortcut.name}</span>
                              </div>
                              {shortcut.description && (
                                <span className="text-[10px] text-muted-foreground line-clamp-2">
                                  {shortcut.description}
                                </span>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="text-xs">{shortcut.query}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </ScrollArea>
                  {selectedTable && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Bookmark className="h-3 w-3" />
                      <span>当前表: <span className="font-medium text-foreground">{selectedTable}</span></span>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* 查询编辑器 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  SQL查询
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSaveQuery} disabled={!query.trim()}>
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClearQuery}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    清除
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`输入${dbConfig.label}查询语句...`}
                className="font-mono text-sm min-h-[120px]"
                disabled={!isConnected}
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  {queryResult && (
                    <Badge variant="outline">
                      {queryResult.rowCount} 行
                    </Badge>
                  )}
                  {queryResult?.executionTime && (
                    <Badge variant="outline">
                      {queryResult.executionTime}ms
                    </Badge>
                  )}
                </div>
                <Button onClick={handleExecuteQuery} disabled={!isConnected || isExecuting || !query.trim()}>
                  {isExecuting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      执行中...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      执行查询
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 查询结果 */}
          {queryResult && (
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    查询结果
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyResult}>
                      <Copy className="h-4 w-4 mr-2" />
                      复制
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      导出
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <UITable>
                    <TableHeader>
                      <TableRow>
                        {queryResult.columns.map((column, index) => (
                          <TableHead key={index} className="font-medium">
                            {column}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queryResult.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="font-mono text-sm">
                              {cell === null ? <span className="text-muted-foreground italic">NULL</span> : String(cell)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </UITable>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* 保存的查询和历史 */}
          {!queryResult && (
            <div className="flex-1 flex gap-4">
              {/* 保存的查询 */}
              <Card className="flex-1 flex flex-col">
                <CardHeader className="pb-3 flex-shrink-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    保存的查询
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-2">
                      {savedQueries.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <Save className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>暂无保存的查询</p>
                        </div>
                      ) : (
                        savedQueries.map((saved) => (
                          <div
                            key={saved.id}
                            className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer"
                            onClick={() => handleLoadQuery(saved)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{saved.name}</span>
                              <Badge variant="outline" className={DB_CONFIGS[saved.database].color}>
                                {DB_CONFIGS[saved.database].label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground font-mono truncate">
                              {saved.query}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* 查询历史 */}
              <Card className="flex-1 flex flex-col">
                <CardHeader className="pb-3 flex-shrink-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    查询历史
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-2">
                      {queryHistory.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>暂无查询历史</p>
                        </div>
                      ) : (
                        queryHistory.map((history, index) => (
                          <div
                            key={index}
                            className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer"
                            onClick={() => setQuery(history.query)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {history.success ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {history.time.toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm font-mono truncate">
                              {history.query}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseClient;
