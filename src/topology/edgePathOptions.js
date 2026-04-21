function normalizeFiniteCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function snapCoordinate(value, step) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value;
  }

  if (typeof step !== "number" || !Number.isFinite(step) || step <= 0) {
    return value;
  }

  return step * Math.round(value / step);
}

function isFiniteNonZeroDelta(delta) {
  return (
    delta !== null &&
    typeof delta === "object" &&
    typeof delta.x === "number" &&
    Number.isFinite(delta.x) &&
    typeof delta.y === "number" &&
    Number.isFinite(delta.y) &&
    (delta.x !== 0 || delta.y !== 0)
  );
}

function deltasMatch(leftDelta, rightDelta) {
  return (
    leftDelta.x === rightDelta.x &&
    leftDelta.y === rightDelta.y
  );
}

export function normalizeEdgePathOptions(pathOptions) {
  if (
    pathOptions === null ||
    typeof pathOptions !== "object" ||
    Array.isArray(pathOptions)
  ) {
    return undefined;
  }

  const normalizedPathOptions = { ...pathOptions };
  const centerX = normalizeFiniteCoordinate(pathOptions.centerX);
  const centerY = normalizeFiniteCoordinate(pathOptions.centerY);

  if (centerX === undefined) {
    delete normalizedPathOptions.centerX;
  } else {
    normalizedPathOptions.centerX = centerX;
  }

  if (centerY === undefined) {
    delete normalizedPathOptions.centerY;
  } else {
    normalizedPathOptions.centerY = centerY;
  }

  return Object.keys(normalizedPathOptions).length > 0
    ? normalizedPathOptions
    : undefined;
}

export function getManualEdgeCenter(pathOptions) {
  const normalizedPathOptions = normalizeEdgePathOptions(pathOptions);

  if (
    normalizedPathOptions?.centerX === undefined ||
    normalizedPathOptions?.centerY === undefined
  ) {
    return null;
  }

  return {
    centerX: normalizedPathOptions.centerX,
    centerY: normalizedPathOptions.centerY
  };
}

export function translateEdgePathOptions(pathOptions, delta, snapGrid = [1, 1]) {
  const normalizedPathOptions = normalizeEdgePathOptions(pathOptions);

  if (!normalizedPathOptions || !isFiniteNonZeroDelta(delta)) {
    return normalizedPathOptions;
  }

  const [stepX = 1, stepY = 1] = Array.isArray(snapGrid) ? snapGrid : [1, 1];

  return normalizeEdgePathOptions({
    ...normalizedPathOptions,
    centerX:
      normalizedPathOptions.centerX === undefined
        ? undefined
        : snapCoordinate(normalizedPathOptions.centerX + delta.x, stepX),
    centerY:
      normalizedPathOptions.centerY === undefined
        ? undefined
        : snapCoordinate(normalizedPathOptions.centerY + delta.y, stepY)
  });
}

export function translateEdgesForRigidNodeMove(
  edges,
  nodePositionDeltasById,
  snapGrid = [1, 1]
) {
  if (!Array.isArray(edges) || !(nodePositionDeltasById instanceof Map)) {
    return edges;
  }

  let didUpdateAnyEdge = false;

  const nextEdges = edges.map((edge) => {
    const sourceDelta = nodePositionDeltasById.get(edge.source);
    const targetDelta = nodePositionDeltasById.get(edge.target);

    if (
      !isFiniteNonZeroDelta(sourceDelta) ||
      !isFiniteNonZeroDelta(targetDelta) ||
      !deltasMatch(sourceDelta, targetDelta) ||
      getManualEdgeCenter(edge.pathOptions) === null
    ) {
      return edge;
    }

    const nextPathOptions = translateEdgePathOptions(
      edge.pathOptions,
      sourceDelta,
      snapGrid
    );

    if (nextPathOptions === edge.pathOptions) {
      return edge;
    }

    didUpdateAnyEdge = true;

    return {
      ...edge,
      pathOptions: nextPathOptions
    };
  });

  return didUpdateAnyEdge ? nextEdges : edges;
}
