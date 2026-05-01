export const TRANSFER_SWITCH_ACTIVE_SOURCE = {
  PRIMARY: "primary",
  EMERGENCY: "emergency"
};

export const TRANSFER_SWITCH_CONTROL_MODE = {
  MANUAL: "manual",
  AUTO: "auto"
};

export const TRANSFER_SWITCH_RETRANSFER_POLICY = {
  MANUAL_RETURN: "manual-return",
  AUTO_RETURN: "auto-return"
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

export function normalizeTransferSwitchControlMode(controlMode) {
  return controlMode === TRANSFER_SWITCH_CONTROL_MODE.AUTO
    ? TRANSFER_SWITCH_CONTROL_MODE.AUTO
    : TRANSFER_SWITCH_CONTROL_MODE.MANUAL;
}

export function formatTransferSwitchControlMode(controlMode) {
  return normalizeTransferSwitchControlMode(controlMode) ===
    TRANSFER_SWITCH_CONTROL_MODE.AUTO
    ? "Auto"
    : "Manual";
}

export function normalizeTransferSwitchRetransferPolicy(retransferPolicy) {
  return retransferPolicy === TRANSFER_SWITCH_RETRANSFER_POLICY.AUTO_RETURN
    ? TRANSFER_SWITCH_RETRANSFER_POLICY.AUTO_RETURN
    : TRANSFER_SWITCH_RETRANSFER_POLICY.MANUAL_RETURN;
}

export function formatTransferSwitchRetransferPolicy(retransferPolicy) {
  return normalizeTransferSwitchRetransferPolicy(retransferPolicy) ===
    TRANSFER_SWITCH_RETRANSFER_POLICY.AUTO_RETURN
    ? "Auto Return"
    : "Manual Return";
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
