import { useMemo } from "react";
import { BREAKER_STATE, NODE_POWER_STATE } from "../engine/powerFlow";
import { isSourceNodeType, normalizeNodeData } from "../nodes/nodeData";

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

function ScadaPanel({
  nodes,
  edges,
  powerStateByNodeId,
  onToggleSourceOnline,
  onResetAllBreakers
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

  const trippedBreakerCount = useMemo(
    () =>
      edges.reduce(
        (count, edge) =>
          count + (edge.data?.breakerState === BREAKER_STATE.TRIPPED ? 1 : 0),
        0
      ),
    [edges]
  );

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-slate-700 bg-slate-950/95 p-3">
      <div className="rounded border border-slate-700 bg-slate-900 px-3 py-3">
        <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
          SCADA Control Room
        </div>
        <div className="mt-1 text-xs text-slate-300">
          Centralized source supervision and breaker reset controls.
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.16em]">
          <div className="rounded border border-slate-700 bg-slate-950 px-2 py-2">
            <div className="text-slate-500">Sources</div>
            <div className="mt-1 text-base text-slate-100">{sourceRows.length}</div>
          </div>
          <div className="rounded border border-slate-700 bg-slate-950 px-2 py-2">
            <div className="text-slate-500">Tripped</div>
            <div className="mt-1 text-base text-red-200">{trippedBreakerCount}</div>
          </div>
        </div>
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
