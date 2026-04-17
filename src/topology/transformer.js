export const TRANSFORMER_SIDE = {
  PRIMARY: "primary",
  SECONDARY: "secondary"
};

export const TRANSFORMER_HANDLE_ID = {
  PRIMARY_IN: "ptx-bus-in",
  PRIMARY_IN_SOURCE: "ptx-bus-in-source",
  PRIMARY_LOOP_TARGET: "ptx-bus-loop-target",
  PRIMARY_LOOP: "ptx-bus-loop",
  SECONDARY: "ptx-bus-out"
};

export const TRANSFORMER_PRIMARY_TERMINAL = {
  A: "a",
  B: "b"
};

export const TRANSFORMER_HANDLE_DIRECTION = {
  SOURCE: "source",
  TARGET: "target"
};

export const TRANSFORMER_PRIMARY_SOURCE_HANDLE_IDS = [
  TRANSFORMER_HANDLE_ID.PRIMARY_IN_SOURCE,
  TRANSFORMER_HANDLE_ID.PRIMARY_LOOP
];

export const TRANSFORMER_PRIMARY_TARGET_HANDLE_IDS = [
  TRANSFORMER_HANDLE_ID.PRIMARY_IN,
  TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET
];

export const TRANSFORMER_PRIMARY_HANDLE_IDS = [
  ...TRANSFORMER_PRIMARY_TARGET_HANDLE_IDS,
  ...TRANSFORMER_PRIMARY_SOURCE_HANDLE_IDS
];

export function isTransformerNodeType(nodeType) {
  return nodeType === "ptx";
}

export function getTransformerHandleRole(handleId, edgeDirection) {
  if (handleId === TRANSFORMER_HANDLE_ID.PRIMARY_IN) {
    return TRANSFORMER_HANDLE_ID.PRIMARY_IN;
  }

  if (handleId === TRANSFORMER_HANDLE_ID.PRIMARY_IN_SOURCE) {
    return TRANSFORMER_HANDLE_ID.PRIMARY_IN_SOURCE;
  }

  if (handleId === TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET) {
    return TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET;
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

export function isTransformerPrimaryHandleRole(handleRole) {
  return (
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_IN ||
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_IN_SOURCE ||
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET ||
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_LOOP
  );
}

export function getTransformerPrimaryTerminalForHandleRole(handleRole) {
  if (
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_IN ||
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_IN_SOURCE
  ) {
    return TRANSFORMER_PRIMARY_TERMINAL.A;
  }

  if (
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET ||
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_LOOP
  ) {
    return TRANSFORMER_PRIMARY_TERMINAL.B;
  }

  return null;
}

export function getTransformerHandleDirectionForRole(handleRole) {
  if (
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_IN ||
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET
  ) {
    return TRANSFORMER_HANDLE_DIRECTION.TARGET;
  }

  if (
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_IN_SOURCE ||
    handleRole === TRANSFORMER_HANDLE_ID.PRIMARY_LOOP ||
    handleRole === TRANSFORMER_HANDLE_ID.SECONDARY
  ) {
    return TRANSFORMER_HANDLE_DIRECTION.SOURCE;
  }

  return null;
}

export function getTransformerSideForHandleRole(handleRole) {
  if (isTransformerPrimaryHandleRole(handleRole)) {
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
