import { ALinLinkBridge } from "./ALinLinkBridge";

export const getCredentialProtectionAvailability = async (): Promise<boolean | null> => {
  const bridge = ALinLinkBridge.get();
  if (!bridge?.credentialsAvailable) return null;

  try {
    return await bridge.credentialsAvailable();
  } catch {
    return null;
  }
};
