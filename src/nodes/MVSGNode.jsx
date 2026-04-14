import { Handle, Position } from "@xyflow/react";

function MVSGNode({ data }) {
  const isLive = data.powerState === "Live";

  return (
    <div
      className={`min-w-56 rounded-md bg-slate-900 px-4 py-3 text-left ${
        isLive
          ? "border border-amber-300/90 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_20px_rgba(250,204,21,0.35)]"
          : "border border-slate-600 shadow-lg shadow-slate-950/70"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-[0.2em] ${
          isLive ? "text-amber-200/90" : "text-slate-400"
        }`}
      >
        MV Switchgear
      </div>
      <div
        className={`mt-1 text-sm font-semibold ${
          isLive ? "text-amber-100" : "text-slate-200"
        }`}
      >
        {data.label}
      </div>
      <div className="mt-2 text-xs text-slate-300">{data.nominalVoltage}</div>
      <div
        className={`mt-2 inline-block rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
          isLive
            ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
            : "border-slate-600 bg-slate-800/70 text-slate-300"
        }`}
      >
        {data.powerState ?? "Dead"}
      </div>

      <Handle
        id="mvsg-in"
        type="target"
        position={Position.Left}
        className={`h-3 w-3 ${
          isLive
            ? "border border-amber-100 bg-amber-300"
            : "border border-slate-300 bg-slate-500"
        }`}
      />
      <Handle
        id="mvsg-out"
        type="source"
        position={Position.Right}
        className={`h-3 w-3 ${
          isLive
            ? "border border-amber-100 bg-amber-300"
            : "border border-slate-300 bg-slate-500"
        }`}
      />
    </div>
  );
}

export default MVSGNode;
