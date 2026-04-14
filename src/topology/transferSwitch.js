export const TRANSFER_SWITCH_ACTIVE_SOURCE = {
  PRIMARY: "primary",
  EMERGENCY: "emergency"
};

export const TRANSFER_SWITCH_HANDLE_ID = {
  PRIMARY: "target-primary",
  EMERGENCY: "target-emergency",
  OUTPUT: "transfer-bus-out",
  LEGACY_INPUT: "transfer-bus-in"
};

export function isTransferSwitchNodeType(nodeType) {
  return nodeType === "transferSwitch";
}

export function normalizeTransferSwitchActiveSource(activeSource) {
  return activeSource === TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
    ? TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
    : TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY;
}

export function formatTransferSwitchActiveSource(activeSource) {
  return normalizeTransferSwitchActiveSource(activeSource) ===
    TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
    ? "Emergency"
    : "Primary";
}

export function normalizeTransferSwitchTargetHandle(targetHandle) {
  return targetHandle === TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
    ? TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
    : TRANSFER_SWITCH_HANDLE_ID.PRIMARY;
}

export function getTransferSwitchHandleRole(handleId) {
  if (
    handleId === TRANSFER_SWITCH_HANDLE_ID.PRIMARY ||
    handleId === TRANSFER_SWITCH_HANDLE_ID.LEGACY_INPUT
  ) {
    return TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY;
  }

  if (handleId === TRANSFER_SWITCH_HANDLE_ID.EMERGENCY) {
    return TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY;
  }

  if (handleId === TRANSFER_SWITCH_HANDLE_ID.OUTPUT) {
    return "output";
  }

  return null;
}
