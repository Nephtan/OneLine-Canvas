import { BaseEdge, EdgeLabelRenderer, useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  buildOrthogonalEdgeRoute,
  snapCanvasPoint
} from "../canvas/edgeLayout";

function OrthogonalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  edgeStyle,
  label,
  interactionWidth = 34,
  className = ""
}) {
  const { screenToFlowPosition } = useReactFlow();
  const dragCleanupRef = useRef(null);

  const route = useMemo(
    () =>
      buildOrthogonalEdgeRoute({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        waypoints: data?.layout?.waypoints
      }),
    [
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      data?.layout?.waypoints
    ]
  );

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  const startWaypointDrag = useCallback(
    (event, waypointId) => {
      event.preventDefault();
      event.stopPropagation();

      dragCleanupRef.current?.();

      const ownerDocument = event.currentTarget.ownerDocument;
      const ownerWindow = ownerDocument.defaultView ?? window;

      const handlePointerMove = (moveEvent) => {
        const flowPosition = screenToFlowPosition({
          x: moveEvent.clientX,
          y: moveEvent.clientY
        });

        data?.onMoveWaypoint?.(waypointId, snapCanvasPoint(flowPosition));
      };

      const cleanupDrag = () => {
        ownerWindow.removeEventListener("pointermove", handlePointerMove);
        ownerWindow.removeEventListener("pointerup", cleanupDrag);
        ownerWindow.removeEventListener("pointercancel", cleanupDrag);
        ownerDocument.body.style.cursor = "";
        dragCleanupRef.current = null;
      };

      dragCleanupRef.current = cleanupDrag;
      ownerDocument.body.style.cursor = "grabbing";
      ownerWindow.addEventListener("pointermove", handlePointerMove);
      ownerWindow.addEventListener("pointerup", cleanupDrag);
      ownerWindow.addEventListener("pointercancel", cleanupDrag);
    },
    [screenToFlowPosition, data]
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={route.path}
        style={edgeStyle}
        interactionWidth={interactionWidth}
        className={className}
      />

      <EdgeLabelRenderer>
        {label ? (
          <div
            style={{ left: `${route.labelX}px`, top: `${route.labelY}px` }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          >
            {label}
          </div>
        ) : null}

        {selected
          ? route.segments.map((segment, segmentIndex) => (
              (() => {
                const segmentLength = Math.hypot(
                  segment.end.x - segment.start.x,
                  segment.end.y - segment.start.y
                );

                if (segmentLength < 18) {
                  return null;
                }

                const isVerticalSegment = segment.start.x === segment.end.x;
                const addHandleX = segment.midpoint.x + (isVerticalSegment ? 14 : 0);
                const addHandleY = segment.midpoint.y + (isVerticalSegment ? 0 : -14);

                return (
                  <button
                    key={`${id}-segment-${segment.insertIndex}-${segmentIndex}`}
                    type="button"
                    title="Insert routing waypoint"
                    aria-label="Insert routing waypoint"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      data?.onAddWaypoint?.(
                        segment.insertIndex,
                        snapCanvasPoint(segment.midpoint)
                      );
                    }}
                    style={{
                      left: `${addHandleX}px`,
                      top: `${addHandleY}px`
                    }}
                    className="pointer-events-auto absolute inline-flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/80 bg-slate-950/95 text-[11px] font-semibold leading-none text-cyan-100 shadow-[0_0_10px_rgba(8,145,178,0.35)] transition hover:bg-cyan-950/80"
                  >
                    +
                  </button>
                );
              })()
            ))
          : null}

        {selected
          ? route.waypoints.map((waypoint) => (
              <button
                key={waypoint.id}
                type="button"
                title="Drag to reroute. Double-click to remove."
                aria-label="Routing waypoint"
                onPointerDown={(event) => {
                  startWaypointDrag(event, waypoint.id);
                }}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  data?.onRemoveWaypoint?.(waypoint.id);
                }}
                style={{
                  left: `${waypoint.x}px`,
                  top: `${waypoint.y}px`
                }}
                className="pointer-events-auto absolute inline-flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border border-amber-300/90 bg-slate-950/95 text-[9px] font-bold text-amber-100 shadow-[0_0_10px_rgba(250,204,21,0.3)] active:cursor-grabbing"
              >
                <>
                  <span className="sr-only">Waypoint</span>
                  <span aria-hidden="true">o</span>
                </>
              </button>
            ))
          : null}
      </EdgeLabelRenderer>
    </>
  );
}

export default OrthogonalEdge;
