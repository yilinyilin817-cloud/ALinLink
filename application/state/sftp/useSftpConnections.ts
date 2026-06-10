/**
 * SFTP连接管理Hook
 * 负责管理SFTP连接的建立、断开、文件列表获取等核心功能
 * 支持本地文件系统和远程SFTP服务器的连接管理
 */
import React, { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { ALinLinkBridge } from "../../../infrastructure/services/ALinLinkBridge";
import type { Host, Identity, SftpConnection, SftpFileEntry, SftpFilenameEncoding, SSHKey } from "../../../domain/models";
import type { SftpPane } from "./types";
import { useSftpDirectoryListing } from "./useSftpDirectoryListing";
import { useSftpHostCredentials } from "./useSftpHostCredentials";
import { buildCacheKey, getSharedRemoteHostCache, setSharedRemoteHostCache } from "./sharedRemoteHostCache";

/**
 * SFTP连接Hook的参数接口
 */
interface UseSftpConnectionsParams {
  hosts: Host[];
  keys: SSHKey[];
  identities: Identity[];
  terminalSettings?: { keepaliveInterval: number; keepaliveCountMax: number };
  leftTabsRef: MutableRefObject<{ tabs: SftpPane[]; activeTabId: string | null }>;
  rightTabsRef: MutableRefObject<{ tabs: SftpPane[]; activeTabId: string | null }>;
  leftTabs: { tabs: SftpPane[] };
  rightTabs: { tabs: SftpPane[] };
  leftPane: SftpPane;
  rightPane: SftpPane;
  setLeftTabs: React.Dispatch<React.SetStateAction<{ tabs: SftpPane[]; activeTabId: string | null }>>;
  setRightTabs: React.Dispatch<React.SetStateAction<{ tabs: SftpPane[]; activeTabId: string | null }>>;
  getActivePane: (side: "left" | "right") => SftpPane | null;
  updateTab: (side: "left" | "right", tabId: string, updater: (prev: SftpPane) => SftpPane) => void;
  navSeqRef: MutableRefObject<{ left: number; right: number }>;
  dirCacheRef: MutableRefObject<Map<string, { files: SftpFileEntry[]; timestamp: number }>>;
  sftpSessionsRef: MutableRefObject<Map<string, string>>;
  lastConnectedHostRef: MutableRefObject<{ left: Host | "local" | null; right: Host | "local" | null }>;
  connectionCacheKeyMapRef: MutableRefObject<Map<string, string>>;
  reconnectingRef: MutableRefObject<{ left: boolean; right: boolean }>;
  makeCacheKey: (connectionId: string, path: string, encoding?: SftpFilenameEncoding) => string;
  clearCacheForConnection: (connectionId: string) => void;
  createEmptyPane: (id?: string, showHiddenFiles?: boolean) => SftpPane;
  autoConnectLocalOnMount?: boolean;
}

/**
 * SFTP连接Hook的返回结果接口
 */
interface UseSftpConnectionsResult {
  /**
   * 建立SFTP连接
   * @param side - 面板位置（左侧或右侧）
   * @param host - 主机对象或"local"表示本地文件系统
   * @param options - 连接选项
   * @param options.forceNewTab - 是否强制在新标签页打开
   * @param options.onTabCreated - 标签页创建后的回调函数
   */
  connect: (side: "left" | "right", host: Host | "local", options?: { forceNewTab?: boolean; onTabCreated?: (tabId: string) => void }) => Promise<void>;
  /**
   * 断开SFTP连接
   * @param side - 面板位置（左侧或右侧）
   */
  disconnect: (side: "left" | "right") => Promise<void>;
  /**
   * 获取本地文件列表
   * @param path - 文件路径
   * @returns 文件条目数组
   */
  listLocalFiles: (path: string) => Promise<SftpFileEntry[]>;
  /**
   * 获取远程SFTP文件列表
   * @param sftpId - SFTP会话ID
   * @param path - 文件路径
   * @param encoding - 文件名编码
   * @returns 文件条目数组
   */
  listRemoteFiles: (sftpId: string, path: string, encoding?: SftpFilenameEncoding) => Promise<SftpFileEntry[]>;
}

/**
 * SFTP连接管理Hook
 * 提供SFTP连接的建立、断开、文件列表获取等功能
 * @param params - 连接参数
 * @returns 连接操作函数
 */
export const useSftpConnections = ({
  hosts,
  keys,
  identities,
  terminalSettings,
  leftTabsRef,
  rightTabsRef,
  leftTabs,
  rightTabs: _rightTabs,
  leftPane,
  rightPane,
  setLeftTabs,
  setRightTabs,
  getActivePane,
  updateTab,
  navSeqRef,
  dirCacheRef,
  sftpSessionsRef,
  lastConnectedHostRef,
  connectionCacheKeyMapRef,
  reconnectingRef,
  makeCacheKey,
  clearCacheForConnection,
  createEmptyPane,
  autoConnectLocalOnMount = true,
}: UseSftpConnectionsParams): UseSftpConnectionsResult => {
  const getHostCredentials = useSftpHostCredentials({ hosts, keys, identities, terminalSettings });
  const { listLocalFiles, listRemoteFiles } = useSftpDirectoryListing();

  /**
     * 建立SFTP连接的核心函数
     * 支持本地文件系统和远程SFTP服务器连接
     * @param side - 面板位置
     * @param host - 主机对象或"local"
     * @param options - 连接选项
     */
    const connect = useCallback(
    async (side: "left" | "right", host: Host | "local", options?: { forceNewTab?: boolean; onTabCreated?: (tabId: string) => void }) => {
      const setTabs = side === "left" ? setLeftTabs : setRightTabs;

      let activeTabId: string | null = null;
      const sideTabs = side === "left" ? leftTabsRef.current : rightTabsRef.current;

      // 如果当前没有活动标签页或强制新建标签页，则创建新的面板
      if (!sideTabs.activeTabId || options?.forceNewTab) {
        const newPane = createEmptyPane();
        activeTabId = newPane.id;
        setTabs((prev) => ({
          tabs: [...prev.tabs, newPane],
          activeTabId: newPane.id,
        }));
      } else {
        activeTabId = sideTabs.activeTabId;
      }

      if (!activeTabId) return;

      const isReconnectAttempt = reconnectingRef.current[side];

      // 在异步操作之前同步通知调用者标签页ID
      // 这允许调用者立即将元数据（如连接密钥）映射到标签页
      // 避免与延迟效果的竞争条件
      options?.onTabCreated?.(activeTabId);

      const connectionId = `${side}-${Date.now()}`;

      navSeqRef.current[side] += 1;
      const connectRequestId = navSeqRef.current[side];

      lastConnectedHostRef.current[side] = host;
      // 存储此连接的缓存键，以便面板操作可以通过connectionId查找
      // 而不是依赖每个面板的lastConnectedHostRef
      if (host !== "local") {
        connectionCacheKeyMapRef.current.set(
          connectionId,
          buildCacheKey(host.id, host.hostname, host.port, host.protocol, host.sftpSudo, host.username),
        );
      }

      const currentPane = getActivePane(side);
      // 连接到新主机时，将编码重置为主机配置的编码或"auto"
      // 这确保正确的自动检测工作并遵守主机级编码设置
      const filenameEncoding: SftpFilenameEncoding =
        host === "local" ? "auto" : (host.sftpEncoding ?? "auto");

      // 当forceNewTab设置时，我们保留旧标签页以便即时切换
      // 不要关闭其SFTP会话或清除其缓存
      if (!options?.forceNewTab) {
        if (currentPane?.connection) {
          clearCacheForConnection(currentPane.connection.id);
        }
        if (currentPane?.connection && !currentPane.connection.isLocal) {
          const oldSftpId = sftpSessionsRef.current.get(currentPane.connection.id);
          if (oldSftpId) {
            // 在异步closeSftp调用之前删除映射，以防止
            // 并发代码使用后端可能在await期间已删除的过期sftpId
            sftpSessionsRef.current.delete(currentPane.connection.id);
            try {
              await ALinLinkBridge.get()?.closeSftp(oldSftpId);
            } catch {
              // 关闭过期SFTP会话时忽略错误
            }
          }
        }
      }

      /**
       * 连接到本地文件系统
       */
      if (host === "local") {
        // 获取用户主目录，如果无法获取则使用默认路径
        let homeDir = await ALinLinkBridge.get()?.getHomeDir?.();
        if (!homeDir) {
          const isWindows = navigator.platform.toLowerCase().includes("win");
          homeDir = isWindows ? "C:\\Users\\damao" : "/Users/damao";
        }

        // 创建本地连接对象
        const connection: SftpConnection = {
          id: connectionId,
          hostId: "local",
          hostLabel: "Local",
          isLocal: true,
          status: "connected",
          currentPath: homeDir,
          homeDir,
        };

        // 更新标签页状态为连接中
        updateTab(side, activeTabId, (prev) => ({
          ...prev,
          connection,
          loading: true,
          reconnecting: false,
          error: null,
          connectionLogs: [],
          filenameEncoding, // 为新连接重置编码
        }));

        // 获取本地文件列表
        try {
          const files = await listLocalFiles(homeDir);
          // 检查是否是最新的连接请求，防止处理过期请求
          if (navSeqRef.current[side] !== connectRequestId) return;
          // 缓存文件列表
          dirCacheRef.current.set(makeCacheKey(connectionId, homeDir, filenameEncoding), {
            files,
            timestamp: Date.now(),
          });
          reconnectingRef.current[side] = false;
          // 更新标签页状态为连接成功
          updateTab(side, activeTabId, (prev) => ({
            ...prev,
            files,
            loading: false,
            reconnecting: false,
          }));
        } catch (err) {
          if (navSeqRef.current[side] !== connectRequestId) return;
          reconnectingRef.current[side] = false;
          // 更新标签页状态为连接失败
          updateTab(side, activeTabId, (prev) => ({
            ...prev,
            error: err instanceof Error ? err.message : "Failed to list directory",
            loading: false,
            reconnecting: false,
          }));
        }
      /**
       * 连接到远程SFTP服务器
       */
      } else {
        // 构建主机缓存键，用于共享缓存查找
        const hostCacheKey = buildCacheKey(host.id, host.hostname, host.port, host.protocol, host.sftpSudo, host.username);
        const sharedHostCacheCandidate = getSharedRemoteHostCache(hostCacheKey);
        // 只有当编码匹配时才使用共享缓存
        const sharedHostCache =
          sharedHostCacheCandidate?.filenameEncoding === filenameEncoding
            ? sharedHostCacheCandidate
            : null;
        const cachedStartPath = sharedHostCache?.path ?? "/";

        // 创建远程连接对象
        const connection: SftpConnection = {
          id: connectionId,
          hostId: host.id,
          hostLabel: host.label,
          isLocal: false,
          status: "connecting",
          currentPath: cachedStartPath,
        };

        // 更新标签页状态为连接中
        updateTab(side, activeTabId, (prev) => ({
          ...prev,
          connection,
          // 连接时始终显示加载状态 — 即使有缓存文件
          // 缓存的文件列表显示为预览，但面板在SFTP会话实际建立之前保持非交互状态
          loading: true,
          reconnecting: prev.reconnecting,
          error: null,
          connectionLogs: [],
          files: prev.reconnecting ? prev.files : (sharedHostCache?.files ?? []),
          filenameEncoding, // 为新连接重置编码
        }));

        // 订阅SFTP连接进度事件用于认证日志
        const sftpSessionId = `sftp-${connectionId}`;
        let unsubSftpProgress: (() => void) | undefined;
        const bridge = ALinLinkBridge.get();
        if (bridge?.onSftpConnectionProgress) {
          unsubSftpProgress = bridge.onSftpConnectionProgress((sid, label, status, detail) => {
            if (sid !== sftpSessionId) return;
            let logLine: string;
            switch (status) {
              case 'connecting':
                logLine = `Connecting to ${label}...`;
                break;
              case 'authenticating':
                logLine = `${label} - Key exchange complete`;
                break;
              case 'auth-attempt':
                if (detail?.endsWith('rejected')) {
                  logLine = `${label} - ✗ ${detail}`;
                } else if (detail === 'all methods exhausted') {
                  logLine = `${label} - ✗ All authentication methods exhausted`;
                } else if (detail === 'waiting for user input...' || detail === 'user responded') {
                  logLine = `${label} - ${detail}`;
                } else {
                  logLine = `${label} - Trying ${detail}...`;
                }
                break;
              case 'connected':
                logLine = `${label} - Connected`;
                break;
              case 'error':
                logLine = `${label} - Error${detail ? `: ${detail}` : ''}`;
                break;
              default:
                logLine = `${label} - ${status}${detail ? `: ${detail}` : ''}`;
            }
            // 只有当这仍然是活动请求时才更新（避免过期日志泄露）
            if (navSeqRef.current[side] !== connectRequestId) return;
            updateTab(side, activeTabId, (prev) => ({
              ...prev,
              connectionLogs: [...prev.connectionLogs, logLine],
            }));
          });
        }

        try {
          // 获取主机凭据
          const credentials = getHostCredentials(host);
          const openSftp = bridge?.openSftp;
          if (!openSftp) throw new Error("SFTP bridge unavailable");

          // 判断是否为认证错误
          const isAuthError = (err: unknown): boolean => {
            if (!(err instanceof Error)) return false;
            const msg = err.message.toLowerCase();
            return (
              msg.includes("authentication") ||
              msg.includes("auth") ||
              msg.includes("password") ||
              msg.includes("permission denied")
            );
          };

          // 检查是否有密钥和密码
          const hasKey = !!credentials.privateKey || !!credentials.identityFilePaths?.length;
          const hasPassword = !!credentials.password;

          /**
           * 尝试建立SFTP连接
           * 优先使用密钥认证，如果失败且有密码则回退到密码认证
           */
          let sftpId: string | undefined;
          if (hasKey) {
            try {
              const keyFirstCredentials = {
                sessionId: `sftp-${connectionId}`,
                ...credentials,
              };
              // 如果不是sudo模式，不需要密码
              if (!credentials.sudo) {
                keyFirstCredentials.password = undefined;
              }
              sftpId = await openSftp(keyFirstCredentials);
            } catch (err) {
              // 如果是认证错误且有密码，尝试密码认证
              if (hasPassword && isAuthError(err)) {
                sftpId = await openSftp({
                  sessionId: `sftp-${connectionId}`,
                  ...credentials,
                  privateKey: undefined,
                  certificate: undefined,
                  publicKey: undefined,
                  keyId: undefined,
                  keySource: undefined,
                  identityFilePaths: undefined,
                });
              } else {
                throw err;
              }
            }
          } else {
            // 没有密钥，直接使用密码认证
            sftpId = await openSftp({
              sessionId: `sftp-${connectionId}`,
              ...credentials,
            });
          }

          if (!sftpId) throw new Error("Failed to open SFTP session");

          // 保存SFTP会话ID映射
          sftpSessionsRef.current.set(connectionId, sftpId);

          // 使用缓存的路径或默认路径
          let startPath = sharedHostCache?.path ?? "/";
          let homeDir = sharedHostCache?.homeDir ?? startPath;

          /**
           * 如果没有共享缓存，检测用户主目录
           * 检测策略：SSH执行 `echo ~` → SFTP realpath('.') → 硬编码候选路径
           */
          if (!sharedHostCache) {
            const bridge = ALinLinkBridge.get();
            let detected = false;

            // 首先尝试通过SFTP桥获取主目录
            if (bridge?.getSftpHomeDir) {
              try {
                const result = await bridge.getSftpHomeDir(sftpId);
                if (result?.success && result.homeDir) {
                  startPath = result.homeDir;
                  homeDir = result.homeDir;
                  detected = true;
                }
              } catch {
                // 失败则回退到硬编码候选路径
              }
            }

            // 如果自动检测失败，尝试硬编码的候选路径
            if (!detected) {
              const candidates: string[] = [];
              if (credentials.username === "root") {
                candidates.push("/root");
              } else if (credentials.username) {
                candidates.push(`/home/${credentials.username}`);
                candidates.push("/root");
              } else {
                candidates.push("/root");
              }
              const statSftp = bridge?.statSftp;
              if (statSftp) {
                for (const candidate of candidates) {
                  try {
                    const stat = await statSftp(sftpId, candidate, filenameEncoding);
                    if (stat?.type === "directory") {
                      startPath = candidate;
                      homeDir = candidate;
                      break;
                    }
                  } catch {
                    // 忽略不存在或权限错误
                  }
                }
              } else {
                // 当statSftp不可用时，通过listSftp探测候选路径
                for (const candidate of candidates) {
                  try {
                    const files = await bridge?.listSftp(sftpId, candidate, filenameEncoding);
                    if (files) {
                      startPath = candidate;
                      homeDir = candidate;
                      break;
                    }
                  } catch {
                    // 忽略不存在或权限错误
                  }
                }
              }
            }
          }

          // 如果有共享缓存，创建临时缓存键
          const provisionalCacheKey = sharedHostCache
            ? makeCacheKey(connectionId, startPath, filenameEncoding)
            : null;
          if (sharedHostCache && provisionalCacheKey) {
            dirCacheRef.current.set(provisionalCacheKey, {
              files: sharedHostCache.files,
              timestamp: Date.now(),
            });
          }

          /**
           * 获取远程文件列表
           * 如果缓存路径失效，尝试回退路径
           */
          let files: SftpFileEntry[] = [];
          try {
            files = await listRemoteFiles(sftpId, startPath, filenameEncoding);
          } catch {
            // 缓存路径可能已失效（已删除、权限变更）
            // 删除临时缓存条目，防止幽灵文件重新出现
            if (provisionalCacheKey) {
              dirCacheRef.current.delete(provisionalCacheKey);
            }
            // 依次尝试回退路径：homeDir -> "/"
            let fallbackSucceeded = false;
            if (sharedHostCache && startPath !== homeDir) {
              try {
                startPath = homeDir;
                files = await listRemoteFiles(sftpId, startPath, filenameEncoding);
                fallbackSucceeded = true;
              } catch {
                // homeDir也失败，尝试根目录
              }
            }
            if (!fallbackSucceeded && startPath !== "/") {
              try {
                startPath = "/";
                files = await listRemoteFiles(sftpId, startPath, filenameEncoding);
                fallbackSucceeded = true;
              } catch {
                // 根目录也失败
              }
            }
            if (!fallbackSucceeded) {
              throw new Error("Cannot list any remote directory");
            }
          }

          // 检查是否是最新的连接请求
          if (navSeqRef.current[side] !== connectRequestId) return;

          // 更新缓存
          dirCacheRef.current.set(makeCacheKey(connectionId, startPath, filenameEncoding), {
            files,
            timestamp: Date.now(),
          });

          // 更新共享主机缓存
          setSharedRemoteHostCache(hostCacheKey, {
            path: startPath,
            homeDir,
            files,
            filenameEncoding,
          });

          reconnectingRef.current[side] = false;

          // 更新标签页状态为连接成功
          updateTab(side, activeTabId, (prev) => ({
            ...prev,
            connection: prev.connection
              ? {
                  ...prev.connection,
                  status: "connected",
                  currentPath: startPath,
                  homeDir,
                }
              : null,
            files,
            loading: false,
            reconnecting: false,
            connectionLogs: [], // 连接成功后清除日志，避免导航时重播
          }));
        } catch (err) {
          // 连接失败处理
          if (navSeqRef.current[side] !== connectRequestId) return;
          reconnectingRef.current[side] = false;
          updateTab(side, activeTabId, (prev) => ({
            ...prev,
            connection: prev.connection
              ? {
                  ...prev.connection,
                  status: "error",
                  error: err instanceof Error ? err.message : "Connection failed",
                }
              : null,
            files: isReconnectAttempt ? [] : prev.files,
            selectedFiles: isReconnectAttempt ? new Set<string>() : prev.selectedFiles,
            error: isReconnectAttempt
              ? "sftp.error.reconnectFailed"
              : (err instanceof Error ? err.message : "Connection failed"),
            loading: false,
            reconnecting: false,
          }));
        } finally {
          // 清理进度监听器
          unsubSftpProgress?.();
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      getHostCredentials,
      getActivePane,
      updateTab,
      clearCacheForConnection,
      createEmptyPane,
      makeCacheKey,
      listLocalFiles,
      listRemoteFiles,
    ],
  );

  /**
   * 标记初始连接是否已完成
   */
  const initialConnectDoneRef = useRef(false);

  /**
   * 组件挂载时自动连接本地文件系统
   * 仅在首次挂载且左侧标签页为空时执行
   */
  useEffect(() => {
    if (
      autoConnectLocalOnMount &&
      !initialConnectDoneRef.current &&
      leftTabs.tabs.length === 0
    ) {
      // 使用 setTimeout 确保在 React 渲染完成后执行
      const timer = window.setTimeout(() => {
        initialConnectDoneRef.current = true;
        connect("left", "local");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [autoConnectLocalOnMount, connect, leftTabs.tabs.length]);

  /**
   * 自动重连逻辑
   * 当面板标记为重连状态时，延迟1秒后尝试重新连接
   */
  useEffect(() => {
    const reconnectTimers: number[] = [];

    const scheduleReconnect = (side: "left" | "right") => {
      const lastHost = lastConnectedHostRef.current[side];
      if (!lastHost || !reconnectingRef.current[side]) return;

      const timer = window.setTimeout(() => {
        // 再次检查重连标志，防止重复连接
        if (!reconnectingRef.current[side]) return;
        void connect(side, lastHost);
      }, 1000);
      reconnectTimers.push(timer);
    };

    if (leftPane.reconnecting && reconnectingRef.current.left) {
      scheduleReconnect("left");
    }
    if (rightPane.reconnecting && reconnectingRef.current.right) {
      scheduleReconnect("right");
    }

    // 清理定时器
    return () => {
      reconnectTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [leftPane.reconnecting, rightPane.reconnecting, connect, lastConnectedHostRef, reconnectingRef]);

  /**
   * 断开SFTP连接
   * @param side - 面板位置
   */
  const disconnect = useCallback(
    async (side: "left" | "right") => {
      const pane = getActivePane(side);
      const sideTabs = side === "left" ? leftTabsRef.current : rightTabsRef.current;
      const activeTabId = sideTabs.activeTabId;

      if (!pane || !activeTabId) return;

      // 增加导航序列号，使任何待处理的连接请求失效
      navSeqRef.current[side] += 1;

      // 清除连接缓存
      if (pane.connection) {
        clearCacheForConnection(pane.connection.id);
      }

      // 重置重连状态和最后连接的主机
      reconnectingRef.current[side] = false;
      lastConnectedHostRef.current[side] = null;

      // 如果是远程连接，关闭SFTP会话
      if (pane.connection && !pane.connection.isLocal) {
        const sftpId = sftpSessionsRef.current.get(pane.connection.id);
        if (sftpId) {
          try {
            await ALinLinkBridge.get()?.closeSftp(sftpId);
          } catch {
            // 断开连接时忽略关闭SFTP会话的错误
          }
          sftpSessionsRef.current.delete(pane.connection.id);
        }
      }

      // 将标签页重置为空面板
      updateTab(side, activeTabId, () => createEmptyPane(activeTabId, pane.showHiddenFiles));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getActivePane, clearCacheForConnection, updateTab],
  );

  return {
    connect,
    disconnect,
    listLocalFiles,
    listRemoteFiles,
  };
};
