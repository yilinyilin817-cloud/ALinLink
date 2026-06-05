/**
 * HTTP测试工具
 * 提供API请求测试、响应分析功能
 */
import React, { useState, useCallback } from 'react';
import {
  Globe,
  Copy,
  Check,
  RefreshCw,
  Save,
  Trash2,
  Plus,
  Send,
  Download,
  Eye,
  EyeOff,
  Clock,
  Shield,
  Key,
  FileText,
  Code,
  X,
  Trash,
  Zap,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { toast } from '../ui/toast';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

interface HttpRequest {
  method: HttpMethod;
  url: string;
  params: Array<{ key: string; value: string; enabled: boolean }>;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  body: string;
  bodyType: 'none' | 'json' | 'form' | 'raw';
  auth: {
    type: 'none' | 'basic' | 'bearer' | 'api-key';
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
}

interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  time: number;
}

interface SavedRequest {
  id: string;
  name: string;
  request: HttpRequest;
  createdAt: Date;
}

interface QuickRequest {
  name: string;
  method: HttpMethod;
  url: string;
  description: string;
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-green-500',
  POST: 'text-blue-500',
  PUT: 'text-yellow-500',
  DELETE: 'text-red-500',
  PATCH: 'text-purple-500',
  HEAD: 'text-gray-500',
  OPTIONS: 'text-cyan-500'
};

const METHOD_BG_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-green-500/10',
  POST: 'bg-blue-500/10',
  PUT: 'bg-yellow-500/10',
  DELETE: 'bg-red-500/10',
  PATCH: 'bg-purple-500/10',
  HEAD: 'bg-gray-500/10',
  OPTIONS: 'bg-cyan-500/10'
};

const QUICK_REQUESTS: QuickRequest[] = [
  { name: '获取用户列表', method: 'GET', url: 'https://jsonplaceholder.typicode.com/users', description: '测试GET请求' },
  { name: '获取帖子', method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts', description: '获取所有帖子' },
  { name: '获取单条帖子', method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1', description: '获取ID为1的帖子' },
  { name: '创建帖子', method: 'POST', url: 'https://jsonplaceholder.typicode.com/posts', description: '测试POST请求' },
  { name: '更新帖子', method: 'PUT', url: 'https://jsonplaceholder.typicode.com/posts/1', description: '测试PUT请求' },
  { name: '删除帖子', method: 'DELETE', url: 'https://jsonplaceholder.typicode.com/posts/1', description: '测试DELETE请求' },
  { name: 'GitHub用户', method: 'GET', url: 'https://api.github.com/users/octocat', description: 'GitHub API测试' },
  { name: 'httpbin GET', method: 'GET', url: 'https://httpbin.org/get', description: 'httpbin测试服务' },
  { name: 'httpbin POST', method: 'POST', url: 'https://httpbin.org/post', description: 'httpbin POST测试' }
];

const STATUS_MESSAGES: Record<number, string> = {
  200: 'OK - 请求成功',
  201: 'Created - 资源创建成功',
  204: 'No Content - 成功但无内容',
  301: 'Moved Permanently - 永久重定向',
  302: 'Found - 临时重定向',
  304: 'Not Modified - 未修改',
  400: 'Bad Request - 请求错误',
  401: 'Unauthorized - 未授权',
  403: 'Forbidden - 禁止访问',
  404: 'Not Found - 资源未找到',
  405: 'Method Not Allowed - 方法不允许',
  408: 'Request Timeout - 请求超时',
  409: 'Conflict - 冲突',
  422: 'Unprocessable Entity - 无法处理',
  429: 'Too Many Requests - 请求过多',
  500: 'Internal Server Error - 服务器内部错误',
  502: 'Bad Gateway - 网关错误',
  503: 'Service Unavailable - 服务不可用',
  504: 'Gateway Timeout - 网关超时'
};

export const HttpTester: React.FC = () => {
  const [request, setRequest] = useState<HttpRequest>({
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/users',
    params: [],
    headers: [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'Accept', value: 'application/json', enabled: true },
      { key: 'User-Agent', value: 'ALinLink-HTTP-Tester/1.0', enabled: true }
    ],
    body: '',
    bodyType: 'none',
    auth: { type: 'none' }
  });
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth'>('headers');
  const [showPassword, setShowPassword] = useState(false);
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'raw'>('body');
  const [copied, setCopied] = useState(false);

  // 更新请求
  const updateRequest = useCallback(<K extends keyof HttpRequest>(field: K, value: HttpRequest[K]) => {
    setRequest(prev => ({ ...prev, [field]: value }));
  }, []);

  // 添加参数
  const addParam = useCallback(() => {
    setRequest(prev => ({
      ...prev,
      params: [...prev.params, { key: '', value: '', enabled: true }]
    }));
  }, []);

  // 更新参数
  const updateParam = useCallback((index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    setRequest(prev => ({
      ...prev,
      params: prev.params.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      )
    }));
  }, []);

  // 删除参数
  const removeParam = useCallback((index: number) => {
    setRequest(prev => ({
      ...prev,
      params: prev.params.filter((_, i) => i !== index)
    }));
  }, []);

  // 添加请求头
  const addHeader = useCallback(() => {
    setRequest(prev => ({
      ...prev,
      headers: [...prev.headers, { key: '', value: '', enabled: true }]
    }));
  }, []);

  // 更新请求头
  const updateHeader = useCallback((index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    setRequest(prev => ({
      ...prev,
      headers: prev.headers.map((header, i) =>
        i === index ? { ...header, [field]: value } : header
      )
    }));
  }, []);

  // 删除请求头
  const removeHeader = useCallback((index: number) => {
    setRequest(prev => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index)
    }));
  }, []);

  // 更新认证配置
  const updateAuth = useCallback((field: string, value: string) => {
    setRequest(prev => ({
      ...prev,
      auth: { ...prev.auth, [field]: value }
    }));
  }, []);

  // 发送请求
  const handleSendRequest = useCallback(async () => {
    if (!request.url.trim()) {
      toast.error("请输入URL");
      return;
    }

    // 验证URL格式
    let urlObj: URL;
    try {
      urlObj = new URL(request.url);
    } catch {
      toast.error("请输入完整的URL (如: https://api.example.com)", { title: "无效的URL" });
      return;
    }

    // 添加启用的查询参数到URL
    const enabledParams = request.params.filter(p => p.enabled && p.key.trim());
    if (enabledParams.length > 0) {
      enabledParams.forEach((param) => {
        urlObj.searchParams.append(param.key, param.value);
      });
    }

    setIsLoading(true);
    setResponse(null);
    setError(null);

    const startTime = performance.now();

    try {
      // 构建请求头
      const headers: Record<string, string> = {};
      request.headers
        .filter(h => h.enabled && h.key.trim())
        .forEach(h => {
          headers[h.key] = h.value;
        });

      // 添加认证头
      if (request.auth.type === 'basic' && request.auth.username) {
        const credentials = btoa(`${request.auth.username}:${request.auth.password || ''}`);
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (request.auth.type === 'bearer' && request.auth.token) {
        headers['Authorization'] = `Bearer ${request.auth.token}`;
      } else if (request.auth.type === 'api-key' && request.auth.apiKey) {
        const headerName = request.auth.apiKeyHeader || 'X-API-Key';
        headers[headerName] = request.auth.apiKey;
      }

      // 构建请求体
      let body: BodyInit | undefined = undefined;
      if (request.bodyType !== 'none' && request.body.trim()) {
        if (request.bodyType === 'json') {
          // 验证 JSON 格式
          try {
            JSON.parse(request.body);
            body = request.body;
            if (!headers['Content-Type']) {
              headers['Content-Type'] = 'application/json';
            }
          } catch {
            toast.error("请检查请求体是否为有效的JSON", { title: "JSON格式错误" });
            setIsLoading(false);
            return;
          }
        } else if (request.bodyType === 'form') {
          // 解析 form data: key=value&key2=value2
          const formData = new URLSearchParams();
          request.body.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) formData.append(decodeURIComponent(key), decodeURIComponent(value || ''));
          });
          body = formData.toString();
          if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
        } else {
          body = request.body;
        }
      }

      // 发送请求
      const fetchOptions: RequestInit = {
        method: request.method,
        headers,
      };
      if (body !== undefined && request.method !== 'GET' && request.method !== 'HEAD') {
        fetchOptions.body = body;
      }

      const fetchResponse = await fetch(urlObj.toString(), fetchOptions);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // 获取响应头
      const responseHeaders: Record<string, string> = {};
      fetchResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // 获取响应体
      const responseBody = await fetchResponse.text();
      const responseSize = new Blob([responseBody]).size;

      const statusText = STATUS_MESSAGES[fetchResponse.status] || fetchResponse.statusText || 'Unknown';

      const httpResponse: HttpResponse = {
        status: fetchResponse.status,
        statusText,
        headers: responseHeaders,
        body: responseBody,
        size: responseSize,
        time: responseTime
      };

      setResponse(httpResponse);

      if (fetchResponse.status >= 200 && fetchResponse.status < 300) {
        toast.success(`${fetchResponse.status} ${statusText} - ${responseTime}ms`);
      } else if (fetchResponse.status >= 400) {
        toast.error(`${fetchResponse.status} ${statusText} - ${responseTime}ms`, { title: "请求完成" });
      } else {
        toast.info(`${fetchResponse.status} ${statusText} - ${responseTime}ms`);
      }
    } catch (err: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      const errorMessage = err?.message || '请求失败';

      setError(errorMessage);

      toast.error(errorMessage, { title: "请求失败" });

      // 设置一个错误响应
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: JSON.stringify({
          error: errorMessage,
          hint: '可能是CORS跨域限制、网络问题或URL无法访问',
          type: err.name || 'Error'
        }, null, 2),
        size: 0,
        time: responseTime
      });
    } finally {
      setIsLoading(false);
    }
  }, [request]);

  // 保存请求
  const handleSaveRequest = useCallback(() => {
    if (!request.url.trim()) {
      toast.error("URL不能为空");
      return;
    }

    let displayPath = request.url;
    try {
      displayPath = new URL(request.url).pathname || request.url;
    } catch {
      // ignore
    }

    const newRequest: SavedRequest = {
      id: Date.now().toString(),
      name: `${request.method} ${displayPath}`,
      request: { ...request },
      createdAt: new Date()
    };

    setSavedRequests(prev => [newRequest, ...prev]);

    toast.success("请求已添加到收藏列表");
  }, [request]);

  // 加载保存的请求
  const handleLoadRequest = useCallback((saved: SavedRequest) => {
    setRequest(saved.request);
    setResponse(null);
    setError(null);
  }, []);

  // 加载快速请求
  const handleQuickRequest = useCallback((quick: QuickRequest) => {
    setRequest(prev => ({
      ...prev,
      method: quick.method,
      url: quick.url
    }));
    setResponse(null);
    setError(null);
  }, []);

  // 清除请求
  const handleClearRequest = useCallback(() => {
    setRequest({
      method: 'GET',
      url: '',
      params: [],
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'Accept', value: 'application/json', enabled: true }
      ],
      body: '',
      bodyType: 'none',
      auth: { type: 'none' }
    });
    setResponse(null);
    setError(null);
  }, []);

  // 删除保存的请求
  const handleDeleteSaved = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedRequests(prev => prev.filter(r => r.id !== id));
    toast.info("保存的请求已删除");
  }, []);

  // 复制响应
  const handleCopyResponse = useCallback(async () => {
    if (!response) return;

    try {
      await navigator.clipboard.writeText(response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("响应内容已复制");
    } catch {
      toast.error("无法访问剪贴板", { title: "复制失败" });
    }
  }, [response]);

  // 导出响应
  const handleExportResponse = useCallback(() => {
    if (!response) return;
    const data = JSON.stringify(response, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `http-response-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("响应已导出为JSON文件");
  }, [response]);

  // 格式化JSON
  const formatJson = useCallback((json: string) => {
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  }, []);

  // 格式化Body
  const formatBody = useCallback((body: string, contentType: string) => {
    if (contentType.includes('json')) {
      return formatJson(body);
    }
    if (contentType.includes('html') || contentType.includes('xml')) {
      return body; // 可以添加语法高亮
    }
    return body;
  }, [formatJson]);

  // 获取状态码颜色
  const getStatusColor = useCallback((status: number) => {
    if (status === 0) return 'text-red-500';
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 300 && status < 400) return 'text-yellow-500';
    if (status >= 400 && status < 500) return 'text-orange-500';
    if (status >= 500) return 'text-red-500';
    return 'text-gray-500';
  }, []);

  // 获取状态码背景颜色
  const getStatusBgColor = useCallback((status: number) => {
    if (status === 0) return 'bg-red-500/10';
    if (status >= 200 && status < 300) return 'bg-green-500/10';
    if (status >= 300 && status < 400) return 'bg-yellow-500/10';
    if (status >= 400 && status < 500) return 'bg-orange-500/10';
    if (status >= 500) return 'bg-red-500/10';
    return 'bg-gray-500/10';
  }, []);

  // 格式化字节
  const formatBytes = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, []);

  return (
    <div className="h-full flex flex-col p-6">
      {/* 快速请求 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">快速请求</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_REQUESTS.map((quick, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleQuickRequest(quick)}
            >
              <Badge variant="outline" className={cn("mr-1.5 text-[10px] px-1", METHOD_COLORS[quick.method])}>
                {quick.method}
              </Badge>
              {quick.name}
            </Button>
          ))}
        </div>
      </div>

      {/* URL输入栏 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Select value={request.method} onValueChange={(v) => updateRequest('method', v as HttpMethod)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map(method => (
                  <SelectItem key={method} value={method}>
                    <span className={METHOD_COLORS[method]}>{method}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={request.url}
              onChange={(e) => updateRequest('url', e.target.value)}
              placeholder="输入请求URL (如: https://api.example.com/users)"
              className="flex-1 font-mono"
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendRequest()}
            />
            <Button onClick={handleSendRequest} disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  发送
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleSaveRequest} title="保存请求">
              <Save className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleClearRequest} title="清空">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* 左侧面板 - 请求配置 */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'params' | 'headers' | 'body' | 'auth')} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="params" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                参数
              </TabsTrigger>
              <TabsTrigger value="headers" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                请求头
              </TabsTrigger>
              <TabsTrigger value="body" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                请求体
              </TabsTrigger>
              <TabsTrigger value="auth" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                认证
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden mt-4">
              {/* 参数 */}
              {activeTab === 'params' && (
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">查询参数</CardTitle>
                      <Button variant="outline" size="sm" onClick={addParam} className="h-8">
                        <Plus className="h-4 w-4 mr-2" />
                        添加参数
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="space-y-3">
                        {request.params.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Globe className="h-10 w-10 mb-2 opacity-50" />
                            <p className="text-sm">暂无查询参数</p>
                            <p className="text-xs mt-1">点击"添加参数"开始添加</p>
                          </div>
                        ) : (
                          request.params.map((param, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={param.enabled}
                                onChange={(e) => updateParam(index, 'enabled', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Input
                                value={param.key}
                                onChange={(e) => updateParam(index, 'key', e.target.value)}
                                placeholder="参数名"
                                className="flex-1 font-mono h-9"
                              />
                              <Input
                                value={param.value}
                                onChange={(e) => updateParam(index, 'value', e.target.value)}
                                placeholder="参数值"
                                className="flex-1 font-mono h-9"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeParam(index)}
                                className="h-9 w-9 p-0 text-destructive"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* 请求头 */}
              {activeTab === 'headers' && (
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">请求头</CardTitle>
                      <Button variant="outline" size="sm" onClick={addHeader} className="h-8">
                        <Plus className="h-4 w-4 mr-2" />
                        添加
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="space-y-3">
                        {request.headers.map((header, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={header.enabled}
                              onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Input
                              value={header.key}
                              onChange={(e) => updateHeader(index, 'key', e.target.value)}
                              placeholder="Header名称"
                              className="flex-1 font-mono h-9"
                            />
                            <Input
                              value={header.value}
                              onChange={(e) => updateHeader(index, 'value', e.target.value)}
                              placeholder="Header值"
                              className="flex-1 font-mono h-9"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeHeader(index)}
                              className="h-9 w-9 p-0 text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* 请求体 */}
              {activeTab === 'body' && (
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">请求体</CardTitle>
                      <Select value={request.bodyType} onValueChange={(v) => updateRequest('bodyType', v)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="form">Form</SelectItem>
                          <SelectItem value="raw">Raw</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    {request.bodyType !== 'none' ? (
                      <Textarea
                        value={request.body}
                        onChange={(e) => updateRequest('body', e.target.value)}
                        placeholder={request.bodyType === 'json' ? '{\n  "key": "value"\n}' : '输入请求体...'}
                        className="h-full font-mono resize-none"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>此请求没有请求体</p>
                          <p className="text-sm mt-1">选择请求体类型开始编辑</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 认证 */}
              {activeTab === 'auth' && (
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <CardTitle className="text-base">认证配置</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="space-y-4">
                        <div>
                          <Label>认证类型</Label>
                          <Select value={request.auth.type} onValueChange={(v) => updateAuth('type', v)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">无认证</SelectItem>
                              <SelectItem value="basic">Basic Auth</SelectItem>
                              <SelectItem value="bearer">Bearer Token</SelectItem>
                              <SelectItem value="api-key">API Key</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {request.auth.type === 'basic' && (
                          <>
                            <div>
                              <Label>用户名</Label>
                              <Input
                                value={request.auth.username || ''}
                                onChange={(e) => updateAuth('username', e.target.value)}
                                placeholder="用户名"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>密码</Label>
                              <div className="relative mt-1">
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  value={request.auth.password || ''}
                                  onChange={(e) => updateAuth('password', e.target.value)}
                                  placeholder="密码"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </>
                        )}

                        {request.auth.type === 'bearer' && (
                          <div>
                            <Label>Token</Label>
                            <Textarea
                              value={request.auth.token || ''}
                              onChange={(e) => updateAuth('token', e.target.value)}
                              placeholder="输入Bearer Token..."
                              className="font-mono mt-1"
                            />
                          </div>
                        )}

                        {request.auth.type === 'api-key' && (
                          <>
                            <div>
                              <Label>Header名称</Label>
                              <Input
                                value={request.auth.apiKeyHeader || ''}
                                onChange={(e) => updateAuth('apiKeyHeader', e.target.value)}
                                placeholder="X-API-Key"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>API Key</Label>
                              <Input
                                value={request.auth.apiKey || ''}
                                onChange={(e) => updateAuth('apiKey', e.target.value)}
                                placeholder="输入API Key..."
                                className="mt-1"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </Tabs>
        </div>

        {/* 右侧面板 - 响应 */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-base">响应</CardTitle>
                  {response && (
                    <>
                      <Badge variant="outline" className={cn(getStatusColor(response.status), getStatusBgColor(response.status))}>
                        {response.status} {response.statusText}
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {response.time}ms
                      </Badge>
                      <Badge variant="outline">
                        {formatBytes(response.size)}
                      </Badge>
                    </>
                  )}
                </div>
                {response && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyResponse}>
                      {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? '已复制' : '复制'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportResponse}>
                      <Download className="h-4 w-4 mr-2" />
                      导出
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              {response ? (
                <Tabs value={responseTab} onValueChange={(v) => setResponseTab(v as 'body' | 'headers' | 'raw')} className="h-full flex flex-col">
                  <div className="px-4 pt-2">
                    <TabsList>
                      <TabsTrigger value="body" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        响应体
                      </TabsTrigger>
                      <TabsTrigger value="headers" className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        响应头
                      </TabsTrigger>
                      <TabsTrigger value="raw" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        原始
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-hidden mt-2">
                    {/* 响应体 */}
                    {responseTab === 'body' && (
                      <ScrollArea className="h-full">
                        <pre className="p-4 font-mono text-sm bg-muted/50 min-h-full whitespace-pre-wrap">
                          {formatBody(response.body, response.headers['content-type'] || '')}
                        </pre>
                      </ScrollArea>
                    )}

                    {/* 响应头 */}
                    {responseTab === 'headers' && (
                      <ScrollArea className="h-full">
                        <div className="p-4 space-y-2">
                          {Object.keys(response.headers).length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">无响应头</p>
                            </div>
                          ) : (
                            Object.entries(response.headers).map(([key, value]) => (
                              <div key={key} className="flex items-start gap-4 p-2 rounded bg-muted/50">
                                <span className="font-mono text-sm font-medium text-blue-500 w-48 flex-shrink-0 break-all">
                                  {key}
                                </span>
                                <span className="font-mono text-sm break-all flex-1">{value}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    )}

                    {/* 原始响应 */}
                    {responseTab === 'raw' && (
                      <ScrollArea className="h-full">
                        <div className="p-4 font-mono text-xs space-y-2">
                          <div className="bg-muted/50 p-3 rounded">
                            <p className="text-muted-foreground">HTTP/{response.status >= 100 ? '1.1' : '?'} {response.status} {response.statusText}</p>
                          </div>
                          {Object.keys(response.headers).length > 0 && (
                            <div className="bg-muted/50 p-3 rounded">
                              {Object.entries(response.headers).map(([key, value]) => (
                                <p key={key}><span className="text-blue-500">{key}</span>: {value}</p>
                              ))}
                            </div>
                          )}
                          <div className="bg-muted/50 p-3 rounded">
                            <pre className="whitespace-pre-wrap break-all">{response.body || '(空响应体)'}</pre>
                          </div>
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </Tabs>
              ) : error ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center max-w-md">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                    <p className="text-base font-medium text-red-500">请求失败</p>
                    <p className="text-sm mt-2">{error}</p>
                    <p className="text-xs mt-3">提示: 可能是CORS跨域限制、网络问题或URL无法访问</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>发送请求以查看响应</p>
                    <p className="text-sm mt-1">输入URL并点击"发送"按钮</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 保存的请求 */}
          {savedRequests.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">保存的请求 ({savedRequests.length})</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSavedRequests([]);
                    toast.info("所有保存的请求已清除");
                  }}>
                    清除全部
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {savedRequests.map((saved) => (
                      <div
                        key={saved.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted cursor-pointer group"
                        onClick={() => handleLoadRequest(saved)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge variant="outline" className={cn(METHOD_COLORS[saved.request.method], METHOD_BG_COLORS[saved.request.method])}>
                            {saved.request.method}
                          </Badge>
                          <span className="text-sm font-mono truncate">{saved.request.url}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {saved.createdAt.toLocaleTimeString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteSaved(saved.id, e)}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default HttpTester;
