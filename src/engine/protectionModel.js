export const BREAKER_STATE = {
  OPEN: "open",
  CLOSED: "closed",
  TRIPPED: "tripped"
};

export const EDGE_DEVICE_KIND = {
  NONE: "none",
  BREAKER: "breaker",
  FUSE: "fuse"
};

export const PROTECTION_MODE = {
  IDEAL_SELECTIVE: "idealSelective",
  TCC: "tcc"
};

export const EDGE_LINE_SIDE = {
  SOURCE: "source",
  TARGET: "target"
};

export const FAULT_TYPE = {
  NONE: "none",
  BOLTED: "bolted"
};

export const TRIP_REASON = {
  NONE: "none",
  PROTECTION: "protection"
};

export function normalizeBreakerState(state) {
  if (state === BREAKER_STATE.CLOSED) {
    return BREAKER_STATE.CLOSED;
  }

  if (state === BREAKER_STATE.TRIPPED) {
    return BREAKER_STATE.TRIPPED;
  }

  return BREAKER_STATE.OPEN;
}

export function normalizeEdgeDeviceKind(deviceKind) {
  if (deviceKind === EDGE_DEVICE_KIND.BREAKER) {
    return EDGE_DEVICE_KIND.BREAKER;
  }

  if (deviceKind === EDGE_DEVICE_KIND.FUSE) {
    return EDGE_DEVICE_KIND.FUSE;
  }

  return EDGE_DEVICE_KIND.NONE;
}

export function normalizeProtectionMode(protectionMode) {
  return protectionMode === PROTECTION_MODE.TCC
    ? PROTECTION_MODE.TCC
    : PROTECTION_MODE.IDEAL_SELECTIVE;
}

export function normalizeEdgeLineSide(lineSide) {
  return lineSide === EDGE_LINE_SIDE.TARGET
    ? EDGE_LINE_SIDE.TARGET
    : EDGE_LINE_SIDE.SOURCE;
}

export function getLoadSideForLineSide(lineSide) {
  return normalizeEdgeLineSide(lineSide) === EDGE_LINE_SIDE.TARGET
    ? EDGE_LINE_SIDE.SOURCE
    : EDGE_LINE_SIDE.TARGET;
}

export function normalizeFaultType(faultType) {
  return faultType === FAULT_TYPE.BOLTED ? FAULT_TYPE.BOLTED : FAULT_TYPE.NONE;
}

export function normalizeTripReason(tripReason) {
  return tripReason === TRIP_REASON.PROTECTION
    ? TRIP_REASON.PROTECTION
    : TRIP_REASON.NONE;
}

export function formatFaultType(faultType) {
  return normalizeFaultType(faultType) === FAULT_TYPE.BOLTED
    ? "Bolted Fault"
    : "Normal";
}

export function formatProtectionMode(protectionMode) {
  return normalizeProtectionMode(protectionMode) === PROTECTION_MODE.TCC
    ? "TCC (Reserved)"
    : "Ideal Selective";
}

export function formatEdgeLineSide(lineSide) {
  return normalizeEdgeLineSide(lineSide) === EDGE_LINE_SIDE.TARGET
    ? "Target Endpoint"
    : "Source Endpoint";
}

export function hasBoltedFault(faultType) {
  return normalizeFaultType(faultType) === FAULT_TYPE.BOLTED;
}
