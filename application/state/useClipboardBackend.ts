import { useCallback } from "react";
import { ALinLinkBridge } from "../../infrastructure/services/ALinLinkBridge";

export const useClipboardBackend = () => {
  const readClipboardText = useCallback(async (): Promise<string> => {
    const bridge = ALinLinkBridge.get();
    if (!bridge?.readClipboardText) throw new Error("clipboard bridge unavailable");

    const text = await bridge.readClipboardText();
    return typeof text === "string" ? text : "";
  }, []);

  return { readClipboardText };
};
