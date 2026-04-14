export const EDGE_TYPE = {
  BREAKER: "breaker",
  STANDARD: "standard"
};

export function normalizeCanvasEdgeType(edgeType) {
  return edgeType === EDGE_TYPE.STANDARD
    ? EDGE_TYPE.STANDARD
    : EDGE_TYPE.BREAKER;
}

export function isBreakerEdgeType(edgeType) {
  return normalizeCanvasEdgeType(edgeType) === EDGE_TYPE.BREAKER;
}
