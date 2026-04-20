export const UPS_HANDLE_ID = {
  INPUT: "ups-line-in",
  OUTPUT: "ups-load-out"
};

export const UPS_OPERATING_MODE = {
  NORMAL: "normal",
  BATTERY: "battery",
  BYPASS: "bypass"
};

export function isUpsNodeType(nodeType) {
  return nodeType === "ups";
}

export function normalizeUpsOperatingMode(operatingMode) {
  if (operatingMode === UPS_OPERATING_MODE.BATTERY) {
    return UPS_OPERATING_MODE.BATTERY;
  }

  if (operatingMode === UPS_OPERATING_MODE.BYPASS) {
    return UPS_OPERATING_MODE.BYPASS;
  }

  return UPS_OPERATING_MODE.NORMAL;
}

export function formatUpsOperatingMode(operatingMode) {
  const normalizedOperatingMode = normalizeUpsOperatingMode(operatingMode);

  if (normalizedOperatingMode === UPS_OPERATING_MODE.BATTERY) {
    return "Battery";
  }

  if (normalizedOperatingMode === UPS_OPERATING_MODE.BYPASS) {
    return "Bypass";
  }

  return "Normal";
}

export function normalizeUpsTargetHandle(targetHandle) {
  return targetHandle === UPS_HANDLE_ID.INPUT ? UPS_HANDLE_ID.INPUT : UPS_HANDLE_ID.INPUT;
}

export function normalizeUpsSourceHandle(sourceHandle) {
  return sourceHandle === UPS_HANDLE_ID.OUTPUT ? UPS_HANDLE_ID.OUTPUT : UPS_HANDLE_ID.OUTPUT;
}

export function getUpsHandleRole(handleId, edgeDirection) {
  if (handleId === UPS_HANDLE_ID.INPUT) {
    return UPS_HANDLE_ID.INPUT;
  }

  if (handleId === UPS_HANDLE_ID.OUTPUT) {
    return UPS_HANDLE_ID.OUTPUT;
  }

  if (edgeDirection === "target") {
    return UPS_HANDLE_ID.INPUT;
  }

  if (edgeDirection === "source") {
    return UPS_HANDLE_ID.OUTPUT;
  }

  return null;
}

export function getUpsHandleRoleForEdge(edge, nodeId) {
  if (edge.target === nodeId) {
    return getUpsHandleRole(edge.targetHandle, "target");
  }

  if (edge.source === nodeId) {
    return getUpsHandleRole(edge.sourceHandle, "source");
  }

  return null;
}
