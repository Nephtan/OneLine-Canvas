function normalizeFiniteCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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
