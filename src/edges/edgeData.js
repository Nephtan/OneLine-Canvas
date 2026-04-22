import {
  BREAKER_STATE,
  EDGE_DEVICE_KIND,
  EDGE_LINE_SIDE,
  FAULT_TYPE,
  PROTECTION_MODE,
  TRIP_REASON,
  getLoadSideForLineSide,
  normalizeBreakerState,
  normalizeEdgeDeviceKind,
  normalizeEdgeLineSide,
  normalizeFaultType,
  normalizeProtectionMode,
  normalizeTripReason
} from "../engine/protectionModel";
import { EDGE_TYPE, normalizeCanvasEdgeType } from "../topology/edgeTypes";

function normalizeOptionalPositiveInteger(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      return undefined;
    }

    const numericValue = Number(trimmedValue.replace(/,/g, ""));

    if (Number.isFinite(numericValue) && numericValue > 0) {
      return Math.round(numericValue);
    }
  }

  return undefined;
}

function normalizeOptionalPositiveNumber(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      return undefined;
    }

    const numericValue = Number(trimmedValue.replace(/,/g, ""));

    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }
  }

  return undefined;
}

function normalizeOptionalTrimmedText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getDefaultEdgeData(edgeType) {
  if (normalizeCanvasEdgeType(edgeType) === EDGE_TYPE.BREAKER) {
    return {
      breakerState: BREAKER_STATE.OPEN,
      deviceKind: EDGE_DEVICE_KIND.BREAKER,
      protectionMode: PROTECTION_MODE.IDEAL_SELECTIVE,
      lineSide: EDGE_LINE_SIDE.SOURCE,
      faultType: FAULT_TYPE.NONE,
      tripReason: TRIP_REASON.NONE,
      ratedCurrentAmps: undefined,
      interruptingRatingAmps: undefined,
      deviceFamily: "",
      tripUnit: "",
      curveKey: "",
      conductorImpedanceOhms: undefined
    };
  }

  return {
    breakerState: BREAKER_STATE.OPEN,
    deviceKind: EDGE_DEVICE_KIND.NONE,
    protectionMode: PROTECTION_MODE.IDEAL_SELECTIVE,
    lineSide: EDGE_LINE_SIDE.SOURCE,
    faultType: FAULT_TYPE.NONE,
    tripReason: TRIP_REASON.NONE,
    ratedCurrentAmps: undefined,
    interruptingRatingAmps: undefined,
    deviceFamily: "",
    tripUnit: "",
    curveKey: "",
    conductorImpedanceOhms: undefined
  };
}

export function normalizeEdgeData(edge) {
  const normalizedEdgeType = normalizeCanvasEdgeType(edge?.type);
  const fallbackData = getDefaultEdgeData(normalizedEdgeType);
  const currentData =
    edge?.data && typeof edge.data === "object" ? edge.data : {};
  const nextData = {
    ...fallbackData,
    ...currentData
  };

  nextData.breakerState =
    normalizedEdgeType === EDGE_TYPE.BREAKER
      ? normalizeBreakerState(currentData.breakerState)
      : BREAKER_STATE.OPEN;
  nextData.deviceKind =
    normalizedEdgeType === EDGE_TYPE.BREAKER
      ? normalizeEdgeDeviceKind(currentData.deviceKind || EDGE_DEVICE_KIND.BREAKER)
      : EDGE_DEVICE_KIND.NONE;
  nextData.protectionMode = normalizeProtectionMode(currentData.protectionMode);
  nextData.lineSide = normalizeEdgeLineSide(currentData.lineSide);
  nextData.faultType = normalizeFaultType(currentData.faultType);
  nextData.tripReason =
    normalizedEdgeType === EDGE_TYPE.BREAKER
      ? normalizeTripReason(currentData.tripReason)
      : TRIP_REASON.NONE;
  nextData.ratedCurrentAmps = normalizeOptionalPositiveInteger(
    currentData.ratedCurrentAmps
  );
  nextData.interruptingRatingAmps =
    normalizedEdgeType === EDGE_TYPE.BREAKER
      ? normalizeOptionalPositiveInteger(currentData.interruptingRatingAmps)
      : undefined;
  nextData.deviceFamily =
    normalizedEdgeType === EDGE_TYPE.BREAKER
      ? normalizeOptionalTrimmedText(currentData.deviceFamily)
      : "";
  nextData.tripUnit =
    normalizedEdgeType === EDGE_TYPE.BREAKER
      ? normalizeOptionalTrimmedText(currentData.tripUnit)
      : "";
  nextData.curveKey =
    normalizedEdgeType === EDGE_TYPE.BREAKER
      ? normalizeOptionalTrimmedText(currentData.curveKey)
      : "";
  nextData.conductorImpedanceOhms = normalizeOptionalPositiveNumber(
    currentData.conductorImpedanceOhms
  );

  return nextData;
}

export function isProtectiveEdge(edge) {
  return (
    normalizeCanvasEdgeType(edge?.type) === EDGE_TYPE.BREAKER &&
    normalizeEdgeData(edge).deviceKind !== EDGE_DEVICE_KIND.NONE
  );
}

export function isProtectiveEdgeData(edgeType, edgeData) {
  return (
    normalizeCanvasEdgeType(edgeType) === EDGE_TYPE.BREAKER &&
    normalizeEdgeDeviceKind(edgeData?.deviceKind) !== EDGE_DEVICE_KIND.NONE
  );
}

export function getEdgeLoadSide(edge) {
  return getLoadSideForLineSide(normalizeEdgeData(edge).lineSide);
}
