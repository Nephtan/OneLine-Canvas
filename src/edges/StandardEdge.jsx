import EdgeDeleteButton from "../components/EdgeDeleteButton";
import OrthogonalEdge from "../components/OrthogonalEdge";
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
  data,
  ...edgeProps
}) {
  const edgePowerState = data?.powerState ?? EDGE_POWER_STATE.DE_ENERGIZED;

  const edgeStyle =
    edgePowerState === EDGE_POWER_STATE.PHASE_CONFLICT
      ? STANDARD_CONFLICT_EDGE_STYLE
      : edgePowerState === EDGE_POWER_STATE.ENERGIZED
        ? STANDARD_ENERGIZED_EDGE_STYLE
        : STANDARD_DE_ENERGIZED_EDGE_STYLE;

  return (
    <OrthogonalEdge
      id={id}
      data={data}
      edgeStyle={edgeStyle}
      label={
        <div className="flex cursor-grab items-center active:cursor-grabbing">
          <EdgeDeleteButton
            title={`Delete wire ${id}`}
            onDelete={data?.onDeleteEdge}
          />
        </div>
      }
      {...edgeProps}
    />
  );
}

export default StandardEdge;
