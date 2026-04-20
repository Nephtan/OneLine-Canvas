export const CANVAS_GRID_SIZE = 24;
export const CANVAS_SNAP_GRID = [CANVAS_GRID_SIZE, CANVAS_GRID_SIZE];

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function arePointsEqual(pointA, pointB) {
  return (
    pointA !== null &&
    pointB !== null &&
    pointA.x === pointB.x &&
    pointA.y === pointB.y
  );
}

function roundCoordinate(value) {
  return Number(value.toFixed(2));
}

export function snapCanvasCoordinate(value) {
  if (!isFiniteNumber(value)) {
    return 0;
  }

  return Math.round(value / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE;
}

export function snapCanvasPoint(point) {
  return {
    x: snapCanvasCoordinate(point?.x ?? 0),
    y: snapCanvasCoordinate(point?.y ?? 0)
  };
}

function normalizeEdgeControlPoint(controlPoint) {
  if (controlPoint === null || typeof controlPoint !== "object") {
    return null;
  }

  return snapCanvasPoint(controlPoint);
}

function normalizeLegacyWaypoint(waypoint) {
  if (waypoint === null || typeof waypoint !== "object") {
    return null;
  }

  return snapCanvasPoint(waypoint);
}

function deriveControlPointFromLegacyWaypoints(rawWaypoints) {
  const waypoints = Array.isArray(rawWaypoints)
    ? rawWaypoints.map((waypoint) => normalizeLegacyWaypoint(waypoint)).filter(Boolean)
    : [];

  if (waypoints.length === 0) {
    return null;
  }

  if (waypoints.length === 1) {
    return waypoints[0];
  }

  const leftIndex = Math.floor((waypoints.length - 1) / 2);
  const rightIndex = Math.ceil((waypoints.length - 1) / 2);
  const leftWaypoint = waypoints[leftIndex];
  const rightWaypoint = waypoints[rightIndex];

  return snapCanvasPoint({
    x: (leftWaypoint.x + rightWaypoint.x) / 2,
    y: (leftWaypoint.y + rightWaypoint.y) / 2
  });
}

export function normalizeEdgeLayout(layout) {
  const controlPoint = normalizeEdgeControlPoint(layout?.controlPoint);

  return {
    controlPoint:
      controlPoint ?? deriveControlPointFromLegacyWaypoints(layout?.waypoints)
  };
}

export function normalizeCanvasEdgeData(edgeData) {
  const nextEdgeData =
    edgeData !== null && typeof edgeData === "object" ? { ...edgeData } : {};

  nextEdgeData.layout = normalizeEdgeLayout(nextEdgeData.layout);

  return nextEdgeData;
}

export function getEdgeControlPoint(edgeOrData) {
  if (
    edgeOrData !== null &&
    typeof edgeOrData === "object" &&
    "data" in edgeOrData
  ) {
    return normalizeCanvasEdgeData(edgeOrData.data).layout.controlPoint;
  }

  return normalizeCanvasEdgeData(edgeOrData).layout.controlPoint;
}

export function translateEdgeControlPoint(controlPoint, delta) {
  const normalizedControlPoint = normalizeEdgeControlPoint(controlPoint);

  if (!normalizedControlPoint) {
    return null;
  }

  return snapCanvasPoint({
    x: normalizedControlPoint.x + (delta?.x ?? 0),
    y: normalizedControlPoint.y + (delta?.y ?? 0)
  });
}

function getAxisForPosition(position) {
  return position === "left" || position === "right" ? "horizontal" : "vertical";
}

function createPoint(x, y) {
  return {
    x: roundCoordinate(x),
    y: roundCoordinate(y)
  };
}

function pushPathPoint(pathPoints, point) {
  const previousPoint = pathPoints[pathPoints.length - 1] ?? null;

  if (!arePointsEqual(previousPoint, point)) {
    pathPoints.push(point);
  }
}

function createOrthogonalLegPoints({
  from,
  to,
  startAxis = null,
  endAxis = null
}) {
  if (from.x === to.x || from.y === to.y) {
    return [to];
  }

  if (startAxis !== null && endAxis !== null && startAxis === endAxis) {
    if (startAxis === "vertical") {
      const midY = roundCoordinate((from.y + to.y) / 2);

      return [createPoint(from.x, midY), createPoint(to.x, midY), to];
    }

    const midX = roundCoordinate((from.x + to.x) / 2);

    return [createPoint(midX, from.y), createPoint(midX, to.y), to];
  }

  if (startAxis === "vertical") {
    return [createPoint(from.x, to.y), to];
  }

  if (startAxis === "horizontal") {
    return [createPoint(to.x, from.y), to];
  }

  if (endAxis === "vertical") {
    return [createPoint(to.x, from.y), to];
  }

  if (endAxis === "horizontal") {
    return [createPoint(from.x, to.y), to];
  }

  return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
    ? [createPoint(to.x, from.y), to]
    : [createPoint(from.x, to.y), to];
}

function createPathFromPoints(pathPoints) {
  if (pathPoints.length === 0) {
    return "";
  }

  return pathPoints.reduce((path, point, pointIndex) => {
    const pointText = `${point.x} ${point.y}`;
    return pointIndex === 0 ? `M ${pointText}` : `${path} L ${pointText}`;
  }, "");
}

function getPolylineLabelPosition(pathPoints) {
  if (pathPoints.length === 0) {
    return { x: 0, y: 0 };
  }

  if (pathPoints.length === 1) {
    return pathPoints[0];
  }

  let totalLength = 0;
  const segmentLengths = [];

  for (let segmentIndex = 0; segmentIndex < pathPoints.length - 1; segmentIndex += 1) {
    const start = pathPoints[segmentIndex];
    const end = pathPoints[segmentIndex + 1];
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);

    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }

  if (totalLength === 0) {
    return pathPoints[0];
  }

  const halfLength = totalLength / 2;
  let traversedLength = 0;

  for (let segmentIndex = 0; segmentIndex < segmentLengths.length; segmentIndex += 1) {
    const segmentLength = segmentLengths[segmentIndex];

    if (traversedLength + segmentLength >= halfLength) {
      const start = pathPoints[segmentIndex];
      const end = pathPoints[segmentIndex + 1];
      const ratio = (halfLength - traversedLength) / segmentLength;

      return createPoint(
        start.x + (end.x - start.x) * ratio,
        start.y + (end.y - start.y) * ratio
      );
    }

    traversedLength += segmentLength;
  }

  return pathPoints[pathPoints.length - 1];
}

export function buildOrthogonalEdgeRoute({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  controlPoint = null
}) {
  const normalizedControlPoint = normalizeEdgeLayout({ controlPoint }).controlPoint;
  const sourcePoint = createPoint(sourceX, sourceY);
  const targetPoint = createPoint(targetX, targetY);
  const anchors = normalizedControlPoint
    ? [sourcePoint, normalizedControlPoint, targetPoint]
    : [sourcePoint, targetPoint];
  const pathPoints = [sourcePoint];

  for (let anchorIndex = 0; anchorIndex < anchors.length - 1; anchorIndex += 1) {
    const from = anchors[anchorIndex];
    const to = anchors[anchorIndex + 1];
    const legPoints = createOrthogonalLegPoints({
      from,
      to,
      startAxis: anchorIndex === 0 ? getAxisForPosition(sourcePosition) : null,
      endAxis:
        anchorIndex === anchors.length - 2
          ? getAxisForPosition(targetPosition)
          : null
    });

    legPoints.forEach((point) => {
      pushPathPoint(pathPoints, point);
    });
  }

  const routeControlPoint = normalizedControlPoint ?? getPolylineLabelPosition(pathPoints);

  return {
    pathPoints,
    path: createPathFromPoints(pathPoints),
    controlPoint: routeControlPoint,
    labelX: routeControlPoint.x,
    labelY: routeControlPoint.y
  };
}
