import { Handle, Position } from "@xyflow/react";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import InlineLabelEditor from "../components/InlineLabelEditor";
import NodeDeleteButton from "../components/NodeDeleteButton";
import NodePropertiesButton from "../components/NodePropertiesButton";
import { formatVoltageValue } from "../electrical/voltage";
import {
  formatUpsOperatingMode,
  UPS_HANDLE_ID,
  UPS_OPERATING_MODE,
  normalizeUpsOperatingMode
} from "../topology/ups";
import { getNodeShellClassName, NODE_SIZE_FAMILY } from "./nodeLayout";
import {
  AUTOMATION_CONTROL_MODE,
  formatAutomationControlMode,
  normalizeAutomationControlMode
} from "../topology/automationControl";

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

function UpsIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5h12v15H6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.5h6M9 12h6M9 15.5h4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1.5v3m0 15v3" />
    </svg>
  );
}

function formatOptionalNumber(value, suffix = "") {
  return typeof value === "number" && Number.isFinite(value) ? `${value}${suffix}` : "--";
}

function getSenseBadgeClassName(powerState) {
  if (powerState === NODE_POWER_STATE.VOLTAGE_FAULT) {
    return "border-purple-400 bg-purple-950/70 text-purple-100";
  }

  if (powerState === NODE_POWER_STATE.PHASE_CONFLICT) {
    return "border-red-400 bg-red-950/70 text-red-100";
  }

  if (powerState === NODE_POWER_STATE.BACKFEED) {
    return "border-orange-400 bg-orange-950/70 text-orange-100";
  }

  if (powerState === NODE_POWER_STATE.LIVE) {
    return "border-emerald-400/80 bg-emerald-500/15 text-emerald-100";
  }

  return "border-slate-700 bg-slate-950 text-slate-300";
}

function UpsNode({ data }) {
  const powerState = data.powerState ?? NODE_POWER_STATE.DEAD;
  const fedFromLabel = data.fedFromLabel ?? null;
  const propagatingVoltages = data.propagatingVoltages ?? [];
  const operatingMode = normalizeUpsOperatingMode(data.operatingMode);
  const batteryAvailable = data.batteryAvailable !== false;
  const controlMode = normalizeAutomationControlMode(data.controlMode);
  const isAutoMode = controlMode === AUTOMATION_CONTROL_MODE.AUTO;
  const inputSenseState = data.upsSense?.input ?? NODE_POWER_STATE.DEAD;
  const controlModeLabel = formatAutomationControlMode(controlMode);

  const shellClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border-purple-500 bg-purple-900/50 shadow-[0_0_0_1px_rgba(192,132,252,0.42),0_0_24px_rgba(126,34,206,0.44)] animate-pulse"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
        ? "border-red-500 bg-red-900/50 shadow-[0_0_0_1px_rgba(248,113,113,0.45),0_0_20px_rgba(239,68,68,0.45)] animate-pulse"
        : powerState === NODE_POWER_STATE.BACKFEED
          ? "border-orange-500 bg-orange-950/40 shadow-[0_0_0_1px_rgba(251,146,60,0.3),0_0_16px_rgba(249,115,22,0.35)]"
          : powerState === NODE_POWER_STATE.LIVE
            ? "border-amber-300/90 bg-slate-900 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_20px_rgba(250,204,21,0.35)]"
            : "border-cyan-900 bg-slate-900 shadow-lg shadow-slate-950/70";

  const titleClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "text-purple-200"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
        ? "text-red-200"
        : powerState === NODE_POWER_STATE.BACKFEED
          ? "text-orange-200"
          : powerState === NODE_POWER_STATE.LIVE
            ? "text-amber-200/90"
            : "text-cyan-300/85";

  const labelClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "text-purple-100"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
        ? "text-red-100"
        : powerState === NODE_POWER_STATE.BACKFEED
          ? "text-orange-100"
          : powerState === NODE_POWER_STATE.LIVE
            ? "text-amber-100"
            : "text-cyan-100";

  const badgeClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border-purple-400 bg-purple-950/70 text-purple-100"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
        ? "border-red-400 bg-red-950/70 text-red-100"
        : powerState === NODE_POWER_STATE.BACKFEED
          ? "border-orange-400 bg-orange-950/70 text-orange-100"
          : powerState === NODE_POWER_STATE.LIVE
            ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
            : "border-cyan-700 bg-cyan-950/30 text-cyan-100";

  const busHandleClassName =
    powerState === NODE_POWER_STATE.VOLTAGE_FAULT
      ? "border border-purple-200 bg-purple-500"
      : powerState === NODE_POWER_STATE.PHASE_CONFLICT
        ? "border border-red-200 bg-red-400"
        : powerState === NODE_POWER_STATE.BACKFEED
          ? "border border-orange-200 bg-orange-400"
          : powerState === NODE_POWER_STATE.LIVE
            ? "border border-amber-100 bg-amber-300"
            : "border border-cyan-300/70 bg-cyan-500/70";

  const operatingModeLabel = formatUpsOperatingMode(operatingMode);

  function getModeButtonClassName(mode) {
    return operatingMode === mode
      ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
      : "border-slate-700 bg-slate-950 text-slate-400";
  }

  function getControlModeButtonClassName(isSelected) {
    return isSelected
      ? "border-cyan-300/80 bg-cyan-500/15 text-cyan-100"
      : "border-slate-700 bg-slate-950 text-slate-400";
  }

  function handleModeClick(event, nextOperatingMode) {
    event.preventDefault();
    event.stopPropagation();
    data.onChangeOperatingMode?.(nextOperatingMode);
  }

  function handleControlModeClick(event, nextControlMode) {
    event.preventDefault();
    event.stopPropagation();
    data.onChangeControlMode?.(nextControlMode);
  }

  return (
    <div
      className={`${getNodeShellClassName(NODE_SIZE_FAMILY.COMPLEX)} rounded-md border px-4 py-4 text-left ${shellClassName}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <UpsIcon className={`h-4 w-4 ${titleClassName}`} />
          <div className={`text-[10px] uppercase tracking-[0.2em] ${titleClassName}`}>UPS</div>
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
      <div className="mt-2 text-xs text-slate-300">{data.upsClass ?? "Double Conversion UPS"}</div>
      <div className="mt-1 text-[10px] text-slate-500">{formatVoltageValue(data.nominalVoltage)}</div>

      <div className="mt-3 rounded border border-slate-800 bg-slate-950/80 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
            Control Mode
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">
            {controlModeLabel}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(event) => {
              handleControlModeClick(event, AUTOMATION_CONTROL_MODE.MANUAL);
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            className={`nodrag rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${getControlModeButtonClassName(
              !isAutoMode
            )}`}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={(event) => {
              handleControlModeClick(event, AUTOMATION_CONTROL_MODE.AUTO);
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            className={`nodrag rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${getControlModeButtonClassName(
              isAutoMode
            )}`}
          >
            Auto
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
            Operating Mode
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">
            {operatingModeLabel}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={isAutoMode}
            onClick={(event) => {
              handleModeClick(event, UPS_OPERATING_MODE.NORMAL);
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            className={`nodrag rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
              isAutoMode
                ? "cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600"
                : getModeButtonClassName(UPS_OPERATING_MODE.NORMAL)
            }`}
          >
            Normal
          </button>
          <button
            type="button"
            disabled={isAutoMode}
            onClick={(event) => {
              handleModeClick(event, UPS_OPERATING_MODE.BATTERY);
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            className={`nodrag rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
              isAutoMode
                ? "cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600"
                : getModeButtonClassName(UPS_OPERATING_MODE.BATTERY)
            }`}
          >
            Battery
          </button>
          <button
            type="button"
            disabled={isAutoMode}
            onClick={(event) => {
              handleModeClick(event, UPS_OPERATING_MODE.BYPASS);
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            className={`nodrag rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
              isAutoMode
                ? "cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600"
                : getModeButtonClassName(UPS_OPERATING_MODE.BYPASS)
            }`}
          >
            Bypass
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.14em]">
          <div className="rounded border border-slate-800 bg-slate-900/80 px-2 py-2">
            <div className="text-slate-500">Line Sense</div>
            <div
              className={`mt-2 inline-flex rounded border px-2 py-1 ${getSenseBadgeClassName(
                inputSenseState
              )}`}
            >
              {inputSenseState}
            </div>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/80 px-2 py-2">
            <div className="text-slate-500">Battery</div>
            <div className={batteryAvailable ? "mt-1 text-emerald-200" : "mt-1 text-rose-200"}>
              {batteryAvailable ? "Available" : "Unavailable"}
            </div>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/80 px-2 py-2">
            <div className="text-slate-500">Runtime</div>
            <div className="mt-1 text-slate-200">
              {formatOptionalNumber(data.batteryRuntimeMinutes, " min")}
            </div>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/80 px-2 py-2">
            <div className="text-slate-500">kVA</div>
            <div className="mt-1 text-slate-200">{formatOptionalNumber(data.kvaRating)}</div>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/80 px-2 py-2">
            <div className="text-slate-500">Rated Amps</div>
            <div className="mt-1 text-slate-200">
              {formatOptionalNumber(data.ratedCurrentAmps, " A")}
            </div>
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
        Fed From: {fedFromLabel ?? "None"}
      </div>
      <div className="mt-1 text-[10px] text-slate-400">
        Voltages:{" "}
        {propagatingVoltages.length > 0
          ? propagatingVoltages.map((voltage) => formatVoltageValue(voltage)).join(", ")
          : "None"}
      </div>

      <Handle
        id={UPS_HANDLE_ID.INPUT}
        type="target"
        position={Position.Top}
        isConnectable
        className={`!h-2.5 !rounded-full ${busHandleClassName}`}
        style={{
          width: "calc(100% - 20px)",
          left: 10,
          transform: "translate(0, -50%)"
        }}
      />
      <Handle
        id={UPS_HANDLE_ID.OUTPUT}
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

export default UpsNode;
