export class BridgeUnavailableError extends Error {
  constructor(message = "ALinLink bridge unavailable") {
    super(message);
    this.name = "BridgeUnavailableError";
  }
}

export const ALinLinkBridge = {
  get(): ALinLinkBridge | undefined {
    return window.ALinLink;
  },

  require(): ALinLinkBridge {
    const bridge = window.ALinLink;
    if (!bridge) throw new BridgeUnavailableError();
    return bridge;
  },
};
