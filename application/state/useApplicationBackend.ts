import { useCallback } from "react";
import { ALinLinkBridge } from "../../infrastructure/services/ALinLinkBridge";
import { localStorageAdapter } from "../../infrastructure/persistence/localStorageAdapter";

export type ApplicationInfo = {
  name: string;
  version: string;
  platform: string;
};

export type SshAgentStatus = {
  running: boolean;
  startupType: string | null;
  error: string | null;
};

export const useApplicationBackend = () => {
  const openExternal = useCallback(async (url: string) => {
    const bridge = ALinLinkBridge.get();
    if (bridge?.openExternal) {
      // Bridge resolves on success (either via system browser or in-app
      // fallback window) and rejects only when both paths fail. Let the
      // rejection propagate so callers can present a user-facing message.
      await bridge.openExternal(url);
      return;
    }
    // Fallback for non-Electron environments (tests, dev server, etc.).
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const getApplicationInfo = useCallback(async (): Promise<ApplicationInfo | null> => {
    const bridge = ALinLinkBridge.get();
    const info = await bridge?.getAppInfo?.();
    return info ?? null;
  }, []);

  const checkSshAgent = useCallback(async (): Promise<SshAgentStatus | null> => {
    const bridge = ALinLinkBridge.get();
    const status = await bridge?.checkSshAgent?.();
    return status ?? null;
  }, []);

  const clearAppCache = useCallback((): number => {
    const keysToRemove = localStorageAdapter.keys().filter((key) => key.startsWith("ALinLink-cache-"));
    keysToRemove.forEach((key) => localStorageAdapter.remove(key));
    return keysToRemove.length;
  }, []);

  return { openExternal, getApplicationInfo, checkSshAgent, clearAppCache };
};

