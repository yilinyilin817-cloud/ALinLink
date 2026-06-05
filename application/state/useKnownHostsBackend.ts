import { useCallback } from "react";
import { ALinLinkBridge } from "../../infrastructure/services/ALinLinkBridge";

export const useKnownHostsBackend = () => {
  const readKnownHosts = useCallback(async () => {
    const bridge = ALinLinkBridge.get();
    return bridge?.readKnownHosts?.();
  }, []);

  return { readKnownHosts };
};

