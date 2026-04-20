import { Handle, Position } from "@xyflow/react";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import InlineLabelEditor from "../components/InlineLabelEditor";
import NodeDeleteButton from "../components/NodeDeleteButton";
import NodePropertiesButton from "../components/NodePropertiesButton";
import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_HANDLE_ID,
  formatTransferSwitchActiveSource,
  normalizeTransferSwitchActiveSource
} from "../topology/transferSwitch";
import { formatVoltageValue } from "../electrical/voltage";
import { getNodeShellClassName, NODE_SIZE_FAMILY } from "./nodeLayout";

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

function TransferIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v10H4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8m-2.5-2.5 2.5 2.5-2.5 2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 10.5v3m10-3v3" />
    </svg>
  );
}

function TransferSwitchNode({ data }) {
  const powerState = data.powerState ?? NODE_POWER_STATE.DEAD;
  const displaySourceLabels = data.displaySourceLabels ?? [];
  const propagatingVoltages = data.propagatingVoltages ?? [];
  const activeSource = normalizeTransferSwitchActiveSource(data.activeSource);
  const isPrimaryActive =
    activeSource === TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY;
  const isEmergencyActive =
    activeSource === TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY;

  const shellClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border-purple-500 bg-purple-900/50 shadow-[0_0_0_1px_rgba(192,132,252,0.42),0_0_24px_rgba(126,34,206,0.44)] animate-pulse"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border-red-500 bg-red-900/50 shadow-[0_0_0_1px_rgba(248,113,113,0.45),0_0_20px_rgba(239,68,68,0.45)] animate-pulse"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border-orange-500 bg-orange-950/40 shadow-[0_0_0_1px_rgba(251,146,60,0.3),0_0_16px_rgba(249,115,22,0.35)]"
        : powerState === NODE_POWER_STATE.LIVE
          ? "border-amber-300/90 bg-slate-900 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_20px_rgba(250,204,21,0.35)]"
          : "border-indigo-900 bg-slate-900 shadow-lg shadow-slate-950/70";

  const titleClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "text-purple-200"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "text-red-200"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "text-orange-200"
        : powerState === NODE_POWER_STATE.LIVE
          ? "text-amber-200/90"
          : "text-indigo-300/80";

  const labelClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "text-purple-100"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "text-red-100"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "text-orange-100"
        : powerState === NODE_POWER_STATE.LIVE
          ? "text-amber-100"
          : "text-indigo-100";

  const badgeClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border-purple-400 bg-purple-950/70 text-purple-100"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border-red-400 bg-red-950/70 text-red-100"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border-orange-400 bg-orange-950/70 text-orange-100"
        : powerState === NODE_POWER_STATE.LIVE
          ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
          : "border-indigo-700 bg-indigo-950/30 text-indigo-100";

  const busHandleClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border border-purple-200 bg-purple-500"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "border border-red-200 bg-red-400"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "border border-orange-200 bg-orange-400"
        : powerState === NODE_POWER_STATE.LIVE
          ? "border border-amber-100 bg-amber-300"
          : "border border-indigo-300/70 bg-indigo-500/70";

  const activeConductorClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.45)]"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
      ? "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.45)]"
      : powerState === NODE_POWER_STATE.BACKFEED
        ? "bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.4)]"
        : powerState === NODE_POWER_STATE.LIVE
          ? "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.45)]"
          : "bg-indigo-400/80";

  const inactiveConductorClassName = "bg-slate-700/80";
  const inactiveInputHandleClassName = "border border-slate-700 bg-slate-800";

  const primaryButtonClassName = isPrimaryActive
    ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
    : "border-slate-700 bg-slate-950 text-slate-400";

  const emergencyButtonClassName = isEmergencyActive
    ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
    : "border-slate-700 bg-slate-950 text-slate-400";

  const activeSourceLabel = formatTransferSwitchActiveSource(activeSource);

  function handleActiveSourceClick(event, nextActiveSource) {
    event.preventDefault();
    event.stopPropagation();
    data.onChangeActiveSource?.(nextActiveSource);
  }

  return (
    <div
      className={`${getNodeShellClassName(NODE_SIZE_FAMILY.COMPLEX)} rounded-md border px-4 py-4 text-left ${shellClassName}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <TransferIcon className={`h-4 w-4 ${titleClassName}`} />
          <div className={`text-[10px] uppercase tracking-[0.2em] ${titleClassName}`}>
            Transfer Switch
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
      <div className="mt-2 text-xs text-slate-300">{data.switchClass ?? "ATS / STS"}</div>
      <div className="mt-1 text-[10px] text-slate-500">
        {formatVoltageValue(data.nominalVoltage)}
      </div>
      <div className="mt-3 rounded border border-slate-800 bg-slate-950/80 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
            Active Source
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">
            {activeSourceLabel}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(event) => {
              handleActiveSourceClick(
                event,
                TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
              );
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            className={`nodrag rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${primaryButtonClassName}`}
          >
            Primary
          </button>
          <button
            type="button"
            onClick={(event) => {
              handleActiveSourceClick(
                event,
                TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
              );
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            className={`nodrag rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${emergencyButtonClassName}`}
          >
            Emergency
          </button>
        </div>
        <div className="relative mt-3 h-14">
          <div
            className={`absolute left-[25%] top-0 h-5 w-1 -translate-x-1/2 rounded-full ${
              isPrimaryActive
                ? activeConductorClassName
                : inactiveConductorClassName
            }`}
          />
          <div
            className={`absolute left-[75%] top-0 h-5 w-1 -translate-x-1/2 rounded-full ${
              isEmergencyActive
                ? activeConductorClassName
                : inactiveConductorClassName
            }`}
          />
          <div
            className={`absolute left-[25%] top-5 h-1 w-[25%] rounded-full ${
              isPrimaryActive
                ? activeConductorClassName
                : inactiveConductorClassName
            }`}
          />
          <div
            className={`absolute left-1/2 top-5 h-1 w-[25%] rounded-full ${
              isEmergencyActive
                ? activeConductorClassName
                : inactiveConductorClassName
            }`}
          />
          <div
            className={`absolute left-1/2 top-5 h-7 w-1 -translate-x-1/2 rounded-full ${activeConductorClassName}`}
          />
          <div
            className={`absolute bottom-0 left-1/2 h-1 w-[72%] -translate-x-1/2 rounded-full ${activeConductorClassName}`}
          />
          <div className="absolute left-[25%] top-0 -translate-x-1/2 text-[9px] uppercase tracking-[0.18em] text-slate-500">
            P
          </div>
          <div className="absolute left-[75%] top-0 -translate-x-1/2 text-[9px] uppercase tracking-[0.18em] text-slate-500">
            E
          </div>
        </div>
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
        Sources: {displaySourceLabels.length > 0 ? displaySourceLabels.join(", ") : "None"}
      </div>
      <div className="mt-1 text-[10px] text-slate-400">
        Voltages:{" "}
        {propagatingVoltages.length > 0
          ? propagatingVoltages.map((voltage) => formatVoltageValue(voltage)).join(", ")
          : "None"}
      </div>

      <Handle
        id={TRANSFER_SWITCH_HANDLE_ID.PRIMARY}
        type="target"
        position={Position.Top}
        isConnectable
        className={`!h-2.5 !w-6 !rounded-full ${
          isPrimaryActive ? busHandleClassName : inactiveInputHandleClassName
        }`}
        style={{
          left: "25%",
          transform: "translate(-50%, -50%)"
        }}
      />
      <Handle
        id={TRANSFER_SWITCH_HANDLE_ID.EMERGENCY}
        type="target"
        position={Position.Top}
        isConnectable
        className={`!h-2.5 !w-6 !rounded-full ${
          isEmergencyActive ? busHandleClassName : inactiveInputHandleClassName
        }`}
        style={{
          left: "75%",
          transform: "translate(-50%, -50%)"
        }}
      />
      <Handle
        id={TRANSFER_SWITCH_HANDLE_ID.OUTPUT}
        type="source"
        position={Position.Bottom}
        isConnectable
        className={`!h-2.5 !rounded-full ${busHandleClassName}`}
        style={{
          width: "calc(100% - 20px)",
          left: 10,
          transform: "translate(0, 50%)"
        }}
      />
    </div>
  );
}

export default TransferSwitchNode;
