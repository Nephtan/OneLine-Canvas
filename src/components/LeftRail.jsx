import { useMemo, useState } from "react";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import { BREAKER_STATE } from "../engine/protectionModel";
import { isSourceNodeType, normalizeNodeData } from "../nodes/nodeData";
import { EDGE_TYPE } from "../topology/edgeTypes";
import {
  formatUpsOperatingMode,
  isUpsNodeType,
  UPS_OPERATING_MODE
} from "../topology/ups";

const DRAG_MIME_TYPE = "application/x-oneline-equipment";

const LEFT_RAIL_TAB = {
  BUILD: "build",
  OPERATE: "operate",
  DIAGNOSTICS: "diagnostics"
};

const TAB_OPTIONS = [
  {
    id: LEFT_RAIL_TAB.BUILD,
    label: "Build"
  },
  {
    id: LEFT_RAIL_TAB.OPERATE,
    label: "Operate"
  },
  {
    id: LEFT_RAIL_TAB.DIAGNOSTICS,
    label: "Diagnostics"
  }
];

const EQUIPMENT_OPTIONS = [
  {
    type: "generator",
    label: "Generator",
    description: "480 V standby source",
    borderClassName: "border-lime-500/60",
    titleClassName: "text-lime-300/85",
    bodyClassName: "text-lime-100"
  },
  {
    type: "utility",
    label: "Utility Feed",
    description: "12.47 kV source",
    borderClassName: "border-emerald-500/60",
    titleClassName: "text-emerald-300/80",
    bodyClassName: "text-emerald-100"
  },
  {
    type: "switchboard",
    label: "Switchboard",
    description: "MDB / UPS distribution",
    borderClassName: "border-slate-500/70",
    titleClassName: "text-slate-200",
    bodyClassName: "text-slate-100"
  },
  {
    type: "transferSwitch",
    label: "Transfer Switch",
    description: "ATS / STS",
    borderClassName: "border-indigo-500/60",
    titleClassName: "text-indigo-300/85",
    bodyClassName: "text-indigo-100"
  },
  {
    type: "ups",
    label: "UPS",
    description: "Critical power UPS",
    borderClassName: "border-cyan-500/60",
    titleClassName: "text-cyan-300/85",
    bodyClassName: "text-cyan-100"
  },
  {
    type: "mvsg",
    label: "MVSG",
    description: "Medium-voltage switchgear",
    borderClassName: "border-sky-500/60",
    titleClassName: "text-sky-300/80",
    bodyClassName: "text-sky-100"
  },
  {
    type: "ptx",
    label: "PTX",
    description: "Pad-mount transformer",
    borderClassName: "border-violet-500/60",
    titleClassName: "text-violet-300/80",
    bodyClassName: "text-violet-100"
  },
  {
    type: "mechanical",
    label: "Mechanical",
    description: "CRAH / Fan Coil Wall",
    borderClassName: "border-cyan-500/70",
    titleClassName: "text-cyan-300/85",
    bodyClassName: "text-cyan-100"
  },
  {
    type: "load",
    label: "Load",
    description: "Data hall / cooling plant",
    borderClassName: "border-cyan-500/60",
    titleClassName: "text-cyan-300/80",
    bodyClassName: "text-cyan-100"
  }
];

const SOURCE_TYPE_LABEL = {
  utility: "UTILITY",
  generator: "GEN"
};

const VALIDATION_SOURCE_LABEL = {
  live: "LIVE",
  import: "IMPORT",
  storage: "STORAGE"
};

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

function SectionCard({ eyebrow, title, description, children, actions }) {
  return (
    <section className="rounded border border-slate-700 bg-slate-900">
      <div className="border-b border-slate-700 bg-slate-950/95 px-3 py-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
              {eyebrow}
            </div>
            {title ? <div className="mt-1 text-xs text-slate-100">{title}</div> : null}
            {description ? (
              <div className="mt-1 text-[11px] text-slate-400">{description}</div>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

function SummaryMetric({ label, value, toneClassName }) {
  return (
    <div className="rounded border border-slate-700 bg-slate-950 px-2 py-2">
      <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-1 text-sm ${toneClassName}`}>{value}</div>
    </div>
  );
}

function RailTabButton({ isActive, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors ${
        isActive
          ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-100"
          : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function EquipmentButton({ equipment, onDragStart }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => onDragStart(event, equipment.type)}
      className={`w-full cursor-grab rounded border bg-slate-800 px-3 py-2 text-left active:cursor-grabbing ${equipment.borderClassName}`}
    >
      <div
        className={`truncate text-[10px] uppercase tracking-[0.18em] ${equipment.titleClassName}`}
      >
        {equipment.label}
      </div>
      <div className={`mt-1 text-[11px] ${equipment.bodyClassName}`}>
        {equipment.description}
      </div>
    </button>
  );
}

function getTypeBadgeClassName(nodeType) {
  if (nodeType === "utility") {
    return "border-emerald-300/60 bg-emerald-500/10 text-emerald-200";
  }

  return "border-lime-300/60 bg-lime-500/10 text-lime-200";
}

function getPowerStateBadgeClassName(powerState) {
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
    return "border-amber-300/80 bg-amber-400/15 text-amber-100";
  }

  return "border-slate-600 bg-slate-900/90 text-slate-300";
}

function getFaultStatusBadgeClassName(status) {
  if (status === "active") {
    return "border-red-400 bg-red-950/70 text-red-100";
  }

  if (status === "unprotected") {
    return "border-orange-400 bg-orange-950/70 text-orange-100";
  }

  return "border-slate-600 bg-slate-900/90 text-slate-300";
}

function getValidationSourceBadgeClassName(source) {
  if (source === "storage") {
    return "border-amber-400/70 bg-amber-500/10 text-amber-100";
  }

  if (source === "import") {
    return "border-cyan-400/70 bg-cyan-500/10 text-cyan-100";
  }

  return "border-rose-400/70 bg-rose-500/10 text-rose-100";
}

function getValidationSeverityBadgeClassName(severity) {
  if (severity === "error") {
    return "border-rose-400/70 bg-rose-500/10 text-rose-100";
  }

  return "border-slate-600 bg-slate-900/90 text-slate-300";
}

function formatValidationIssueContextLabel(issue, nodeLabelById, edgeLabelById) {
  const labels = [];

  (issue.nodeIds ?? []).forEach((nodeId) => {
    if (!nodeLabelById.has(nodeId)) {
      return;
    }

    labels.push(nodeLabelById.get(nodeId) ?? nodeId);
  });

  (issue.edgeIds ?? []).forEach((edgeId) => {
    if (!edgeLabelById.has(edgeId)) {
      return;
    }

    labels.push(edgeLabelById.get(edgeId) ?? edgeId);
  });

  if (labels.length === 0) {
    return issue.path || "Topology Contract";
  }

  return labels.slice(0, 2).join(" / ");
}

function canFocusValidationIssue(issue, nodeLabelById, edgeLabelById) {
  return (
    (issue.nodeIds ?? []).some((nodeId) => nodeLabelById.has(nodeId)) ||
    (issue.edgeIds ?? []).some((edgeId) => edgeLabelById.has(edgeId))
  );
}

function BuildTabContent({
  onDragStart,
  onSaveToFile,
  onLoadFromFile,
  onClearYard,
  edgeDrawMode,
  onChangeEdgeDrawMode
}) {
  return (
    <div className="space-y-3">
      <SectionCard
        eyebrow="Build Controls"
        title="Connection tool and yard I/O stay in the first view so operators can build without hunting."
      >
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Connection Tool
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onChangeEdgeDrawMode?.(EDGE_TYPE.BREAKER);
                }}
                className={`rounded border px-2 py-2 text-[10px] uppercase tracking-[0.16em] ${
                  edgeDrawMode === EDGE_TYPE.BREAKER
                    ? "border-amber-300/80 bg-slate-700 text-amber-100 shadow-[0_0_0_1px_rgba(250,204,21,0.22)]"
                    : "border-slate-600 bg-slate-900 text-slate-300"
                }`}
              >
                -/o- Breaker
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeEdgeDrawMode?.(EDGE_TYPE.STANDARD);
                }}
                className={`rounded border px-2 py-2 text-[10px] uppercase tracking-[0.16em] ${
                  edgeDrawMode === EDGE_TYPE.STANDARD
                    ? "border-cyan-300/80 bg-slate-700 text-cyan-100 shadow-[0_0_0_1px_rgba(103,232,249,0.2)]"
                    : "border-slate-600 bg-slate-900 text-slate-300"
                }`}
              >
                --- Solid Wire
              </button>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Topology I/O
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSaveToFile}
                className="rounded border border-slate-500 bg-slate-800 px-2 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-100"
              >
                Save to File
              </button>
              <button
                type="button"
                onClick={onLoadFromFile}
                className="rounded border border-slate-500 bg-slate-800 px-2 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-100"
              >
                Load from File
              </button>
              <button
                type="button"
                onClick={onClearYard}
                className="col-span-2 inline-flex items-center justify-center gap-1 rounded border border-red-500 bg-red-950/60 px-2 py-2 text-[10px] uppercase tracking-[0.16em] text-red-100"
              >
                <WarningIcon className="h-3 w-3" />
                Clear Yard
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Equipment Palette"
        title="Drop live gear into the yard from a denser two-column grid."
      >
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map((equipment) => (
            <EquipmentButton
              key={equipment.type}
              equipment={equipment}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function SourceControlSection({ sourceRows, onToggleSourceOnline }) {
  return (
    <SectionCard
      eyebrow="Source Telemetry"
      title="Root feeds stay grouped as cards so the single rail can stay narrow without clipping."
    >
      {sourceRows.length === 0 ? (
        <div className="text-xs text-slate-500">
          No Utility or Generator sources are deployed on the yard.
        </div>
      ) : (
        <div className="space-y-2">
          {sourceRows.map((sourceRow) => (
            <div
              key={sourceRow.id}
              className="rounded border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] ${getTypeBadgeClassName(
                        sourceRow.type
                      )}`}
                    >
                      {SOURCE_TYPE_LABEL[sourceRow.type] ?? sourceRow.type}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-[0.16em] ${
                        sourceRow.isSourceOnline ? "text-emerald-300/80" : "text-slate-500"
                      }`}
                    >
                      {sourceRow.isSourceOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="mt-2 truncate text-xs text-slate-100">{sourceRow.label}</div>
                  <div className="mt-1 truncate text-[10px] text-slate-500">{sourceRow.id}</div>
                </div>
                <div
                  className={`inline-flex shrink-0 rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${getPowerStateBadgeClassName(
                    sourceRow.powerState
                  )}`}
                >
                  {sourceRow.powerState}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Sync Group
                  </div>
                  <div className="mt-1 truncate rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200">
                    {sourceRow.syncGroup || "--"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onToggleSourceOnline?.(sourceRow.id);
                  }}
                  className={`rounded border px-2 py-2 text-[10px] uppercase tracking-[0.16em] ${
                    sourceRow.isSourceOnline
                      ? "border-rose-300/70 bg-rose-500/20 text-rose-100"
                      : "border-emerald-300/70 bg-emerald-500/20 text-emerald-100"
                  }`}
                >
                  {sourceRow.isSourceOnline ? "Kill Feed" : "Restore Feed"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function UpsControlSection({ upsRows, onChangeUpsOperatingMode }) {
  return (
    <SectionCard
      eyebrow="UPS Lineup"
      title="Critical-power devices keep their live mode throws and battery visibility in the operate tab."
    >
      {upsRows.length === 0 ? (
        <div className="text-xs text-slate-500">
          No UPS systems are deployed on the yard.
        </div>
      ) : (
        <div className="space-y-2">
          {upsRows.map((upsRow) => (
            <div
              key={upsRow.id}
              className="rounded border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs text-slate-100">{upsRow.label}</div>
                  <div className="mt-1 truncate text-[10px] text-slate-500">{upsRow.id}</div>
                </div>
                <div
                  className={`inline-flex shrink-0 rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${getPowerStateBadgeClassName(
                    upsRow.powerState
                  )}`}
                >
                  {upsRow.powerState}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em]">
                <div className="text-slate-500">
                  Mode: <span className="text-slate-200">{formatUpsOperatingMode(upsRow.operatingMode)}</span>
                </div>
                <div className={upsRow.batteryAvailable ? "text-emerald-300" : "text-rose-300"}>
                  {upsRow.batteryAvailable ? "Battery Ready" : "Battery Unavailable"}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChangeUpsOperatingMode?.(upsRow.id, UPS_OPERATING_MODE.NORMAL);
                  }}
                  className={`rounded border px-2 py-2 text-[10px] uppercase tracking-[0.14em] ${
                    upsRow.operatingMode === UPS_OPERATING_MODE.NORMAL
                      ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangeUpsOperatingMode?.(upsRow.id, UPS_OPERATING_MODE.BATTERY);
                  }}
                  className={`rounded border px-2 py-2 text-[10px] uppercase tracking-[0.14em] ${
                    upsRow.operatingMode === UPS_OPERATING_MODE.BATTERY
                      ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                  }`}
                >
                  Battery
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangeUpsOperatingMode?.(upsRow.id, UPS_OPERATING_MODE.BYPASS);
                  }}
                  className={`rounded border px-2 py-2 text-[10px] uppercase tracking-[0.14em] ${
                    upsRow.operatingMode === UPS_OPERATING_MODE.BYPASS
                      ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                  }`}
                >
                  Bypass
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function BreakerResetSection({ trippedBreakerCount, onResetAllBreakers }) {
  return (
    <SectionCard
      eyebrow="Protection Reset"
      title="Mechanical breaker reset stays available without consuming a dedicated full-height panel."
    >
      <button
        type="button"
        onClick={onResetAllBreakers}
        disabled={trippedBreakerCount === 0}
        className={`w-full rounded border px-2 py-2 text-[10px] uppercase tracking-[0.2em] ${
          trippedBreakerCount > 0
            ? "border-red-400 bg-red-950/70 text-red-100"
            : "cursor-not-allowed border-slate-700 bg-slate-900 text-slate-500"
        }`}
      >
        Reset All Breakers
      </button>
      <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
        Tripped breakers: {trippedBreakerCount}
      </div>
    </SectionCard>
  );
}

function MopRecorderSection({
  hasMopBaseSnapshot,
  isRecordingMop,
  mopSteps,
  mopPlaybackIndex,
  onToggleMopRecording,
  onMopReset,
  onMopStepBack,
  onMopStepForward
}) {
  return (
    <SectionCard
      eyebrow="MOP Recorder"
      title="Recording and playback stay in the operate tab but now live in the same scroll region as the rest of SCADA."
      actions={
        <button
          type="button"
          onClick={onToggleMopRecording}
          className={`rounded border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
            isRecordingMop
              ? "border-red-400 bg-red-950/70 text-red-100"
              : "border-slate-500 bg-slate-800 text-slate-100"
          }`}
        >
          {isRecordingMop ? "Stop Recording" : "Record MOP"}
        </button>
      }
    >
      {isRecordingMop ? (
        <div className="rounded border border-red-500/60 bg-red-950/40 px-2 py-2 text-[10px] text-red-100">
          Live actions are being captured as post-settle keyframes.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onMopReset}
              disabled={!hasMopBaseSnapshot || mopPlaybackIndex === 0}
              className={`rounded border px-2 py-2 text-[10px] uppercase tracking-[0.16em] ${
                hasMopBaseSnapshot && mopPlaybackIndex > 0
                  ? "border-slate-500 bg-slate-800 text-slate-100"
                  : "cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600"
              }`}
            >
              |&lt; Reset
            </button>
            <button
              type="button"
              onClick={onMopStepBack}
              disabled={mopPlaybackIndex === 0}
              className={`rounded border px-2 py-2 text-[10px] uppercase tracking-[0.16em] ${
                mopPlaybackIndex > 0
                  ? "border-slate-500 bg-slate-800 text-slate-100"
                  : "cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600"
              }`}
            >
              &lt; Step Back
            </button>
            <button
              type="button"
              onClick={onMopStepForward}
              disabled={mopPlaybackIndex >= mopSteps.length}
              className={`rounded border px-2 py-2 text-[10px] uppercase tracking-[0.16em] ${
                mopPlaybackIndex < mopSteps.length
                  ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-100"
                  : "cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600"
              }`}
            >
              Step Forward &gt;
            </button>
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Position: {mopPlaybackIndex}/{mopSteps.length}
          </div>
          <div className="mt-2 space-y-1">
            {mopSteps.length === 0 ? (
              <div className="rounded border border-slate-800 bg-slate-950/80 px-3 py-3 text-xs text-slate-500">
                No recorded MOP steps. Toggle Record MOP to start a scenario.
              </div>
            ) : (
              mopSteps.map((mopStep, stepIndex) => {
                const isApplied = stepIndex < mopPlaybackIndex;
                const isNext = stepIndex === mopPlaybackIndex;

                return (
                  <div
                    key={`${mopStep.targetId}-${stepIndex}`}
                    className={`rounded border px-2 py-2 text-xs ${
                      isApplied
                        ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-100"
                        : isNext
                          ? "border-amber-400/60 bg-amber-500/10 text-amber-100"
                          : "border-slate-800 bg-slate-950 text-slate-300"
                    }`}
                  >
                    {stepIndex + 1}. {mopStep.actionText}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </SectionCard>
  );
}

function OperateTabContent({
  sourceRows,
  upsRows,
  trippedBreakerCount,
  onToggleSourceOnline,
  onChangeUpsOperatingMode,
  onResetAllBreakers,
  hasMopBaseSnapshot,
  isRecordingMop,
  mopSteps,
  mopPlaybackIndex,
  onToggleMopRecording,
  onMopReset,
  onMopStepBack,
  onMopStepForward
}) {
  return (
    <div className="space-y-3">
      <SourceControlSection
        sourceRows={sourceRows}
        onToggleSourceOnline={onToggleSourceOnline}
      />
      <UpsControlSection
        upsRows={upsRows}
        onChangeUpsOperatingMode={onChangeUpsOperatingMode}
      />
      <BreakerResetSection
        trippedBreakerCount={trippedBreakerCount}
        onResetAllBreakers={onResetAllBreakers}
      />
      <MopRecorderSection
        hasMopBaseSnapshot={hasMopBaseSnapshot}
        isRecordingMop={isRecordingMop}
        mopSteps={mopSteps}
        mopPlaybackIndex={mopPlaybackIndex}
        onToggleMopRecording={onToggleMopRecording}
        onMopReset={onMopReset}
        onMopStepBack={onMopStepBack}
        onMopStepForward={onMopStepForward}
      />
    </div>
  );
}

function FaultDeskSection({ faultRows, protectionTripEdgeIds }) {
  const activeFaultCount = faultRows.filter((faultRow) => faultRow.status === "active").length;

  return (
    <SectionCard
      eyebrow="Protection Desk"
      title="Active faults and selected clearing devices now live in the diagnostics tab."
    >
      <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.16em]">
        <div className="rounded border border-slate-700 bg-slate-950 px-2 py-2">
          <div className="text-slate-500">Faults</div>
          <div className="mt-1 text-base text-red-100">{faultRows.length}</div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-950 px-2 py-2">
          <div className="text-slate-500">Trip Plan</div>
          <div className="mt-1 text-base text-amber-100">
            {protectionTripEdgeIds?.length ?? 0}
          </div>
        </div>
      </div>

      {faultRows.length === 0 ? (
        <div className="mt-3 text-xs text-slate-500">
          No active or isolated faults are present on the yard.
        </div>
      ) : (
        <div className="mt-3">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Active faults: {activeFaultCount}
          </div>
          <div className="space-y-2">
            {faultRows.map((faultRow) => (
              <div
                key={faultRow.id}
                className="rounded border border-slate-800 bg-slate-950/80 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs text-slate-100">{faultRow.label}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      {faultRow.summary}
                    </div>
                  </div>
                  <div
                    className={`inline-flex rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${getFaultStatusBadgeClassName(
                      faultRow.status
                    )}`}
                  >
                    {faultRow.status}
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-400">
                  Sources: {faultRow.sourceCount}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  Clearing Devices:{" "}
                  {faultRow.clearingLabels.length > 0
                    ? faultRow.clearingLabels.join(", ")
                    : "None"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function ValidationSection({
  currentValidationIssues,
  latestRejectedValidationReport,
  rejectedValidationIssues,
  isPersistenceBlocked,
  nodeLabelById,
  edgeLabelById,
  onFocusValidationIssue
}) {
  const rejectedValidationLabel =
    latestRejectedValidationReport?.label ?? "Rejected Import / Load";

  return (
    <SectionCard
      eyebrow="Validation"
      title="Live topology issues stay separate from the latest rejected import or storage payload."
      actions={
        <div
          className={`inline-flex rounded border px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${
            isPersistenceBlocked
              ? "border-rose-400/70 bg-rose-500/10 text-rose-100"
              : "border-emerald-400/70 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {isPersistenceBlocked ? "Persistence Blocked" : "Persistence Clear"}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.16em]">
        <div className="rounded border border-slate-700 bg-slate-950 px-2 py-2">
          <div className="text-slate-500">Current Yard</div>
          <div className="mt-1 text-base text-rose-100">{currentValidationIssues.length}</div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-950 px-2 py-2">
          <div className="text-slate-500">Rejected I/O</div>
          <div className="mt-1 text-base text-amber-100">{rejectedValidationIssues.length}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
          Current Yard
        </div>
        {currentValidationIssues.length === 0 ? (
          <div className="rounded border border-slate-800 bg-slate-950/80 px-3 py-3 text-xs text-slate-500">
            No blocking live topology issues are active on the yard.
          </div>
        ) : (
          <div className="space-y-2">
            {currentValidationIssues.map((issue, issueIndex) => {
              const focusable = canFocusValidationIssue(issue, nodeLabelById, edgeLabelById);

              return (
                <button
                  key={`live-${issue.path}-${issueIndex}`}
                  type="button"
                  disabled={!focusable}
                  onClick={() => {
                    onFocusValidationIssue?.(issue);
                  }}
                  className={`w-full rounded border px-3 py-2 text-left ${
                    focusable
                      ? "border-rose-500/50 bg-rose-950/20 hover:border-rose-400/80 hover:bg-rose-950/35"
                      : "cursor-not-allowed border-slate-800 bg-slate-950/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs text-slate-100">
                        {formatValidationIssueContextLabel(issue, nodeLabelById, edgeLabelById)}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">{issue.message}</div>
                    </div>
                    <div
                      className={`inline-flex shrink-0 rounded border px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${getValidationSeverityBadgeClassName(
                        issue.severity
                      )}`}
                    >
                      {issue.severity}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                    <div className="truncate text-slate-500">
                      {issue.path || "Topology Contract"}
                    </div>
                    <div className="text-slate-500">
                      {focusable ? "Focus on canvas" : "No active target"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-slate-800 pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
            {rejectedValidationLabel}
          </div>
          {latestRejectedValidationReport ? (
            <div
              className={`inline-flex rounded border px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${getValidationSourceBadgeClassName(
                latestRejectedValidationReport.source
              )}`}
            >
              {VALIDATION_SOURCE_LABEL[latestRejectedValidationReport.source] ??
                latestRejectedValidationReport.source}
            </div>
          ) : null}
        </div>

        {rejectedValidationIssues.length === 0 ? (
          <div className="rounded border border-slate-800 bg-slate-950/80 px-3 py-3 text-xs text-slate-500">
            No rejected import or storage payloads have been recorded this session.
          </div>
        ) : (
          <div className="space-y-2">
            {rejectedValidationIssues.map((issue, issueIndex) => {
              const focusable = canFocusValidationIssue(issue, nodeLabelById, edgeLabelById);

              return (
                <button
                  key={`rejected-${issue.path}-${issueIndex}`}
                  type="button"
                  disabled={!focusable}
                  onClick={() => {
                    onFocusValidationIssue?.(issue);
                  }}
                  className={`w-full rounded border px-3 py-2 text-left ${
                    focusable
                      ? "border-amber-500/50 bg-amber-950/15 hover:border-amber-400/80 hover:bg-amber-950/30"
                      : "cursor-not-allowed border-slate-800 bg-slate-950/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs text-slate-100">
                        {formatValidationIssueContextLabel(issue, nodeLabelById, edgeLabelById)}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">{issue.message}</div>
                    </div>
                    <div
                      className={`inline-flex shrink-0 rounded border px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${getValidationSourceBadgeClassName(
                        issue.source
                      )}`}
                    >
                      {VALIDATION_SOURCE_LABEL[issue.source] ?? issue.source}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                    <div className="truncate text-slate-500">
                      {issue.path || "Topology Contract"}
                    </div>
                    <div className="text-slate-500">
                      {focusable ? "Focus on canvas" : "Not on active yard"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function DiagnosticsTabContent({
  faultRows,
  protectionTripEdgeIds,
  currentValidationIssues,
  latestRejectedValidationReport,
  rejectedValidationIssues,
  isPersistenceBlocked,
  nodeLabelById,
  edgeLabelById,
  onFocusValidationIssue
}) {
  return (
    <div className="space-y-3">
      <FaultDeskSection
        faultRows={faultRows}
        protectionTripEdgeIds={protectionTripEdgeIds}
      />
      <ValidationSection
        currentValidationIssues={currentValidationIssues}
        latestRejectedValidationReport={latestRejectedValidationReport}
        rejectedValidationIssues={rejectedValidationIssues}
        isPersistenceBlocked={isPersistenceBlocked}
        nodeLabelById={nodeLabelById}
        edgeLabelById={edgeLabelById}
        onFocusValidationIssue={onFocusValidationIssue}
      />
    </div>
  );
}

function LeftRail({
  onDragStart,
  onSaveToFile,
  onLoadFromFile,
  onClearYard,
  edgeDrawMode,
  onChangeEdgeDrawMode,
  nodes,
  edges,
  powerStateByNodeId,
  faultSummaries,
  protectionTripEdgeIds,
  liveValidationIssues,
  latestRejectedValidationReport,
  isPersistenceBlocked,
  onFocusValidationIssue,
  onToggleSourceOnline,
  onChangeUpsOperatingMode,
  onResetAllBreakers,
  hasMopBaseSnapshot,
  isRecordingMop,
  mopSteps,
  mopPlaybackIndex,
  onToggleMopRecording,
  onMopReset,
  onMopStepBack,
  onMopStepForward
}) {
  const [activeTab, setActiveTab] = useState(LEFT_RAIL_TAB.BUILD);

  const sourceRows = useMemo(
    () =>
      nodes
        .filter((node) => isSourceNodeType(node.type))
        .map((node) => {
          const nodeData = normalizeNodeData(node);

          return {
            id: node.id,
            type: node.type,
            label: nodeData.label,
            syncGroup: nodeData.syncGroup ?? "",
            isSourceOnline: nodeData.isSourceOnline !== false,
            powerState: powerStateByNodeId[node.id] ?? NODE_POWER_STATE.DEAD
          };
        })
        .sort((sourceA, sourceB) => {
          const labelSort = sourceA.label.localeCompare(sourceB.label);

          if (labelSort !== 0) {
            return labelSort;
          }

          return sourceA.id.localeCompare(sourceB.id);
        }),
    [nodes, powerStateByNodeId]
  );

  const upsRows = useMemo(
    () =>
      nodes
        .filter((node) => isUpsNodeType(node.type))
        .map((node) => {
          const nodeData = normalizeNodeData(node);

          return {
            id: node.id,
            label: nodeData.label,
            operatingMode: nodeData.operatingMode,
            batteryAvailable: nodeData.batteryAvailable !== false,
            powerState: powerStateByNodeId[node.id] ?? NODE_POWER_STATE.DEAD
          };
        })
        .sort((upsA, upsB) => {
          const labelSort = upsA.label.localeCompare(upsB.label);

          if (labelSort !== 0) {
            return labelSort;
          }

          return upsA.id.localeCompare(upsB.id);
        }),
    [nodes, powerStateByNodeId]
  );

  const trippedBreakerCount = useMemo(
    () =>
      edges.reduce(
        (count, edge) =>
          count + (edge.data?.breakerState === BREAKER_STATE.TRIPPED ? 1 : 0),
        0
      ),
    [edges]
  );

  const nodeLabelById = useMemo(
    () => new Map(nodes.map((node) => [node.id, normalizeNodeData(node).label])),
    [nodes]
  );

  const edgeLabelById = useMemo(
    () =>
      new Map(
        edges.map((edge) => {
          const edgeLabel = `${nodeLabelById.get(edge.source) ?? edge.source} -> ${
            nodeLabelById.get(edge.target) ?? edge.target
          }`;

          return [edge.id, edgeLabel];
        })
      ),
    [edges, nodeLabelById]
  );

  const faultRows = useMemo(
    () =>
      (faultSummaries ?? [])
        .map((faultSummary) => ({
          id: faultSummary.id,
          label:
            faultSummary.targetType === "node"
              ? nodeLabelById.get(faultSummary.targetId) ?? faultSummary.targetId
              : faultSummary.targetType === "component"
                ? faultSummary.targetNodeIds
                    .map((nodeId) => nodeLabelById.get(nodeId) ?? nodeId)
                    .slice(0, 3)
                    .join(" / ")
                : edgeLabelById.get(faultSummary.targetId) ?? faultSummary.targetId,
          summary:
            faultSummary.kind === "phaseConflict"
              ? "Phase Conflict"
              : faultSummary.targetType === "edge"
                ? "Bolted Edge Fault"
                : "Bolted Node Fault",
          status: faultSummary.status,
          clearingLabels:
            faultSummary.clearingEdgeIds.length > 0
              ? faultSummary.clearingEdgeIds.map(
                  (edgeId) => edgeLabelById.get(edgeId) ?? edgeId
                )
              : [],
          sourceCount: faultSummary.sourceIds.length
        }))
        .sort((leftFault, rightFault) => leftFault.label.localeCompare(rightFault.label)),
    [faultSummaries, nodeLabelById, edgeLabelById]
  );

  const currentValidationIssues = Array.isArray(liveValidationIssues)
    ? liveValidationIssues
    : [];
  const rejectedValidationIssues = Array.isArray(latestRejectedValidationReport?.issues)
    ? latestRejectedValidationReport.issues
    : [];

  const summaryMetrics = useMemo(
    () => [
      {
        label: "Sources",
        value: String(sourceRows.length),
        toneClassName: "text-slate-100"
      },
      {
        label: "UPS",
        value: String(upsRows.length),
        toneClassName: "text-cyan-100"
      },
      {
        label: "Faults",
        value: String(faultRows.length),
        toneClassName: faultRows.length > 0 ? "text-red-100" : "text-slate-100"
      },
      {
        label: "Trips",
        value: String(trippedBreakerCount),
        toneClassName: trippedBreakerCount > 0 ? "text-amber-100" : "text-slate-100"
      },
      {
        label: "Validation",
        value: isPersistenceBlocked ? "Blocked" : "Clear",
        toneClassName: isPersistenceBlocked ? "text-rose-100" : "text-emerald-100"
      },
      {
        label: "MOP",
        value: isRecordingMop ? "Recording" : "Idle",
        toneClassName: isRecordingMop ? "text-red-100" : "text-slate-100"
      }
    ],
    [
      sourceRows.length,
      upsRows.length,
      faultRows.length,
      trippedBreakerCount,
      isPersistenceBlocked,
      isRecordingMop
    ]
  );

  let activeTabContent = (
    <BuildTabContent
      onDragStart={onDragStart}
      onSaveToFile={onSaveToFile}
      onLoadFromFile={onLoadFromFile}
      onClearYard={onClearYard}
      edgeDrawMode={edgeDrawMode}
      onChangeEdgeDrawMode={onChangeEdgeDrawMode}
    />
  );

  if (activeTab === LEFT_RAIL_TAB.OPERATE) {
    activeTabContent = (
      <OperateTabContent
        sourceRows={sourceRows}
        upsRows={upsRows}
        trippedBreakerCount={trippedBreakerCount}
        onToggleSourceOnline={onToggleSourceOnline}
        onChangeUpsOperatingMode={onChangeUpsOperatingMode}
        onResetAllBreakers={onResetAllBreakers}
        hasMopBaseSnapshot={hasMopBaseSnapshot}
        isRecordingMop={isRecordingMop}
        mopSteps={mopSteps}
        mopPlaybackIndex={mopPlaybackIndex}
        onToggleMopRecording={onToggleMopRecording}
        onMopReset={onMopReset}
        onMopStepBack={onMopStepBack}
        onMopStepForward={onMopStepForward}
      />
    );
  }

  if (activeTab === LEFT_RAIL_TAB.DIAGNOSTICS) {
    activeTabContent = (
      <DiagnosticsTabContent
        faultRows={faultRows}
        protectionTripEdgeIds={protectionTripEdgeIds}
        currentValidationIssues={currentValidationIssues}
        latestRejectedValidationReport={latestRejectedValidationReport}
        rejectedValidationIssues={rejectedValidationIssues}
        isPersistenceBlocked={isPersistenceBlocked}
        nodeLabelById={nodeLabelById}
        edgeLabelById={edgeLabelById}
        onFocusValidationIssue={onFocusValidationIssue}
      />
    );
  }

  return (
    <aside className="flex h-full w-[21rem] min-w-[20rem] max-w-[22rem] shrink-0 flex-col border-r border-slate-700 bg-slate-950/95">
      <div className="border-b border-slate-700 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
              OneLine Command Rail
            </div>
            <div className="mt-1 text-xs text-slate-100">
              Build, operate, and audit the yard from one 1080p-safe dock.
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Physics stays in the engine. This rail only drives the controls.
            </div>
          </div>
          {isRecordingMop ? (
            <div className="inline-flex animate-pulse items-center gap-1 rounded border border-red-400 bg-red-950/80 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-red-100">
              <span className="h-1.5 w-1.5 rounded-full bg-red-300" />
              Recording
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-b border-slate-700 px-3 py-3">
        <div className="grid grid-cols-3 gap-2">
          {summaryMetrics.map((metric) => (
            <SummaryMetric
              key={metric.label}
              label={metric.label}
              value={metric.value}
              toneClassName={metric.toneClassName}
            />
          ))}
        </div>
      </div>

      <div className="border-b border-slate-700 px-3 py-3">
        <div className="grid grid-cols-3 gap-2">
          {TAB_OPTIONS.map((tabOption) => (
            <RailTabButton
              key={tabOption.id}
              isActive={activeTab === tabOption.id}
              label={tabOption.label}
              onClick={() => {
                setActiveTab(tabOption.id);
              }}
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">{activeTabContent}</div>
    </aside>
  );
}

export { DRAG_MIME_TYPE };
export default LeftRail;
