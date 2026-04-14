import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import { BREAKER_STATE, normalizeBreakerState } from "../engine/powerFlow";

const OPEN_EDGE_STYLE = {
  stroke: "#64748b",
  strokeWidth: 2.2,
  strokeDasharray: "9 7",
  opacity: 0.8
};

const CLOSED_EDGE_STYLE = {
  stroke: "#facc15",
  strokeWidth: 2.8,
  filter: "drop-shadow(0 0 6px rgba(250, 204, 21, 0.85))"
};

function BreakerEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}) {
  const breakerState = normalizeBreakerState(data?.breakerState);
  const isClosed = breakerState === BREAKER_STATE.CLOSED;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={isClosed ? CLOSED_EDGE_STYLE : OPEN_EDGE_STYLE}
        interactionWidth={34}
        className="cursor-pointer"
      />

      <EdgeLabelRenderer>
        <div
          style={{ left: `${labelX}px`, top: `${labelY}px` }}
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
            isClosed
              ? "border-amber-300/80 bg-amber-400/25 text-amber-100"
              : "border-slate-500 bg-slate-900/90 text-slate-300"
          }`}
        >
          {isClosed ? "Closed" : "Open"}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default BreakerEdge;
