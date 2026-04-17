import { Handle, Position } from "@xyflow/react";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import InlineLabelEditor from "../components/InlineLabelEditor";
import NodeDeleteButton from "../components/NodeDeleteButton";
import NodePropertiesButton from "../components/NodePropertiesButton";
import { formatTransformerVoltage, formatVoltageValue } from "../electrical/voltage";
import { TRANSFORMER_HANDLE_ID } from "../topology/transformer";

const PRIMARY_TERMINALS = [
  {
    left: "25%",
    targetHandleId: TRANSFORMER_HANDLE_ID.PRIMARY_IN,
    sourceHandleId: TRANSFORMER_HANDLE_ID.PRIMARY_IN_SOURCE
  },
  {
    left: "75%",
    targetHandleId: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET,
    sourceHandleId: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP
  }
];

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

function TransformerIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h5v10H4zM15 7h5v10h-5z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9c1.3 0 1.3 2 2.7 2s1.3-2 2.6-2M9 13c1.3 0 1.3 2 2.7 2s1.3-2 2.6-2"
      />
    </svg>
  );
}

function PTXNode({ data }) {
  const powerState = data.powerState ?? NODE_POWER_STATE.DEAD;
  const sourceIds = data.sourceIds ?? [];
  const propagatingVoltages = data.propagatingVoltages ?? [];

  const shellClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border-purple-500 bg-purple-900/50 shadow-[0_0_0_1px_rgba(192,132,252,0.42),0_0_24px_rgba(126,34,206,0.44)] animate-pulse"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border-red-500 bg-red-900/50 shadow-[0_0_0_1px_rgba(248,113,113,0.45),0_0_20px_rgba(239,68,68,0.45)] animate-pulse"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border-orange-500 bg-orange-950/40 shadow-[0_0_0_1px_rgba(251,146,60,0.3),0_0_16px_rgba(249,115,22,0.35)]"
        : powerState === NODE_POWER_STATE.LIVE
          ? "border-amber-300/90 bg-slate-900 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_20px_rgba(250,204,21,0.35)]"
          : "border-violet-900 bg-slate-900 shadow-lg shadow-slate-950/70";

  const titleClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "text-purple-200"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "text-red-200"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "text-orange-200"
        : powerState === NODE_POWER_STATE.LIVE
          ? "text-amber-200/90"
          : "text-violet-300/80";

  const labelClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "text-purple-100"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "text-red-100"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "text-orange-100"
        : powerState === NODE_POWER_STATE.LIVE
          ? "text-amber-100"
          : "text-violet-100";

  const badgeClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border-purple-400 bg-purple-950/70 text-purple-100"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border-red-400 bg-red-950/70 text-red-100"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border-orange-400 bg-orange-950/70 text-orange-100"
        : powerState === NODE_POWER_STATE.LIVE
          ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
          : "border-violet-700 bg-violet-950/30 text-violet-100";

  const handleClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border border-purple-200 bg-purple-500"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border border-red-200 bg-red-400"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border border-orange-200 bg-orange-400"
        : powerState === NODE_POWER_STATE.LIVE
          ? "border border-amber-100 bg-amber-300"
          : "border border-violet-300/70 bg-violet-500/70";

  const primaryVisibleHandleClassName = `!h-2.5 !w-7 !rounded-full ${handleClassName}`;
  const primaryHiddenTargetHandleClassName =
    "!h-4 !w-9 !rounded-full !border-0 !bg-transparent !opacity-0";

  const primaryBusRailClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "bg-purple-400/85 shadow-[0_0_10px_rgba(168,85,247,0.42)]"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "bg-red-400 shadow-[0_0_10px_rgba(239,68,68,0.45)]"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.38)]"
        : powerState === NODE_POWER_STATE.LIVE
          ? "bg-amber-300 shadow-[0_0_10px_rgba(250,204,21,0.42)]"
          : "bg-violet-500/70";

  return (
    <div className={`relative min-w-60 rounded-md border px-4 pb-3 pt-6 text-left ${shellClassName}`}>
      <div
        className={`pointer-events-none absolute left-2 right-2 top-3 h-1 rounded-full ${primaryBusRailClassName}`}
      />
      {PRIMARY_TERMINALS.map((terminal) => (
        <Handle
          key={`${terminal.targetHandleId}-target`}
          id={terminal.targetHandleId}
          type="target"
          position={Position.Top}
          isConnectable
          className={primaryHiddenTargetHandleClassName}
          style={{
            left: terminal.left,
            top: 0,
            transform: "translate(-50%, -70%)"
          }}
        />
      ))}
      {PRIMARY_TERMINALS.map((terminal) => (
        <Handle
          key={`${terminal.sourceHandleId}-source`}
          id={terminal.sourceHandleId}
          type="source"
          position={Position.Top}
          isConnectable
          className={primaryVisibleHandleClassName}
          style={{
            left: terminal.left,
            top: 0,
            transform: "translate(-50%, -50%)"
          }}
        />
      ))}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <TransformerIcon className={`h-4 w-4 ${titleClassName}`} />
          <div className={`text-[10px] uppercase tracking-[0.2em] ${titleClassName}`}>
            Pad Mount Transformer
          </div>
        </div>
        <div className="flex items-center gap-1.5">
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
          className={`text-sm font-semibold ${labelClassName}`}
          inputClassName={`text-sm font-semibold ${labelClassName}`}
        />
      </div>
      <div className="mt-2 text-xs text-slate-300">
        {formatTransformerVoltage(data.primaryVoltage, data.secondaryVoltage)}
      </div>
      <div className="mt-1 text-[10px] text-slate-500">
        Primary {formatVoltageValue(data.primaryVoltage)} / Secondary{" "}
        {formatVoltageValue(data.secondaryVoltage)}
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
      <Handle
        id={TRANSFORMER_HANDLE_ID.SECONDARY}
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

export default PTXNode;
