export const TRANSFORMER_SIDE = {
  PRIMARY: "primary",
  SECONDARY: "secondary"
};

export const TRANSFORMER_HANDLE_ID = {
  PRIMARY: "ptx-bus-in",
  SECONDARY: "ptx-bus-out"
};

export function isTransformerNodeType(nodeType) {
  return nodeType === "ptx";
}

export function getTransformerSideForEdge(edge, nodeId) {
  if (edge.target === nodeId) {
    return TRANSFORMER_SIDE.PRIMARY;
  }

  if (edge.source === nodeId) {
    return TRANSFORMER_SIDE.SECONDARY;
  }

  return null;
}
