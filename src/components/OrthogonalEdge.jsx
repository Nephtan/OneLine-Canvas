import { BaseEdge, EdgeLabelRenderer, useReactFlow } from "@xyflow/react";
import { useCallback, useMemo, useRef } from "react";
import {
  buildOrthogonalEdgeRoute,
  snapCanvasPoint
} from "../canvas/edgeLayout";

const DRAG_THRESHOLD_PX = 6;

function OrthogonalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  edgeStyle,
  label,
  interactionWidth = 34,
  className = ""
}) {
  const { screenToFlowPosition } = useReactFlow();
  const dragSessionRef = useRef(null);
  const suppressClickRef = useRef(false);

  const route = useMemo(
    () =>
      buildOrthogonalEdgeRoute({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        controlPoint: data?.layout?.controlPoint
      }),
    [
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      data?.layout?.controlPoint
    ]
  );

  const beginLabelDrag = useCallback(
    (event) => {
      event.stopPropagation();

      if (
        !label ||
        event.button !== 0 ||
        typeof data?.onMoveControlPoint !== "function"
      ) {
        return;
      }

      suppressClickRef.current = false;
      dragSessionRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPointerFlowPosition: screenToFlowPosition({
          x: event.clientX,
          y: event.clientY
        }),
        startControlPoint: route.controlPoint,
        hasDragged: false
      };

      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [data, label, route.controlPoint, screenToFlowPosition]
  );

  const continueLabelDrag = useCallback(
    (event) => {
      const dragSession = dragSessionRef.current;

      if (!dragSession || dragSession.pointerId !== event.pointerId) {
        return;
      }

      const movedDistance = Math.hypot(
        event.clientX - dragSession.startClientX,
        event.clientY - dragSession.startClientY
      );

      if (!dragSession.hasDragged && movedDistance < DRAG_THRESHOLD_PX) {
        return;
      }

      dragSession.hasDragged = true;
      const pointerFlowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      data?.onMoveControlPoint?.(
        snapCanvasPoint({
          x:
            dragSession.startControlPoint.x +
            (pointerFlowPosition.x - dragSession.startPointerFlowPosition.x),
          y:
            dragSession.startControlPoint.y +
            (pointerFlowPosition.y - dragSession.startPointerFlowPosition.y)
        })
      );
    },
    [data, screenToFlowPosition]
  );

  const endLabelDrag = useCallback((event) => {
    const dragSession = dragSessionRef.current;

    if (!dragSession || dragSession.pointerId !== event.pointerId) {
      return;
    }

    if (dragSession.hasDragged) {
      event.preventDefault();
      suppressClickRef.current = true;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragSessionRef.current = null;
  }, []);

  const handleLabelClickCapture = useCallback((event) => {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  const handleLabelClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

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
            style={{
              left: `${route.controlPoint.x}px`,
              top: `${route.controlPoint.y}px`
            }}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 touch-none"
            onPointerDownCapture={beginLabelDrag}
            onPointerMove={continueLabelDrag}
            onPointerUp={endLabelDrag}
            onPointerCancel={endLabelDrag}
            onClickCapture={handleLabelClickCapture}
            onClick={handleLabelClick}
          >
            {label}
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
}

export default OrthogonalEdge;
