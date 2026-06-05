import { useEffect } from "react";
import type { MutableRefObject } from "react";
import { ALinLinkBridge } from "../../../infrastructure/services/ALinLinkBridge";

export const useSftpSessionCleanup = (sftpSessionsRef: MutableRefObject<Map<string, string>>) => {
  useEffect(() => {
    const sessionsRef = sftpSessionsRef.current;

    return () => {
      sessionsRef.forEach(async (sftpId) => {
        try {
          await ALinLinkBridge.get()?.closeSftp(sftpId);
        } catch {
          // Ignore errors when closing SFTP sessions during cleanup
        }
      });
    };
  }, [sftpSessionsRef]);
};
