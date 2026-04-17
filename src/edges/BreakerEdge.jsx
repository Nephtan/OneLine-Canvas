import EdgeDeleteButton from "../components/EdgeDeleteButton";
import OrthogonalEdge from "../components/OrthogonalEdge";
import {
  BREAKER_STATE,
  EDGE_POWER_STATE,
  normalizeBreakerState
} from "../engine/powerFlow";

const OPEN_EDGE_STYLE = {
  stroke: "#64748b",
  strokeWidth: 2.2,
  strokeDasharray: "9 7",
  opacity: 0.8
};

const CLOSED_ENERGIZED_EDGE_STYLE = {
  stroke: "#facc15",
  strokeWidth: 2.8,
  filter: "drop-shadow(0 0 6px rgba(250, 204, 21, 0.85))"
};

const CLOSED_DE_ENERGIZED_EDGE_STYLE = {
  stroke: "#94a3b8",
  strokeWidth: 2.4,
  opacity: 0.85
};

const CONFLICT_EDGE_STYLE = {
  stroke: "#ef4444",
  strokeWidth: 3.2,
  filter: "drop-shadow(0 0 10px rgba(239, 68, 68, 0.92))"
};

const TRIPPED_EDGE_STYLE = {
  stroke: "#ef4444",
  strokeWidth: 3,
  strokeDasharray: "4 6",
  filter: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.88))"
};

function BreakerEdge({
  id,
  data,
  selected,
  ...edgeProps
}) {
  const breakerState = normalizeBreakerState(data?.breakerState);
  const edgePowerState = data?.powerState ?? EDGE_POWER_STATE.DE_ENERGIZED;
  const isClosed = breakerState === BREAKER_STATE.CLOSED;
  const isTripped = breakerState === BREAKER_STATE.TRIPPED;
  const edgeStyle = isTripped
    ? TRIPPED_EDGE_STYLE
    : !isClosed
    ? OPEN_EDGE_STYLE
    : edgePowerState === EDGE_POWER_STATE.PHASE_CONFLICT
      ? CONFLICT_EDGE_STYLE
      : edgePowerState === EDGE_POWER_STATE.ENERGIZED
        ? CLOSED_ENERGIZED_EDGE_STYLE
        : CLOSED_DE_ENERGIZED_EDGE_STYLE;

  const edgeLabel = isTripped
    ? "TRP"
    : !isClosed
    ? "Open"
    : edgePowerState === EDGE_POWER_STATE.PHASE_CONFLICT
      ? "Conflict"
      : edgePowerState === EDGE_POWER_STATE.ENERGIZED
        ? "Closed Live"
        : "Closed";

  const labelClassName = isTripped
    ? "border-red-400 bg-red-950/80 text-red-100"
    : !isClosed
    ? "border-slate-500 bg-slate-900/90 text-slate-300"
    : edgePowerState === EDGE_POWER_STATE.PHASE_CONFLICT
      ? "border-red-400 bg-red-900/70 text-red-100"
      : edgePowerState === EDGE_POWER_STATE.ENERGIZED
        ? "border-amber-300/80 bg-amber-400/25 text-amber-100"
        : "border-slate-400 bg-slate-800/95 text-slate-200";

  return (
    <OrthogonalEdge
      id={id}
      data={data}
      selected={selected}
      edgeStyle={edgeStyle}
      className="cursor-pointer"
      label={
        <div className="flex items-center gap-2">
          <button
            type="button"
            title={`Toggle breaker ${id}`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              data?.onToggleBreaker?.();
            }}
            className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${labelClassName}`}
          >
            {edgeLabel}
          </button>
          <EdgeDeleteButton
            title={`Delete breaker ${id}`}
            onDelete={data?.onDeleteEdge}
          />
        </div>
      }
      {...edgeProps}
    />
  );
}

export default BreakerEdge;
