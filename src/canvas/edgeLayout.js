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

export function createEdgeWaypointId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `waypoint-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeEdgeWaypoint(waypoint, fallbackIndex) {
  if (waypoint === null || typeof waypoint !== "object") {
    return null;
  }

  const snappedPoint = snapCanvasPoint(waypoint);

  return {
    id:
      typeof waypoint.id === "string" && waypoint.id.trim() !== ""
        ? waypoint.id
        : `waypoint-${fallbackIndex}`,
    x: snappedPoint.x,
    y: snappedPoint.y
  };
}

export function normalizeEdgeLayout(layout) {
  const rawWaypoints = Array.isArray(layout?.waypoints) ? layout.waypoints : [];

  return {
    waypoints: rawWaypoints
      .map((waypoint, waypointIndex) =>
        normalizeEdgeWaypoint(waypoint, waypointIndex)
      )
      .filter(Boolean)
  };
}

export function normalizeCanvasEdgeData(edgeData) {
  const nextEdgeData =
    edgeData !== null && typeof edgeData === "object" ? { ...edgeData } : {};

  nextEdgeData.layout = normalizeEdgeLayout(nextEdgeData.layout);

  return nextEdgeData;
}

export function getEdgeWaypoints(edgeOrData) {
  if (
    edgeOrData !== null &&
    typeof edgeOrData === "object" &&
    "data" in edgeOrData
  ) {
    return normalizeCanvasEdgeData(edgeOrData.data).layout.waypoints;
  }

  return normalizeCanvasEdgeData(edgeOrData).layout.waypoints;
}

export function translateEdgeWaypoints(waypoints, delta) {
  return waypoints.map((waypoint) => ({
    ...waypoint,
    x: snapCanvasCoordinate(waypoint.x + (delta?.x ?? 0)),
    y: snapCanvasCoordinate(waypoint.y + (delta?.y ?? 0))
  }));
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
  waypoints = []
}) {
  const normalizedWaypoints = normalizeEdgeLayout({ waypoints }).waypoints;
  const sourcePoint = createPoint(sourceX, sourceY);
  const targetPoint = createPoint(targetX, targetY);
  const anchors = [sourcePoint, ...normalizedWaypoints, targetPoint];
  const pathPoints = [sourcePoint];
  const segments = [];

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
      const previousPoint = pathPoints[pathPoints.length - 1];

      pushPathPoint(pathPoints, point);

      const nextPoint = pathPoints[pathPoints.length - 1];

      if (arePointsEqual(previousPoint, nextPoint)) {
        return;
      }

      segments.push({
        start: previousPoint,
        end: nextPoint,
        midpoint: createPoint(
          (previousPoint.x + nextPoint.x) / 2,
          (previousPoint.y + nextPoint.y) / 2
        ),
        insertIndex: anchorIndex
      });
    });
  }

  const labelPosition = getPolylineLabelPosition(pathPoints);

  return {
    waypoints: normalizedWaypoints,
    pathPoints,
    path: createPathFromPoints(pathPoints),
    labelX: labelPosition.x,
    labelY: labelPosition.y,
    segments
  };
}
