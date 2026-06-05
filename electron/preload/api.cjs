 
function createPreloadApi(ctx) {
  with (ctx) {
    return {
  getWindowsPtyInfo: () => {
    if (process.platform !== "win32") {
      return null;
    }

    const releaseParts = os.release().split(".");
    const buildNumber = Number.parseInt(releaseParts[2] || "", 10);
    const hasBuildNumber = Number.isFinite(buildNumber);
    const backend =
      hasBuildNumber && buildNumber < 18309 ? "winpty" : "conpty";

    return hasBuildNumber ? { backend, buildNumber } : { backend };
  },
  startSSHSession: async (options) => {
    const result = await ipcRenderer.invoke("ALinLink:start", options);
    return result.sessionId;
  },
  startTelnetSession: async (options) => {
    const result = await ipcRenderer.invoke("ALinLink:telnet:start", options);
    return result.sessionId;
  },
  startMoshSession: async (options) => {
    const result = await ipcRenderer.invoke("ALinLink:mosh:start", options);
    return result.sessionId;
  },
  startLocalSession: async (options) => {
    const result = await ipcRenderer.invoke("ALinLink:local:start", options || {});
    return result.sessionId;
  },
  startSerialSession: async (options) => {
    const result = await ipcRenderer.invoke("ALinLink:serial:start", options);
    return result.sessionId;
  },
  listSerialPorts: async () => {
    return ipcRenderer.invoke("ALinLink:serial:list");
  },
  getDefaultShell: async () => {
    return ipcRenderer.invoke("ALinLink:local:defaultShell");
  },
  discoverShells: () => ipcRenderer.invoke("ALinLink:shells:discover"),
  validatePath: async (path, type) => {
    return ipcRenderer.invoke("ALinLink:local:validatePath", { path, type });
  },
  writeToSession: (sessionId, data, options) => {
    ipcRenderer.send("ALinLink:write", {
      sessionId,
      data,
      automated: Boolean(options?.automated),
    });
  },
  execCommand: async (options) => {
    return ipcRenderer.invoke("ALinLink:ssh:exec", options);
  },
  getSessionPwd: async (sessionId) => {
    return ipcRenderer.invoke("ALinLink:ssh:pwd", { sessionId });
  },
  getSessionRemoteInfo: async (sessionId) => {
    return ipcRenderer.invoke("ALinLink:ssh:remoteInfo", { sessionId });
  },
  getSessionDistroInfo: async (sessionId) => {
    return ipcRenderer.invoke("ALinLink:ssh:distroInfo", { sessionId });
  },
  getServerStats: async (sessionId) => {
    return ipcRenderer.invoke("ALinLink:ssh:stats", { sessionId });
  },
  generateKeyPair: async (options) => {
    return ipcRenderer.invoke("ALinLink:key:generate", options);
  },
  checkSshAgent: async () => {
    return ipcRenderer.invoke("ALinLink:ssh:check-agent");
  },
  getDefaultKeys: async () => {
    return ipcRenderer.invoke("ALinLink:ssh:get-default-keys");
  },
  resizeSession: (sessionId, cols, rows) => {
    ipcRenderer.send("ALinLink:resize", { sessionId, cols, rows });
  },
  setSessionFlowPaused: (sessionId, paused) => {
    ipcRenderer.send("ALinLink:flow", { sessionId, paused: Boolean(paused) });
  },
  closeSession: (sessionId) => {
    ipcRenderer.send("ALinLink:close", { sessionId });
  },
  setSessionEncoding: async (sessionId, encoding) => {
    // Try the SSH handler first; it returns { ok: false } for non-SSH
    // sessions (no session.stream). Telnet and serial sessions fall
    // through to terminalBridge's handler.
    const ssh = await ipcRenderer.invoke("ALinLink:ssh:setEncoding", { sessionId, encoding });
    if (ssh?.ok) return ssh;
    return ipcRenderer.invoke("ALinLink:terminal:setEncoding", { sessionId, encoding });
  },
  onZmodemEvent: (sessionId, cb) => {
    if (!zmodemListeners.has(sessionId)) zmodemListeners.set(sessionId, new Set());
    zmodemListeners.get(sessionId).add(cb);
    return () => zmodemListeners.get(sessionId)?.delete(cb);
  },
  cancelZmodem: (sessionId) => {
    ipcRenderer.send("ALinLink:zmodem:cancel", { sessionId });
  },
  onZmodemOverwriteRequest: (sessionId, cb) => {
    if (!zmodemOverwriteListeners.has(sessionId)) zmodemOverwriteListeners.set(sessionId, new Set());
    zmodemOverwriteListeners.get(sessionId).add(cb);
    return () => zmodemOverwriteListeners.get(sessionId)?.delete(cb);
  },
  respondZmodemOverwrite: (payload) => {
    ipcRenderer.send("ALinLink:zmodem:overwrite-response", payload);
  },
  onSessionData: (sessionId, cb) => {
    if (!dataListeners.has(sessionId)) dataListeners.set(sessionId, new Set());
    dataListeners.get(sessionId).add(cb);
    return () => dataListeners.get(sessionId)?.delete(cb);
  },
  onSessionExit: (sessionId, cb) => {
    if (!exitListeners.has(sessionId)) exitListeners.set(sessionId, new Set());
    exitListeners.get(sessionId).add(cb);
    return () => exitListeners.get(sessionId)?.delete(cb);
  },
  onTelnetAutoLoginComplete: (sessionId, cb) => {
    if (!telnetAutoLoginCompleteListeners.has(sessionId)) {
      telnetAutoLoginCompleteListeners.set(sessionId, new Set());
    }
    telnetAutoLoginCompleteListeners.get(sessionId).add(cb);
    return () => telnetAutoLoginCompleteListeners.get(sessionId)?.delete(cb);
  },
  onTelnetAutoLoginCancelled: (sessionId, cb) => {
    if (!telnetAutoLoginCancelledListeners.has(sessionId)) {
      telnetAutoLoginCancelledListeners.set(sessionId, new Set());
    }
    telnetAutoLoginCancelledListeners.get(sessionId).add(cb);
    return () => telnetAutoLoginCancelledListeners.get(sessionId)?.delete(cb);
  },
  onAuthFailed: (sessionId, cb) => {
    if (!authFailedListeners.has(sessionId)) authFailedListeners.set(sessionId, new Set());
    authFailedListeners.get(sessionId).add(cb);
    return () => authFailedListeners.get(sessionId)?.delete(cb);
  },
  // Keyboard-interactive authentication (2FA/MFA)
  onKeyboardInteractive: (cb) => {
    keyboardInteractiveListeners.add(cb);
    return () => keyboardInteractiveListeners.delete(cb);
  },
  respondKeyboardInteractive: async (requestId, responses, cancelled = false) => {
    return ipcRenderer.invoke("ALinLink:keyboard-interactive:respond", {
      requestId,
      responses,
      cancelled,
    });
  },
  onHostKeyVerification: (cb) => {
    hostKeyVerificationListeners.add(cb);
    return () => hostKeyVerificationListeners.delete(cb);
  },
  respondHostKeyVerification: async (requestId, accept, addToKnownHosts = false) => {
    return ipcRenderer.invoke("ALinLink:host-key:respond", {
      requestId,
      accept,
      addToKnownHosts,
    });
  },
  // Passphrase request for encrypted SSH keys
  onPassphraseRequest: (cb) => {
    passphraseListeners.add(cb);
    return () => passphraseListeners.delete(cb);
  },
  respondPassphrase: async (requestId, passphrase, cancelled = false) => {
    return ipcRenderer.invoke("ALinLink:passphrase:respond", {
      requestId,
      passphrase,
      cancelled,
    });
  },
  respondPassphraseSkip: async (requestId) => {
    return ipcRenderer.invoke("ALinLink:passphrase:respond", {
      requestId,
      passphrase: '',
      skipped: true,
    });
  },
  onPassphraseTimeout: (cb) => {
    passphraseTimeoutListeners.add(cb);
    return () => passphraseTimeoutListeners.delete(cb);
  },
  onPassphraseCancelled: (cb) => {
    passphraseCancelledListeners.add(cb);
    return () => passphraseCancelledListeners.delete(cb);
  },
  onPassphraseAuthFailed: (cb) => {
    passphraseAuthFailedListeners.add(cb);
    return () => passphraseAuthFailedListeners.delete(cb);
  },
  openSftp: async (options) => {
    const result = await ipcRenderer.invoke("ALinLink:sftp:open", options);
    return result.sftpId;
  },
  listSftp: async (sftpId, path, encoding) => {
    return ipcRenderer.invoke("ALinLink:sftp:list", { sftpId, path, encoding });
  },
  readSftp: async (sftpId, path, encoding) => {
    return ipcRenderer.invoke("ALinLink:sftp:read", { sftpId, path, encoding });
  },
  readSftpBinary: async (sftpId, path, encoding) => {
    return ipcRenderer.invoke("ALinLink:sftp:readBinary", { sftpId, path, encoding });
  },
  writeSftp: async (sftpId, path, content, encoding) => {
    return ipcRenderer.invoke("ALinLink:sftp:write", { sftpId, path, content, encoding });
  },
  writeSftpBinary: async (sftpId, path, content, encoding) => {
    return ipcRenderer.invoke("ALinLink:sftp:writeBinary", { sftpId, path, content, encoding });
  },
  closeSftp: async (sftpId) => {
    return ipcRenderer.invoke("ALinLink:sftp:close", { sftpId });
  },
  mkdirSftp: async (sftpId, path, encoding) => {
    return ipcRenderer.invoke("ALinLink:sftp:mkdir", { sftpId, path, encoding });
  },
  deleteSftp: async (sftpId, path, encoding) => {
    return ipcRenderer.invoke("ALinLink:sftp:delete", { sftpId, path, encoding });
  },
  renameSftp: async (sftpId, oldPath, newPath, encoding) => {
    return ipcRenderer.invoke("ALinLink:sftp:rename", { sftpId, oldPath, newPath, encoding });
  },
  statSftp: async (sftpId, path, encoding) => {
    return ipcRenderer.invoke("ALinLink:sftp:stat", { sftpId, path, encoding });
  },
  chmodSftp: async (sftpId, path, mode, encoding) => {
    return ipcRenderer.invoke("ALinLink:sftp:chmod", { sftpId, path, mode, encoding });
  },
  getSftpHomeDir: async (sftpId) => {
    return ipcRenderer.invoke("ALinLink:sftp:homeDir", { sftpId });
  },
  // Write binary with real-time progress callback
  writeSftpBinaryWithProgress: async (sftpId, path, content, transferId, encoding, onProgress, onComplete, onError) => {
    // Register callbacks
    if (onProgress) uploadProgressListeners.set(transferId, onProgress);
    if (onComplete) uploadCompleteListeners.set(transferId, onComplete);
    if (onError) uploadErrorListeners.set(transferId, onError);
    
    return ipcRenderer.invoke("ALinLink:sftp:writeBinaryWithProgress", { 
      sftpId, 
      path, 
      content, 
      transferId,
      encoding,
    });
  },
  // Cancel an in-progress SFTP upload
  cancelSftpUpload: async (transferId) => {
    // Cleanup listeners
    uploadProgressListeners.delete(transferId);
    uploadCompleteListeners.delete(transferId);
    uploadErrorListeners.delete(transferId);
    return ipcRenderer.invoke("ALinLink:sftp:cancelUpload", { transferId });
  },
  // Local filesystem operations
  listLocalDir: async (path) => {
    return ipcRenderer.invoke("ALinLink:local:list", { path });
  },
  readLocalFile: async (path) => {
    return ipcRenderer.invoke("ALinLink:local:read", { path });
  },
  writeLocalFile: async (path, content) => {
    return ipcRenderer.invoke("ALinLink:local:write", { path, content });
  },
  deleteLocalFile: async (path) => {
    return ipcRenderer.invoke("ALinLink:local:delete", { path });
  },
  renameLocalFile: async (oldPath, newPath) => {
    return ipcRenderer.invoke("ALinLink:local:rename", { oldPath, newPath });
  },
  mkdirLocal: async (path) => {
    return ipcRenderer.invoke("ALinLink:local:mkdir", { path });
  },
  statLocal: async (path) => {
    return ipcRenderer.invoke("ALinLink:local:stat", { path });
  },
  listLocalTree: async (path) => {
    return ipcRenderer.invoke("ALinLink:local:tree", { path });
  },
  getHomeDir: async () => {
    return ipcRenderer.invoke("ALinLink:local:homedir");
  },
  listDrives: async () => {
    return ipcRenderer.invoke("ALinLink:local:drives");
  },
  getSystemInfo: async () => {
    return ipcRenderer.invoke("ALinLink:system:info");
  },
  // Read system known_hosts file
  readKnownHosts: async () => {
    return ipcRenderer.invoke("ALinLink:known-hosts:read");
  },
  setTheme: async (theme) => {
    return ipcRenderer.invoke("ALinLink:setTheme", theme);
  },
  setBackgroundColor: async (color) => {
    return ipcRenderer.invoke("ALinLink:setBackgroundColor", color);
  },
  setLanguage: async (language) => {
    return ipcRenderer.invoke("ALinLink:setLanguage", language);
  },
  onLanguageChanged: (cb) => {
    languageChangeListeners.add(cb);
    return () => languageChangeListeners.delete(cb);
  },
  // Streaming transfer with real progress
  startStreamTransfer: async (options, onProgress, onComplete, onError) => {
    const { transferId } = options;
    // Register callbacks
    if (onProgress) transferProgressListeners.set(transferId, onProgress);
    if (onComplete) transferCompleteListeners.set(transferId, onComplete);
    if (onError) transferErrorListeners.set(transferId, onError);
    
    return ipcRenderer.invoke("ALinLink:transfer:start", options);
  },
  cancelTransfer: async (transferId) => {
    cleanupTransferListeners(transferId);
    return ipcRenderer.invoke("ALinLink:transfer:cancel", { transferId });
  },
  sameHostCopyDirectory: async (sftpId, sourcePath, targetPath, encoding, transferId) => {
    return ipcRenderer.invoke("ALinLink:transfer:same-host-copy-dir", { sftpId, sourcePath, targetPath, encoding, transferId });
  },
  // Compressed folder upload
  startCompressedUpload: async (options, onProgress, onComplete, onError) => {
    const { compressionId } = options;
    // Register callbacks
    if (onProgress) compressProgressListeners.set(compressionId, onProgress);
    if (onComplete) compressCompleteListeners.set(compressionId, onComplete);
    if (onError) compressErrorListeners.set(compressionId, onError);
    
    return ipcRenderer.invoke("ALinLink:compress:start", options);
  },
  cancelCompressedUpload: async (compressionId) => {
    // Cleanup listeners
    compressProgressListeners.delete(compressionId);
    compressCompleteListeners.delete(compressionId);
    compressErrorListeners.delete(compressionId);
    return ipcRenderer.invoke("ALinLink:compress:cancel", { compressionId });
  },
  checkCompressedUploadSupport: async (sftpId) => {
    return ipcRenderer.invoke("ALinLink:compress:checkSupport", { sftpId });
  },
  // Window controls for custom title bar
  windowMinimize: () => ipcRenderer.invoke("ALinLink:window:minimize"),
  windowMaximize: () => ipcRenderer.invoke("ALinLink:window:maximize"),
  windowClose: () => ipcRenderer.invoke("ALinLink:window:close"),
  windowIsMaximized: () => ipcRenderer.invoke("ALinLink:window:isMaximized"),
  windowIsFullscreen: () => ipcRenderer.invoke("ALinLink:window:isFullscreen"),
  windowFocus: () => ipcRenderer.invoke("ALinLink:window:focus"),
  onWindowFullScreenChanged: (cb) => {
    fullscreenChangeListeners.add(cb);
    return () => fullscreenChangeListeners.delete(cb);
  },
  
  // Settings window
  openSettingsWindow: () => ipcRenderer.invoke("ALinLink:settings:open"),
  closeSettingsWindow: () => ipcRenderer.invoke("ALinLink:settings:close"),

  // Cross-window settings sync
  notifySettingsChanged: (payload) => ipcRenderer.send("ALinLink:settings:changed", payload),
  onSettingsChanged: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("ALinLink:settings:changed", handler);
    return () => ipcRenderer.removeListener("ALinLink:settings:changed", handler);
  },
  getSshDebugLogInfo: () => ipcRenderer.invoke("ALinLink:sshDebugLog:info"),
  openSshDebugLogDir: () => ipcRenderer.invoke("ALinLink:sshDebugLog:openDir"),

  // Cloud sync session (in-memory only, shared across windows)
  cloudSyncSetSessionPassword: (password) =>
    ipcRenderer.invoke("ALinLink:cloudSync:session:setPassword", password),
  cloudSyncGetSessionPassword: () =>
    ipcRenderer.invoke("ALinLink:cloudSync:session:getPassword"),
  cloudSyncClearSessionPassword: () =>
    ipcRenderer.invoke("ALinLink:cloudSync:session:clearPassword"),

  // Cloud sync network operations (proxied via main process)
  cloudSyncWebdavInitialize: (config) =>
    ipcRenderer.invoke("ALinLink:cloudSync:webdav:initialize", { config }),
  cloudSyncWebdavUpload: (config, syncedFile) =>
    ipcRenderer.invoke("ALinLink:cloudSync:webdav:upload", { config, syncedFile }),
  cloudSyncWebdavDownload: (config) =>
    ipcRenderer.invoke("ALinLink:cloudSync:webdav:download", { config }),
  cloudSyncWebdavDelete: (config) =>
    ipcRenderer.invoke("ALinLink:cloudSync:webdav:delete", { config }),

  cloudSyncS3Initialize: (config) =>
    ipcRenderer.invoke("ALinLink:cloudSync:s3:initialize", { config }),
  cloudSyncS3Upload: (config, syncedFile) =>
    ipcRenderer.invoke("ALinLink:cloudSync:s3:upload", { config, syncedFile }),
  cloudSyncS3Download: (config) =>
    ipcRenderer.invoke("ALinLink:cloudSync:s3:download", { config }),
  cloudSyncS3Delete: (config) =>
    ipcRenderer.invoke("ALinLink:cloudSync:s3:delete", { config }),
  
  // Open URL in default browser
  openExternal: (url) => ipcRenderer.invoke("ALinLink:openExternal", url),
  openPath: (path) => ipcRenderer.invoke("ALinLink:openPath", path),

  // App info
  getAppInfo: () => ipcRenderer.invoke("ALinLink:app:getInfo"),
  ptyGetChildProcesses: (sessionId) =>
    ipcRenderer.invoke("ALinLink:pty:childProcesses", sessionId),
  confirmCloseBusy: (payload) =>
    ipcRenderer.invoke("ALinLink:dialog:confirmCloseBusy", payload),
  getVaultBackupCapabilities: () =>
    ipcRenderer.invoke("ALinLink:vaultBackups:capabilities"),
  createVaultBackup: (payload) =>
    ipcRenderer.invoke("ALinLink:vaultBackups:create", payload),
  listVaultBackups: () =>
    ipcRenderer.invoke("ALinLink:vaultBackups:list"),
  readVaultBackup: (payload) =>
    ipcRenderer.invoke("ALinLink:vaultBackups:read", payload),
  trimVaultBackups: (payload) =>
    ipcRenderer.invoke("ALinLink:vaultBackups:trim", payload),
  openVaultBackupDir: () =>
    ipcRenderer.invoke("ALinLink:vaultBackups:openDir"),
  // Subscribe to cross-window "backups changed" events emitted by the
  // main process whenever a create/trim actually mutated the on-disk
  // set. Returns an unsubscribe function so React-style consumers can
  // release the listener on unmount without leaking IPC handlers.
  onVaultBackupsChanged: (handler) => {
    if (typeof handler !== "function") return () => {};
    const listener = () => {
      try { handler(); } catch (error) {
        console.warn("[preload] onVaultBackupsChanged handler threw:", error);
      }
    };
    ipcRenderer.on("ALinLink:vaultBackups:changed", listener);
    return () => {
      try { ipcRenderer.removeListener("ALinLink:vaultBackups:changed", listener); }
      catch { /* ignore */ }
    };
  },

  // Tell main process the renderer has mounted/painted (used to avoid initial blank screen).
  rendererReady: () => ipcRenderer.send("ALinLink:renderer:ready"),

  // Quit guard: main process asks whether any editor tabs have unsaved changes.
  // Returns an unsubscribe function so React effects can clean up on unmount.
  onCheckDirtyEditors: (listener) => {
    const handler = () => listener();
    ipcRenderer.on("app:query-dirty-editors", handler);
    return () => ipcRenderer.removeListener("app:query-dirty-editors", handler);
  },
  // Renderer reports the dirty-check result back to the main process.
  reportDirtyEditorsResult: (hasDirty) => ipcRenderer.send("app:dirty-editors-result", { hasDirty }),
  
  // Port Forwarding API
  startPortForward: async (options) => {
    return ipcRenderer.invoke("ALinLink:portforward:start", options);
  },
  stopPortForward: async (tunnelId) => {
    return ipcRenderer.invoke("ALinLink:portforward:stop", { tunnelId });
  },
  getPortForwardStatus: async (tunnelId) => {
    return ipcRenderer.invoke("ALinLink:portforward:status", { tunnelId });
  },
  listPortForwards: async () => {
    return ipcRenderer.invoke("ALinLink:portforward:list");
  },
  stopAllPortForwards: async () => {
    return ipcRenderer.invoke("ALinLink:portforward:stopAll");
  },
  stopPortForwardByRuleId: async (ruleId) => {
    return ipcRenderer.invoke("ALinLink:portforward:stopByRuleId", { ruleId });
  },
  onPortForwardStatus: (tunnelId, cb) => {
    if (!portForwardStatusListeners.has(tunnelId)) {
      portForwardStatusListeners.set(tunnelId, new Set());
    }
    portForwardStatusListeners.get(tunnelId).add(cb);
    return () => {
      portForwardStatusListeners.get(tunnelId)?.delete(cb);
      if (portForwardStatusListeners.get(tunnelId)?.size === 0) {
        portForwardStatusListeners.delete(tunnelId);
      }
    };
  },
  // Chain progress listener for jump host connections
  onChainProgress: (cb) => {
    const id = randomUUID();
    chainProgressListeners.set(id, cb);
    return () => {
      chainProgressListeners.delete(id);
    };
  },
  // SFTP connection progress listener (auth method logs)
  onSftpConnectionProgress: (cb) => {
    sftpConnectionProgressListeners.add(cb);
    return () => {
      sftpConnectionProgressListeners.delete(cb);
    };
  },

  // OAuth callback server — two-step so the renderer can learn the bound
  // port (which may differ from the preferred 45678 if it was in use) and
  // embed it into the provider's redirect_uri before opening the browser.
  prepareOAuthCallback: () => ipcRenderer.invoke("oauth:prepareCallback"),
  awaitOAuthCallback: (expectedState, sessionId) =>
    ipcRenderer.invoke("oauth:awaitCallback", expectedState, sessionId),
  cancelOAuthCallback: (sessionId) => ipcRenderer.invoke("oauth:cancelCallback", sessionId),

  // GitHub Device Flow (proxied via main process to avoid CORS)
  githubStartDeviceFlow: (options) => ipcRenderer.invoke("ALinLink:github:deviceFlow:start", options),
  githubPollDeviceFlowToken: (options) => ipcRenderer.invoke("ALinLink:github:deviceFlow:poll", options),
  githubCancelDeviceFlowPoll: (pollId) => ipcRenderer.invoke("ALinLink:github:deviceFlow:cancelPoll", pollId),

  // Google OAuth (proxied via main process to avoid CORS)
  googleExchangeCodeForTokens: (options) =>
    ipcRenderer.invoke("ALinLink:google:oauth:exchange", options),
  googleRefreshAccessToken: (options) =>
    ipcRenderer.invoke("ALinLink:google:oauth:refresh", options),
  googleGetUserInfo: (options) =>
    ipcRenderer.invoke("ALinLink:google:oauth:userinfo", options),

  // Google Drive API (proxied via main process to avoid CORS/COEP issues in renderer)
  googleDriveFindSyncFile: (options) =>
    ipcRenderer.invoke("ALinLink:google:drive:findSyncFile", options),
  googleDriveCreateSyncFile: (options) =>
    ipcRenderer.invoke("ALinLink:google:drive:createSyncFile", options),
  googleDriveUpdateSyncFile: (options) =>
    ipcRenderer.invoke("ALinLink:google:drive:updateSyncFile", options),
  googleDriveDownloadSyncFile: (options) =>
    ipcRenderer.invoke("ALinLink:google:drive:downloadSyncFile", options),
  googleDriveDeleteSyncFile: (options) =>
    ipcRenderer.invoke("ALinLink:google:drive:deleteSyncFile", options),

  // OneDrive OAuth + Graph (proxied via main process to avoid CORS)
  onedriveExchangeCodeForTokens: (options) =>
    ipcRenderer.invoke("ALinLink:onedrive:oauth:exchange", options),
  onedriveRefreshAccessToken: (options) =>
    ipcRenderer.invoke("ALinLink:onedrive:oauth:refresh", options),
  onedriveGetUserInfo: (options) =>
    ipcRenderer.invoke("ALinLink:onedrive:oauth:userinfo", options),
  onedriveFindSyncFile: (options) =>
    ipcRenderer.invoke("ALinLink:onedrive:drive:findSyncFile", options),
  onedriveUploadSyncFile: (options) =>
    ipcRenderer.invoke("ALinLink:onedrive:drive:uploadSyncFile", options),
  onedriveDownloadSyncFile: (options) =>
    ipcRenderer.invoke("ALinLink:onedrive:drive:downloadSyncFile", options),
  onedriveDeleteSyncFile: (options) =>
    ipcRenderer.invoke("ALinLink:onedrive:drive:deleteSyncFile", options),

  // File opener helpers (for "Open With" feature)
  selectApplication: () =>
    ipcRenderer.invoke("ALinLink:selectApplication"),
  openWithApplication: (filePath, appPath) =>
    ipcRenderer.invoke("ALinLink:openWithApplication", { filePath, appPath }),
  downloadSftpToTemp: (sftpId, remotePath, fileName, encoding) =>
    ipcRenderer.invoke("ALinLink:sftp:downloadToTemp", { sftpId, remotePath, fileName, encoding }),
  downloadSftpToTempWithProgress: (sftpId, remotePath, fileName, encoding, transferId, onProgress, onComplete, onError, onCancelled) => {
    if (onProgress) transferProgressListeners.set(transferId, onProgress);
    if (onComplete) transferCompleteListeners.set(transferId, onComplete);
    if (onError) transferErrorListeners.set(transferId, onError);
    if (onCancelled) transferCancelledListeners.set(transferId, onCancelled);
    return ipcRenderer
      .invoke("ALinLink:sftp:downloadToTempWithProgress", { sftpId, remotePath, fileName, encoding, transferId })
      .catch((err) => {
        cleanupTransferListeners(transferId);
        throw err;
      });
  },

  // Save dialog for file downloads
  showSaveDialog: (defaultPath, filters) =>
    ipcRenderer.invoke("ALinLink:showSaveDialog", { defaultPath, filters }),
  selectDirectory: (title, defaultPath) =>
    ipcRenderer.invoke("ALinLink:selectDirectory", { title, defaultPath }),
  selectFile: (title, defaultPath, filters) =>
    ipcRenderer.invoke("ALinLink:selectFile", { title, defaultPath, filters }),

  // File watcher for auto-sync feature
  startFileWatch: (localPath, remotePath, sftpId, encoding) =>
    ipcRenderer.invoke("ALinLink:filewatch:start", { localPath, remotePath, sftpId, encoding }),
  stopFileWatch: (watchId, cleanupTempFile = false) =>
    ipcRenderer.invoke("ALinLink:filewatch:stop", { watchId, cleanupTempFile }),
  listFileWatches: () =>
    ipcRenderer.invoke("ALinLink:filewatch:list"),
  registerTempFile: (sftpId, localPath) =>
    ipcRenderer.invoke("ALinLink:filewatch:registerTempFile", { sftpId, localPath }),
  onFileWatchSynced: (cb) => {
    fileWatchSyncedListeners.add(cb);
    return () => fileWatchSyncedListeners.delete(cb);
  },
  onFileWatchError: (cb) => {
    fileWatchErrorListeners.add(cb);
    return () => fileWatchErrorListeners.delete(cb);
  },
  
  // Temp file cleanup
  deleteTempFile: (filePath) =>
    ipcRenderer.invoke("ALinLink:deleteTempFile", { filePath }),
  
  // Temp directory management
  getTempDirInfo: () =>
    ipcRenderer.invoke("ALinLink:tempdir:getInfo"),
  clearTempDir: () =>
    ipcRenderer.invoke("ALinLink:tempdir:clear"),
  getTempDirPath: () =>
    ipcRenderer.invoke("ALinLink:tempdir:getPath"),
  openTempDir: () =>
    ipcRenderer.invoke("ALinLink:tempdir:open"),

  // Session Logs
  exportSessionLog: (payload) =>
    ipcRenderer.invoke("ALinLink:sessionLogs:export", payload),
  selectSessionLogsDir: () =>
    ipcRenderer.invoke("ALinLink:sessionLogs:selectDir"),
  autoSaveSessionLog: (payload) =>
    ipcRenderer.invoke("ALinLink:sessionLogs:autoSave", payload),
  openSessionLogsDir: (directory) =>
    ipcRenderer.invoke("ALinLink:sessionLogs:openDir", { directory }),

  // Crash Logs
  getCrashLogs: () =>
    ipcRenderer.invoke("ALinLink:crashLogs:list"),
  readCrashLog: (fileName) =>
    ipcRenderer.invoke("ALinLink:crashLogs:read", { fileName }),
  clearCrashLogs: () =>
    ipcRenderer.invoke("ALinLink:crashLogs:clear"),
  openCrashLogsDir: () =>
    ipcRenderer.invoke("ALinLink:crashLogs:openDir"),

  // Global Toggle Hotkey (Quake Mode)
  registerGlobalHotkey: (hotkey) =>
    ipcRenderer.invoke("ALinLink:globalHotkey:register", { hotkey }),
  unregisterGlobalHotkey: () =>
    ipcRenderer.invoke("ALinLink:globalHotkey:unregister"),
  getGlobalHotkeyStatus: () =>
    ipcRenderer.invoke("ALinLink:globalHotkey:status"),

  // System Tray / Close to Tray
  setCloseToTray: (enabled) =>
    ipcRenderer.invoke("ALinLink:tray:setCloseToTray", { enabled }),
  isCloseToTray: () =>
    ipcRenderer.invoke("ALinLink:tray:isCloseToTray"),
  updateTrayMenuData: (data) =>
    ipcRenderer.invoke("ALinLink:tray:updateMenuData", data),
  // Listen for tray menu actions
  onTrayFocusSession: (callback) => {
    const handler = (_event, sessionId) => callback(sessionId);
    ipcRenderer.on("ALinLink:tray:focusSession", handler);
    return () => ipcRenderer.removeListener("ALinLink:tray:focusSession", handler);
  },
  onTrayTogglePortForward: (callback) => {
    const handler = (_event, ruleId, start) => callback(ruleId, start);
    ipcRenderer.on("ALinLink:tray:togglePortForward", handler);
    return () => ipcRenderer.removeListener("ALinLink:tray:togglePortForward", handler);
  },

  // Tray panel actions forwarded to main window
  onTrayPanelJumpToSession: (callback) => {
    const handler = (_event, sessionId) => callback(sessionId);
    ipcRenderer.on("ALinLink:trayPanel:jumpToSession", handler);
    return () => ipcRenderer.removeListener("ALinLink:trayPanel:jumpToSession", handler);
  },
  onTrayPanelConnectToHost: (callback) => {
    const handler = (_event, hostId) => callback(hostId);
    ipcRenderer.on("ALinLink:trayPanel:connectToHost", handler);
    return () => ipcRenderer.removeListener("ALinLink:trayPanel:connectToHost", handler);
  },

  // Tray panel window
  hideTrayPanel: () => ipcRenderer.invoke("ALinLink:trayPanel:hide"),
  openMainWindow: () => ipcRenderer.invoke("ALinLink:trayPanel:openMainWindow"),
  quitApp: () => ipcRenderer.invoke("ALinLink:trayPanel:quitApp"),
  jumpToSessionFromTrayPanel: (sessionId) =>
    ipcRenderer.invoke("ALinLink:trayPanel:jumpToSession", sessionId),
  connectToHostFromTrayPanel: (hostId) =>
    ipcRenderer.invoke("ALinLink:trayPanel:connectToHost", hostId),
  onTrayPanelCloseRequest: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("ALinLink:trayPanel:closeRequest", handler);
    return () => ipcRenderer.removeListener("ALinLink:trayPanel:closeRequest", handler);
  },

  onTrayPanelRefresh: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("ALinLink:trayPanel:refresh", handler);
    return () => ipcRenderer.removeListener("ALinLink:trayPanel:refresh", handler);
  },

  onTrayPanelMenuData: (callback) => {
    // Replay buffered data so late subscribers (e.g. after React lazy-mount) don't miss
    // the initial payload that was sent before the useEffect listener was registered.
    if (_lastTrayMenuData) {
      queueMicrotask(() => callback(_lastTrayMenuData));
    }
    const handler = (_event, data) => {
      _lastTrayMenuData = data;
      callback(data);
    };
    ipcRenderer.on("ALinLink:trayPanel:setMenuData", handler);
    return () => ipcRenderer.removeListener("ALinLink:trayPanel:setMenuData", handler);
  },

  // Get file path from File object (for drag-and-drop)
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return undefined;
    }
  },

  // Clipboard fallback helpers
  readClipboardText: async () => {
    return ipcRenderer.invoke("ALinLink:clipboard:readText");
  },

  // Credential encryption (field-level safeStorage)
  credentialsAvailable: () => ipcRenderer.invoke("ALinLink:credentials:available"),
  credentialsEncrypt: (plaintext) => ipcRenderer.invoke("ALinLink:credentials:encrypt", plaintext),
  credentialsDecrypt: (value) => ipcRenderer.invoke("ALinLink:credentials:decrypt", value),

  // Auto-update
  checkForUpdate: () => ipcRenderer.invoke("ALinLink:update:check"),
  downloadUpdate: () => ipcRenderer.invoke("ALinLink:update:download"),
  installUpdate: () => ipcRenderer.invoke("ALinLink:update:install"),
  getUpdateStatus: () => ipcRenderer.invoke("ALinLink:update:getStatus"),
  setAutoUpdate: (enabled) => ipcRenderer.invoke("ALinLink:update:setAutoUpdate", { enabled }),
  getAutoUpdate: () => ipcRenderer.invoke("ALinLink:update:getAutoUpdate"),
  onUpdateAvailable: (cb) => {
    updateAvailableListeners.add(cb);
    return () => updateAvailableListeners.delete(cb);
  },
  onUpdateNotAvailable: (cb) => {
    updateNotAvailableListeners.add(cb);
    return () => updateNotAvailableListeners.delete(cb);
  },
  onUpdateDownloadProgress: (cb) => {
    updateDownloadProgressListeners.add(cb);
    return () => updateDownloadProgressListeners.delete(cb);
  },
  onUpdateDownloaded: (cb) => {
    updateDownloadedListeners.add(cb);
    return () => updateDownloadedListeners.delete(cb);
  },
  onUpdateError: (cb) => {
    updateErrorListeners.add(cb);
    return () => updateErrorListeners.delete(cb);
  },
  onUpdateNeedsSave: (cb) => {
    updateNeedsSaveListeners.add(cb);
    return () => updateNeedsSaveListeners.delete(cb);
  },

  // ── AI Bridge ──
  aiSyncProviders: async (providers) => {
    return ipcRenderer.invoke("ALinLink:ai:sync-providers", { providers });
  },
  aiSyncWebSearch: async (apiHost, apiKey) => {
    return ipcRenderer.invoke("ALinLink:ai:sync-web-search", { apiHost, apiKey });
  },
  aiChatStream: async (requestId, url, headers, body, providerId) => {
    return ipcRenderer.invoke("ALinLink:ai:chat:stream", { requestId, url, headers, body, providerId });
  },
  aiChatCancel: async (requestId) => {
    return ipcRenderer.invoke("ALinLink:ai:chat:cancel", { requestId });
  },
  aiFetch: async (url, method, headers, body, providerId, skipHostCheck, followRedirects, skipTLSVerify) => {
    return ipcRenderer.invoke("ALinLink:ai:fetch", { url, method, headers, body, providerId, skipHostCheck, followRedirects, skipTLSVerify });
  },
  aiAllowlistAddHost: async (baseURL) => {
    return ipcRenderer.invoke("ALinLink:ai:allowlist:add-host", { baseURL });
  },
  aiExec: async (sessionId, command, chatSessionId) => {
    return ipcRenderer.invoke("ALinLink:ai:exec", { sessionId, command, chatSessionId });
  },
  aiCattyCancelExec: async (chatSessionId) => {
    return ipcRenderer.invoke("ALinLink:ai:catty:cancel", { chatSessionId });
  },
  aiDiscoverAgents: async () => {
    return ipcRenderer.invoke("ALinLink:ai:agents:discover");
  },
  aiResolveCli: async (params) => {
    return ipcRenderer.invoke("ALinLink:ai:resolve-cli", params);
  },
  aiCodexGetIntegration: async (options) => {
    return ipcRenderer.invoke("ALinLink:ai:codex:get-integration", options);
  },
  aiCodexStartLogin: async () => {
    return ipcRenderer.invoke("ALinLink:ai:codex:start-login");
  },
  aiCodexGetLoginSession: async (sessionId) => {
    return ipcRenderer.invoke("ALinLink:ai:codex:get-login-session", { sessionId });
  },
  aiCodexCancelLogin: async (sessionId) => {
    return ipcRenderer.invoke("ALinLink:ai:codex:cancel-login", { sessionId });
  },
  aiCodexLogout: async () => {
    return ipcRenderer.invoke("ALinLink:ai:codex:logout");
  },
  aiSpawnAgent: async (agentId, command, args, env, options) => {
    return ipcRenderer.invoke("ALinLink:ai:agent:spawn", { agentId, command, args, env, closeStdin: options?.closeStdin });
  },
  aiWriteToAgent: async (agentId, data) => {
    return ipcRenderer.invoke("ALinLink:ai:agent:write", { agentId, data });
  },
  aiCloseAgentStdin: async (agentId) => {
    return ipcRenderer.invoke("ALinLink:ai:agent:close-stdin", { agentId });
  },
  aiKillAgent: async (agentId) => {
    return ipcRenderer.invoke("ALinLink:ai:agent:kill", { agentId });
  },
  // MCP Server session metadata
  aiMcpUpdateSessions: async (sessions, chatSessionId) => {
    return ipcRenderer.invoke("ALinLink:ai:mcp:update-sessions", { sessions, chatSessionId });
  },
  aiMcpSetCommandBlocklist: async (blocklist) => {
    return ipcRenderer.invoke("ALinLink:ai:mcp:set-command-blocklist", { blocklist });
  },
  aiMcpSetCommandTimeout: async (timeout) => {
    return ipcRenderer.invoke("ALinLink:ai:mcp:set-command-timeout", { timeout });
  },
  aiMcpSetMaxIterations: async (maxIterations) => {
    return ipcRenderer.invoke("ALinLink:ai:mcp:set-max-iterations", { maxIterations });
  },
  aiMcpSetPermissionMode: async (mode) => {
    return ipcRenderer.invoke("ALinLink:ai:mcp:set-permission-mode", { mode });
  },
  aiMcpSetToolIntegrationMode: async (mode) => {
    return ipcRenderer.invoke("ALinLink:ai:mcp:set-tool-integration-mode", { mode });
  },
  aiUserSkillsGetStatus: async () => {
    return ipcRenderer.invoke("ALinLink:ai:user-skills:status");
  },
  aiUserSkillsOpenFolder: async () => {
    return ipcRenderer.invoke("ALinLink:ai:user-skills:open");
  },
  aiUserSkillsBuildContext: async (prompt, selectedSkillSlugs) => {
    return ipcRenderer.invoke("ALinLink:ai:user-skills:build-context", { prompt, selectedSkillSlugs });
  },
  // MCP approval gate: renderer receives approval requests from main process
  onMcpApprovalRequest: (cb) => {
    const handler = (_event, payload) => cb(payload);
    ipcRenderer.on("ALinLink:ai:mcp:approval-request", handler);
    return () => ipcRenderer.removeListener("ALinLink:ai:mcp:approval-request", handler);
  },
  respondMcpApproval: async (approvalId, approved) => {
    return ipcRenderer.invoke("ALinLink:ai:mcp:approval-response", { approvalId, approved });
  },
  // MCP approval cleared: main process timed out or cancelled an approval
  onMcpApprovalCleared: (cb) => {
    const handler = (_event, payload) => cb(payload);
    ipcRenderer.on("ALinLink:ai:mcp:approval-cleared", handler);
    return () => ipcRenderer.removeListener("ALinLink:ai:mcp:approval-cleared", handler);
  },
  // ACP streaming
  aiAcpStream: async (requestId, chatSessionId, acpCommand, acpArgs, prompt, cwd, providerId, model, existingSessionId, historyMessages, images, toolIntegrationMode, defaultTargetSession, userSkillsContext, agentEnv) => {
    return ipcRenderer.invoke("ALinLink:ai:acp:stream", { requestId, chatSessionId, acpCommand, acpArgs, prompt, cwd, providerId, model, existingSessionId, historyMessages, images, toolIntegrationMode, defaultTargetSession, userSkillsContext, agentEnv });
  },
  aiAcpListModels: async (acpCommand, acpArgs, cwd, providerId, chatSessionId, agentEnv) => {
    return ipcRenderer.invoke("ALinLink:ai:acp:list-models", { acpCommand, acpArgs, cwd, providerId, chatSessionId, agentEnv });
  },
  aiAcpCancel: async (requestId, chatSessionId) => {
    return ipcRenderer.invoke("ALinLink:ai:acp:cancel", { requestId, chatSessionId });
  },
  aiAcpCleanup: async (chatSessionId) => {
    return ipcRenderer.invoke("ALinLink:ai:acp:cleanup", { chatSessionId });
  },
  onAiAcpEvent: (requestId, cb) => {
    const handler = (_event, payload) => {
      if (payload.requestId === requestId) cb(payload.event);
    };
    ipcRenderer.on("ALinLink:ai:acp:event", handler);
    return () => ipcRenderer.removeListener("ALinLink:ai:acp:event", handler);
  },
  onAiAcpDone: (requestId, cb) => {
    const handler = (_event, payload) => {
      if (payload.requestId === requestId) cb();
    };
    ipcRenderer.on("ALinLink:ai:acp:done", handler);
    return () => ipcRenderer.removeListener("ALinLink:ai:acp:done", handler);
  },
  onAiAcpError: (requestId, cb) => {
    const handler = (_event, payload) => {
      if (payload.requestId === requestId) cb(payload.error);
    };
    ipcRenderer.on("ALinLink:ai:acp:error", handler);
    return () => ipcRenderer.removeListener("ALinLink:ai:acp:error", handler);
  },
  onAiStreamData: (requestId, cb) => {
    const handler = (_event, payload) => {
      if (payload.requestId === requestId) cb(payload.data);
    };
    ipcRenderer.on("ALinLink:ai:stream:data", handler);
    return () => ipcRenderer.removeListener("ALinLink:ai:stream:data", handler);
  },
  onAiStreamEnd: (requestId, cb) => {
    const handler = (_event, payload) => {
      if (payload.requestId === requestId) cb();
    };
    ipcRenderer.on("ALinLink:ai:stream:end", handler);
    return () => ipcRenderer.removeListener("ALinLink:ai:stream:end", handler);
  },
  onAiStreamError: (requestId, cb) => {
    const handler = (_event, payload) => {
      if (payload.requestId === requestId) cb(payload.error);
    };
    ipcRenderer.on("ALinLink:ai:stream:error", handler);
    return () => ipcRenderer.removeListener("ALinLink:ai:stream:error", handler);
  },
  onAiAgentStdout: (agentId, cb) => {
    const handler = (_event, payload) => {
      if (payload.agentId === agentId) cb(payload.data);
    };
    ipcRenderer.on("ALinLink:ai:agent:stdout", handler);
    return () => ipcRenderer.removeListener("ALinLink:ai:agent:stdout", handler);
  },
  onAiAgentStderr: (agentId, cb) => {
    const handler = (_event, payload) => {
      if (payload.agentId === agentId) cb(payload.data);
    };
    ipcRenderer.on("ALinLink:ai:agent:stderr", handler);
    return () => ipcRenderer.removeListener("ALinLink:ai:agent:stderr", handler);
  },
  onAiAgentExit: (agentId, cb) => {
    const handler = (_event, payload) => {
      if (payload.agentId === agentId) cb(payload.code);
    };
    ipcRenderer.on("ALinLink:ai:agent:exit", handler);
    return () => ipcRenderer.removeListener("ALinLink:ai:agent:exit", handler);
  },

  // Network Scanner
  startNetworkScan: async (payload) => {
    return ipcRenderer.invoke("ALinLink:scan:start", payload);
  },
  cancelNetworkScan: async (payload) => {
    return ipcRenderer.invoke("ALinLink:scan:cancel", payload);
  },
  quickScanNetwork: async (payload) => {
    return ipcRenderer.invoke("ALinLink:scan:quick", payload);
  },
  getNetworkInterfaces: async () => {
    return ipcRenderer.invoke("ALinLink:scan:interfaces");
  },
  onScanProgress: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on("ALinLink:scan:progress", handler);
    return () => ipcRenderer.removeListener("ALinLink:scan:progress", handler);
  },
  onScanHostFound: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on("ALinLink:scan:host-found", handler);
    return () => ipcRenderer.removeListener("ALinLink:scan:host-found", handler);
  },
  onScanComplete: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on("ALinLink:scan:complete", handler);
    return () => ipcRenderer.removeListener("ALinLink:scan:complete", handler);
  },
    };
  }
}

module.exports = { createPreloadApi };
