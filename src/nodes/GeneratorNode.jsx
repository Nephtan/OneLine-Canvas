import { Handle, Position } from "@xyflow/react";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import InlineLabelEditor from "../components/InlineLabelEditor";
import NodeDeleteButton from "../components/NodeDeleteButton";
import NodePropertiesButton from "../components/NodePropertiesButton";
import { formatVoltageValue } from "../electrical/voltage";

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

function EngineIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 10.5h17v8h-17z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 10.5V7h5v3.5m6 0V8.5h2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 14.5h2m2.5 0h2m2.5 0h2" />
    </svg>
  );
}

function GeneratorNode({ data }) {
  const powerState = data.powerState ?? NODE_POWER_STATE.DEAD;
  const sourceIds = data.sourceIds ?? [];
  const propagatingVoltages = data.propagatingVoltages ?? [];
  const isSourceOnline = data.isSourceOnline !== false;
  const isTrulyOffline = !isSourceOnline && powerState === NODE_POWER_STATE.DEAD;

  const shellClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border-purple-500 bg-purple-900/50 shadow-[0_0_0_1px_rgba(192,132,252,0.42),0_0_24px_rgba(126,34,206,0.44)] animate-pulse"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border-red-500 bg-red-900/50 shadow-[0_0_0_1px_rgba(248,113,113,0.45),0_0_20px_rgba(239,68,68,0.45)] animate-pulse"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border-orange-500 bg-orange-950/40 shadow-[0_0_0_1px_rgba(251,146,60,0.3),0_0_16px_rgba(249,115,22,0.35)]"
        : isTrulyOffline
          ? "border-slate-700 bg-slate-900/65 shadow-lg shadow-slate-950/80"
          : powerState === NODE_POWER_STATE.LIVE
            ? "border-lime-400/80 bg-slate-900 shadow-[0_0_0_1px_rgba(163,230,53,0.2),0_0_14px_rgba(132,204,22,0.26)]"
            : "border-slate-600 bg-slate-900 shadow-lg shadow-slate-950/70";

  const titleClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "text-purple-200"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "text-red-200"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "text-orange-200"
        : isTrulyOffline
          ? "text-slate-500"
          : powerState === NODE_POWER_STATE.LIVE
            ? "text-lime-200/95"
            : "text-slate-400";

  const badgeClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border-purple-400 bg-purple-950/70 text-purple-100"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border-red-400 bg-red-950/70 text-red-100"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border-orange-400 bg-orange-950/70 text-orange-100"
        : isTrulyOffline
          ? "border-slate-600 bg-slate-800/70 text-slate-400"
          : powerState === NODE_POWER_STATE.LIVE
            ? "border-lime-300/80 bg-lime-400/20 text-lime-100"
            : "border-slate-600 bg-slate-800/70 text-slate-300";

  const handleClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border border-purple-200 bg-purple-500"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border border-red-200 bg-red-400"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border border-orange-200 bg-orange-400"
        : isTrulyOffline
          ? "border border-slate-500 bg-slate-600"
          : powerState === NODE_POWER_STATE.LIVE
            ? "border border-lime-100 bg-lime-300"
            : "border border-slate-300 bg-slate-500";

  const statusChipClassName = isSourceOnline
    ? "border border-lime-300/70 bg-lime-500/20 text-lime-100"
    : "border border-slate-500 bg-slate-800/80 text-slate-300";

  return (
    <div className={`min-w-60 rounded-md border px-4 py-3 text-left ${shellClassName}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <EngineIcon className={`h-4 w-4 ${titleClassName}`} />
          <div className={`text-[10px] uppercase tracking-[0.2em] ${titleClassName}`}>
            Generator Source
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] ${statusChipClassName}`}
          >
            {isSourceOnline ? "Online" : "Offline"}
          </span>
          <NodePropertiesButton
            onOpen={data.onOpenProperties}
            title={`Edit properties for ${data.label}`}
          />
          <NodeDeleteButton onDelete={data.onDeleteNode} title={`Delete ${data.label}`} />
        </div>
      </div>
      <div className="mt-1">
        <InlineLabelEditor
          label={data.label}
          onCommit={data.onRenameLabel}
          className={`text-sm font-semibold ${isTrulyOffline ? "text-slate-400" : "text-slate-100"}`}
          inputClassName={`text-sm font-semibold ${isTrulyOffline ? "text-slate-300" : "text-slate-100"}`}
        />
      </div>
      <div className={`mt-2 text-xs ${isTrulyOffline ? "text-slate-500" : "text-slate-300"}`}>
        {formatVoltageValue(data.nominalVoltage)}
      </div>
      <div className="mt-2">
        <div className={`text-[9px] uppercase tracking-[0.18em] ${isTrulyOffline ? "text-slate-500" : "text-slate-400"}`}>
          Sync Group
        </div>
        <input
          type="text"
          value={data.syncGroup ?? ""}
          placeholder="GRID-A"
          onChange={(event) => {
            data.onChangeSyncGroup?.(event.target.value);
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
          className={`nodrag mt-1 w-full rounded border bg-slate-950/80 px-2 py-1 text-xs outline-none focus:border-lime-300/80 ${
            isTrulyOffline
              ? "border-slate-600 text-slate-300 placeholder:text-slate-600"
              : "border-slate-500/70 text-slate-100 placeholder:text-slate-500"
          }`}
        />
      </div>
      <div
        className={`mt-2 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${badgeClassName}`}
      >
        {powerState === NODE_POWER_STATE.VOLTAGE_FAULT ||
        powerState === NODE_POWER_STATE.PHASE_CONFLICT ||
        powerState === NODE_POWER_STATE.BACKFEED ? (
          <WarningIcon className="h-3 w-3" />
        ) : null}
        {powerState}
      </div>
      <div className="mt-1 text-[10px] text-slate-400">
        Sources: {sourceIds.length > 0 ? sourceIds.join(", ") : "None"}
      </div>
      <div className="mt-1 text-[10px] text-slate-400">
        Voltages:{" "}
        {propagatingVoltages.length > 0
          ? propagatingVoltages.map((voltage) => formatVoltageValue(voltage)).join(", ")
          : "None"}
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          data.onToggleSourceOnline?.();
        }}
        className={`nodrag mt-2 w-full rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
          isSourceOnline
            ? "border-rose-300/70 bg-rose-500/20 text-rose-100"
            : "border-lime-300/70 bg-lime-500/20 text-lime-100"
        }`}
      >
        {isSourceOnline ? "Kill Feed" : "Restore Feed"}
      </button>

      <Handle
        id="generator-bus-out"
        type="source"
        position={Position.Bottom}
        isConnectable
        className={`!h-2.5 !rounded-full ${handleClassName}`}
        style={{
          width: "calc(100% - 20px)",
          left: 10,
          transform: "translate(0, 50%)"
        }}
      />
    </div>
  );
}

export default GeneratorNode;
