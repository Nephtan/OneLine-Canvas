import { useMemo } from "react";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import { BREAKER_STATE } from "../engine/protectionModel";
import { isSourceNodeType, normalizeNodeData } from "../nodes/nodeData";
import {
  formatUpsOperatingMode,
  isUpsNodeType,
  UPS_OPERATING_MODE
} from "../topology/ups";

const SOURCE_TYPE_LABEL = {
  utility: "UTILITY",
  generator: "GEN"
};

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

function ScadaPanel({
  nodes,
  edges,
  powerStateByNodeId,
  faultSummaries,
  protectionTripEdgeIds,
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
            powerState:
              powerStateByNodeId[node.id] ?? NODE_POWER_STATE.DEAD
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
    () =>
      new Map(nodes.map((node) => [node.id, normalizeNodeData(node).label])),
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

  const activeFaultCount = useMemo(
    () => faultRows.filter((faultRow) => faultRow.status === "active").length,
    [faultRows]
  );

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-slate-700 bg-slate-950/95 p-3">
      <div className="rounded border border-slate-700 bg-slate-900 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
              SCADA Control Room
            </div>
            <div className="mt-1 text-xs text-slate-300">
              Centralized source supervision, breaker reset, and MOP playback.
            </div>
          </div>
          {isRecordingMop ? (
            <div className="inline-flex animate-pulse items-center gap-1 rounded border border-red-400 bg-red-950/80 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-red-100">
              <span className="h-1.5 w-1.5 rounded-full bg-red-300" />
              Recording
            </div>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.16em]">
          <div className="rounded border border-slate-700 bg-slate-950 px-2 py-2">
            <div className="text-slate-500">Sources</div>
            <div className="mt-1 text-base text-slate-100">{sourceRows.length}</div>
          </div>
          <div className="rounded border border-slate-700 bg-slate-950 px-2 py-2">
            <div className="text-slate-500">UPS</div>
            <div className="mt-1 text-base text-cyan-100">{upsRows.length}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 bg-slate-950/95 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
            UPS Lineup
          </div>
        </div>
        {upsRows.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-500">
            No UPS systems are deployed on the yard.
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto px-3 py-2">
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
                      className={`inline-flex rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${getPowerStateBadgeClassName(
                        upsRow.powerState
                      )}`}
                    >
                      {upsRow.powerState}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em]">
                    <div className="text-slate-500">
                      Mode: <span className="text-slate-200">{formatUpsOperatingMode(upsRow.operatingMode)}</span>
                    </div>
                    <div className={upsRow.batteryAvailable ? "text-emerald-300" : "text-rose-300"}>
                      {upsRow.batteryAvailable ? "Battery Ready" : "Battery Unavailable"}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onChangeUpsOperatingMode?.(upsRow.id, UPS_OPERATING_MODE.NORMAL);
                      }}
                      className={`rounded border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
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
                      className={`rounded border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
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
                      className={`rounded border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
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
          </div>
        )}
      </div>

      <div className="mt-3 rounded border border-slate-700 bg-slate-900 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            MOP Recorder
          </div>
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
        </div>
        {isRecordingMop ? (
          <div className="mt-2 rounded border border-red-500/60 bg-red-950/40 px-2 py-2 text-[10px] text-red-100">
            Live actions are being captured as post-settle keyframes.
          </div>
        ) : (
          <>
            <div className="mt-2 grid grid-cols-3 gap-2">
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
            <div className="mt-2 max-h-48 overflow-y-auto rounded border border-slate-800 bg-slate-950/80">
              {mopSteps.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-500">
                  No recorded MOP steps. Toggle Record MOP to start a scenario.
                </div>
              ) : (
                <ol className="space-y-1 px-3 py-2 text-xs">
                  {mopSteps.map((mopStep, stepIndex) => {
                    const isApplied = stepIndex < mopPlaybackIndex;
                    const isNext = stepIndex === mopPlaybackIndex;

                    return (
                      <li
                        key={`${mopStep.targetId}-${stepIndex}`}
                        className={`rounded border px-2 py-1 ${
                          isApplied
                            ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-100"
                            : isNext
                              ? "border-amber-400/60 bg-amber-500/10 text-amber-100"
                              : "border-slate-800 bg-slate-950 text-slate-300"
                        }`}
                      >
                        {stepIndex + 1}. {mopStep.actionText}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 rounded border border-slate-700 bg-slate-900 p-2">
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
      </div>

      <div className="mt-3 rounded border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 bg-slate-950/95 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
            Protection Desk
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 px-3 py-3 text-[10px] uppercase tracking-[0.16em]">
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
          <div className="px-3 pb-3 text-xs text-slate-500">
            No active or isolated faults are present on the yard.
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto px-3 pb-3">
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
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 bg-slate-950/95 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
            Source Telemetry
          </div>
        </div>

        {sourceRows.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-500">
            No Utility or Generator sources are deployed on the yard.
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse text-[11px]">
            <thead className="sticky top-0 z-10 bg-slate-950/95">
              <tr className="border-b border-slate-700 text-left uppercase tracking-[0.16em] text-slate-500">
                <th className="w-[38%] px-3 py-2 font-medium">Source</th>
                <th className="w-[18%] px-2 py-2 font-medium">Sync</th>
                <th className="w-[24%] px-2 py-2 font-medium">State</th>
                <th className="w-[20%] px-3 py-2 text-right font-medium">Ctl</th>
              </tr>
            </thead>
            <tbody>
              {sourceRows.map((sourceRow) => (
                <tr
                  key={sourceRow.id}
                  className="border-b border-slate-800/80 align-top last:border-b-0"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] ${getTypeBadgeClassName(sourceRow.type)}`}
                      >
                        {SOURCE_TYPE_LABEL[sourceRow.type] ?? sourceRow.type}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-[0.16em] ${
                          sourceRow.isSourceOnline
                            ? "text-emerald-300/80"
                            : "text-slate-500"
                        }`}
                      >
                        {sourceRow.isSourceOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-slate-100">{sourceRow.label}</div>
                    <div className="mt-1 truncate text-[10px] text-slate-500">
                      {sourceRow.id}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="truncate rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200">
                      {sourceRow.syncGroup || "--"}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div
                      className={`inline-flex rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${getPowerStateBadgeClassName(sourceRow.powerState)}`}
                    >
                      {sourceRow.powerState}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        onToggleSourceOnline(sourceRow.id);
                      }}
                      className={`rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
                        sourceRow.isSourceOnline
                          ? "border-rose-300/70 bg-rose-500/20 text-rose-100"
                          : "border-emerald-300/70 bg-emerald-500/20 text-emerald-100"
                      }`}
                    >
                      {sourceRow.isSourceOnline ? "Kill Feed" : "Restore Feed"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </aside>
  );
}

export default ScadaPanel;
