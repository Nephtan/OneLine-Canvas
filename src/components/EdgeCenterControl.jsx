import { useCallback, useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { CANVAS_SNAP_GRID } from "../canvas/grid";
import { normalizeEdgePathOptions } from "../topology/edgePathOptions";

function stopOverlayEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

function EdgeCenterControl({ edgeId, labelX, labelY, children }) {
  const { screenToFlowPosition, setEdges } = useReactFlow();
  const cleanupDragRef = useRef(null);

  const updateEdgeCenter = useCallback(
    (clientX, clientY) => {
      const nextCenter = screenToFlowPosition(
        { x: clientX, y: clientY },
        { snapToGrid: true, snapGrid: CANVAS_SNAP_GRID }
      );

      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          if (edge.id !== edgeId) {
            return edge;
          }

          return {
            ...edge,
            pathOptions: normalizeEdgePathOptions({
              ...(edge.pathOptions ?? {}),
              centerX: nextCenter.x,
              centerY: nextCenter.y
            })
          };
        })
      );
    },
    [edgeId, screenToFlowPosition, setEdges]
  );

  const handlePointerDown = useCallback(
    (event) => {
      if (event.button !== 0) {
        return;
      }

      stopOverlayEvent(event);
      cleanupDragRef.current?.();

      const handlePointerMove = (moveEvent) => {
        updateEdgeCenter(moveEvent.clientX, moveEvent.clientY);
      };

      const handlePointerUp = () => {
        cleanupDragRef.current?.();
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
      window.addEventListener("pointercancel", handlePointerUp, { once: true });

      cleanupDragRef.current = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        cleanupDragRef.current = null;
      };
    },
    [updateEdgeCenter]
  );

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  return (
    <div
      style={{ left: `${labelX}px`, top: `${labelY}px` }}
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
    >
      {children({
        onPointerDown: handlePointerDown,
        onClick: stopOverlayEvent,
        onDoubleClick: stopOverlayEvent
      })}
    </div>
  );
}

export default EdgeCenterControl;
