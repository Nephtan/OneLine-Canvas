const DRAG_MIME_TYPE = "application/x-oneline-equipment";

function EquipmentPalette({ onDragStart }) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-700 bg-slate-900/95 p-3">
      <div className="rounded border border-slate-700 bg-slate-950 px-3 py-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Equipment Palette
        </div>
        <div className="mt-1 text-xs text-slate-300">
          Drag gear into the yard to build topology.
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <button
          type="button"
          draggable
          onDragStart={(event) => onDragStart(event, "utility")}
          className="w-full cursor-grab rounded border border-emerald-500/60 bg-slate-800 px-3 py-2 text-left active:cursor-grabbing"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
            Utility Feed
          </div>
          <div className="mt-1 text-xs text-emerald-100">12.47 kV source</div>
        </button>

        <button
          type="button"
          draggable
          onDragStart={(event) => onDragStart(event, "mvsg")}
          className="w-full cursor-grab rounded border border-sky-500/60 bg-slate-800 px-3 py-2 text-left active:cursor-grabbing"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-sky-300/80">
            MVSG
          </div>
          <div className="mt-1 text-xs text-sky-100">Medium-voltage switchgear</div>
        </button>

        <button
          type="button"
          draggable
          onDragStart={(event) => onDragStart(event, "ptx")}
          className="w-full cursor-grab rounded border border-violet-500/60 bg-slate-800 px-3 py-2 text-left active:cursor-grabbing"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-violet-300/80">
            PTX
          </div>
          <div className="mt-1 text-xs text-violet-100">Pad-mount transformer</div>
        </button>

        <button
          type="button"
          draggable
          onDragStart={(event) => onDragStart(event, "load")}
          className="w-full cursor-grab rounded border border-cyan-500/60 bg-slate-800 px-3 py-2 text-left active:cursor-grabbing"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
            Load
          </div>
          <div className="mt-1 text-xs text-cyan-100">Data hall / cooling plant</div>
        </button>
      </div>
    </aside>
  );
}

export { DRAG_MIME_TYPE };
export default EquipmentPalette;
