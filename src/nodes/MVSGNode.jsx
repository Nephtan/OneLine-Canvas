import { Handle, Position } from "@xyflow/react";

function MVSGNode({ data }) {
  return (
    <div className="min-w-56 rounded-md border border-sky-500/70 bg-slate-900 px-4 py-3 text-left shadow-lg shadow-sky-950/40">
      <div className="text-[10px] uppercase tracking-[0.2em] text-sky-300/80">
        MV Switchgear
      </div>
      <div className="mt-1 text-sm font-semibold text-sky-100">{data.label}</div>
      <div className="mt-2 text-xs text-slate-300">{data.nominalVoltage}</div>

      <Handle
        id="mvsg-in"
        type="target"
        position={Position.Left}
        className="h-3 w-3 border border-sky-200 bg-sky-400"
      />
      <Handle
        id="mvsg-out"
        type="source"
        position={Position.Right}
        className="h-3 w-3 border border-sky-200 bg-sky-400"
      />
    </div>
  );
}

export default MVSGNode;
