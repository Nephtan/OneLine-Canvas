import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import EdgeDeleteButton from "../components/EdgeDeleteButton";
import { EDGE_POWER_STATE } from "../engine/powerFlow";

const STANDARD_DE_ENERGIZED_EDGE_STYLE = {
  stroke: "#64748b",
  strokeWidth: 2.4,
  opacity: 0.9
};

const STANDARD_ENERGIZED_EDGE_STYLE = {
  stroke: "#facc15",
  strokeWidth: 2.8,
  filter: "drop-shadow(0 0 6px rgba(250, 204, 21, 0.8))"
};

const STANDARD_CONFLICT_EDGE_STYLE = {
  stroke: "#ef4444",
  strokeWidth: 3.1,
  filter: "drop-shadow(0 0 10px rgba(239, 68, 68, 0.9))"
};

function StandardEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}) {
  const edgePowerState = data?.powerState ?? EDGE_POWER_STATE.DE_ENERGIZED;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const edgeStyle =
    edgePowerState === EDGE_POWER_STATE.PHASE_CONFLICT
      ? STANDARD_CONFLICT_EDGE_STYLE
      : edgePowerState === EDGE_POWER_STATE.ENERGIZED
        ? STANDARD_ENERGIZED_EDGE_STYLE
        : STANDARD_DE_ENERGIZED_EDGE_STYLE;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        interactionWidth={34}
      />

      <EdgeLabelRenderer>
        <div
          style={{ left: `${labelX}px`, top: `${labelY}px` }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        >
          <EdgeDeleteButton
            title={`Delete wire ${id}`}
            onDelete={data?.onDeleteEdge}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default StandardEdge;
