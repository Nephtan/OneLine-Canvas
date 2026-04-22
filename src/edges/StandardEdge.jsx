import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import EdgeCenterControl from "../components/EdgeCenterControl";
import EdgeDeleteButton from "../components/EdgeDeleteButton";
import EdgePropertiesButton from "../components/EdgePropertiesButton";
import { EDGE_POWER_STATE } from "../engine/powerFlow";
import { FAULT_TYPE } from "../engine/protectionModel";
import { getManualEdgeCenter } from "../topology/edgePathOptions";

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
  data,
  pathOptions
}) {
  const edgePowerState = data?.powerState ?? EDGE_POWER_STATE.DE_ENERGIZED;
  const manualCenter = getManualEdgeCenter(pathOptions);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    centerX: manualCenter?.centerX,
    centerY: manualCenter?.centerY
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
        <EdgeCenterControl edgeId={id} labelX={labelX} labelY={labelY}>
          {(dragHandleProps) => (
            <div className="flex items-center gap-2">
              {data?.faultType === FAULT_TYPE.BOLTED ? (
                <div className="pointer-events-auto rounded border border-red-400 bg-red-950/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-red-100">
                  FLT
                </div>
              ) : null}
              <div
                {...dragHandleProps}
                title={`Drag wire ${id} route`}
                className="pointer-events-auto nodrag nopan inline-flex cursor-grab items-center rounded-full border border-cyan-400/70 bg-slate-950/95 px-2 py-1 shadow-[0_0_8px_rgba(15,23,42,0.65)] active:cursor-grabbing"
              >
                <span className="h-1.5 w-6 rounded-full bg-cyan-200/80" />
              </div>
              <EdgePropertiesButton
                title={`Edit wire ${id} properties`}
                onOpen={data?.onOpenProperties}
              />
              <EdgeDeleteButton
                title={`Delete wire ${id}`}
                onDelete={data?.onDeleteEdge}
              />
            </div>
          )}
        </EdgeCenterControl>
      </EdgeLabelRenderer>
    </>
  );
}

export default StandardEdge;
