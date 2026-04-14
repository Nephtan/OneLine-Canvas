import { Handle, Position } from "@xyflow/react";

function UtilityNode({ data }) {
  return (
    <div className="min-w-56 rounded-md border border-emerald-500/70 bg-slate-900 px-4 py-3 text-left shadow-lg shadow-emerald-950/40">
      <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
        Utility Source
      </div>
      <div className="mt-1 text-sm font-semibold text-emerald-100">
        {data.label}
      </div>
      <div className="mt-2 text-xs text-slate-300">{data.voltage}</div>

      <Handle
        id="utility-out"
        type="source"
        position={Position.Right}
        className="h-3 w-3 border border-emerald-200 bg-emerald-400"
      />
    </div>
  );
}

export default UtilityNode;
