export const TRANSFORMER_SIDE = {
  PRIMARY: "primary",
  SECONDARY: "secondary"
};

export const TRANSFORMER_HANDLE_ID = {
  PRIMARY_IN: "ptx-bus-in",
  PRIMARY_LOOP: "ptx-bus-loop",
  SECONDARY: "ptx-bus-out"
};

export function isTransformerNodeType(nodeType) {
  return nodeType === "ptx";
}

export function getTransformerHandleRole(handleId, edgeDirection) {
  if (handleId === TRANSFORMER_HANDLE_ID.PRIMARY_IN) {
    return TRANSFORMER_HANDLE_ID.PRIMARY_IN;
  }

  if (handleId === TRANSFORMER_HANDLE_ID.PRIMARY_LOOP) {
    return TRANSFORMER_HANDLE_ID.PRIMARY_LOOP;
  }

  if (handleId === TRANSFORMER_HANDLE_ID.SECONDARY) {
    return TRANSFORMER_HANDLE_ID.SECONDARY;
  }

  if (edgeDirection === "target") {
    return TRANSFORMER_HANDLE_ID.PRIMARY_IN;
  }

  if (edgeDirection === "source") {
    return TRANSFORMER_HANDLE_ID.SECONDARY;
  }

  return null;
}

export function getTransformerSideForHandleRole(handleRole) {
  if (
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_IN ||
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_LOOP
  ) {
    return TRANSFORMER_SIDE.PRIMARY;
  }

  if (handleRole === TRANSFORMER_HANDLE_ID.SECONDARY) {
    return TRANSFORMER_SIDE.SECONDARY;
  }

  return null;
}

export function getTransformerHandleRoleForEdge(edge, nodeId) {
  if (edge.target === nodeId) {
    return getTransformerHandleRole(edge.targetHandle, "target");
  }

  if (edge.source === nodeId) {
    return getTransformerHandleRole(edge.sourceHandle, "source");
  }

  return null;
}

export function getTransformerSideForEdge(edge, nodeId) {
  return getTransformerSideForHandleRole(
    getTransformerHandleRoleForEdge(edge, nodeId)
  );
}
