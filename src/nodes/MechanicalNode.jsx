import { Handle, Position } from "@xyflow/react";
import { NODE_POWER_STATE } from "../engine/powerFlow";

function WarningIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5 2.8 19.8h18.4L12 3.5Zm0 5.4v5.4m0 3.2h.01"
      />
    </svg>
  );
}

function FanIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="12" r="1.7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.2c2.6 0 3.8 2.6 2.3 4.6L12 12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.4 13.7c1.3-2.3 4.2-1.9 5.3.1L12 16.8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.7c-2.5.1-3.8-2.5-2.4-4.5L12 12" />
    </svg>
  );
}

function MechanicalNode({ data }) {
  const powerState = data.powerState ?? NODE_POWER_STATE.DEAD;
  const sourceIds = data.sourceIds ?? [];

  const shellClassName =
    powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border-red-500 bg-red-900/50 shadow-[0_0_0_1px_rgba(248,113,113,0.45),0_0_20px_rgba(239,68,68,0.45)] animate-pulse"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border-orange-500 bg-orange-950/40 shadow-[0_0_0_1px_rgba(251,146,60,0.3),0_0_16px_rgba(249,115,22,0.35)]"
        : powerState === NODE_POWER_STATE.LIVE
          ? "border-amber-300/90 bg-slate-900 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_20px_rgba(250,204,21,0.35)]"
          : "border-cyan-800 bg-slate-900 shadow-lg shadow-slate-950/70";

  const titleClassName =
    powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "text-red-200"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "text-orange-200"
        : powerState === NODE_POWER_STATE.LIVE
          ? "text-amber-200/90"
          : "text-cyan-300/85";

  const labelClassName =
    powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "text-red-100"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "text-orange-100"
        : powerState === NODE_POWER_STATE.LIVE
          ? "text-amber-100"
          : "text-cyan-100";

  const badgeClassName =
    powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border-red-400 bg-red-950/70 text-red-100"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border-orange-400 bg-orange-950/70 text-orange-100"
        : powerState === NODE_POWER_STATE.LIVE
          ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
          : "border-cyan-700 bg-cyan-950/30 text-cyan-100";

  const handleClassName =
    powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border border-red-200 bg-red-400"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border border-orange-200 bg-orange-400"
        : powerState === NODE_POWER_STATE.LIVE
          ? "border border-amber-100 bg-amber-300"
          : "border border-cyan-300/70 bg-cyan-500/70";

  return (
    <div className={`min-w-60 rounded-md border px-4 py-3 text-left ${shellClassName}`}>
      <div className="flex items-center gap-2">
        <FanIcon className={`h-4 w-4 ${titleClassName}`} />
        <div className={`text-[10px] uppercase tracking-[0.2em] ${titleClassName}`}>
          Mechanical Load
        </div>
      </div>
      <div className={`mt-1 text-sm font-semibold ${labelClassName}`}>{data.label}</div>
      <div className="mt-2 text-xs text-slate-300">{data.mechanicalClass ?? "Fan Coil Wall"}</div>
      <div
        className={`mt-2 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${badgeClassName}`}
      >
        {powerState === NODE_POWER_STATE.PHASE_CONFLICT ||
        powerState === NODE_POWER_STATE.BACKFEED ? (
          <WarningIcon className="h-3 w-3" />
        ) : null}
        {powerState}
      </div>
      <div className="mt-1 text-[10px] text-slate-400">
        Sources: {sourceIds.length > 0 ? sourceIds.join(", ") : "None"}
      </div>

      <Handle
        id="mechanical-in"
        type="target"
        position={Position.Top}
        isConnectable
        className={`!h-2.5 !w-8 !rounded-full ${handleClassName}`}
      />
    </div>
  );
}

export default MechanicalNode;
