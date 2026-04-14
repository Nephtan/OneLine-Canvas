const DRAG_MIME_TYPE = "application/x-oneline-equipment";

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

function EquipmentPalette({
  onDragStart,
  onSaveToFile,
  onLoadFromFile,
  onClearYard
}) {
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
          onDragStart={(event) => onDragStart(event, "generator")}
          className="w-full cursor-grab rounded border border-lime-500/60 bg-slate-800 px-3 py-2 text-left active:cursor-grabbing"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-lime-300/85">
            Generator
          </div>
          <div className="mt-1 text-xs text-lime-100">480 V standby source</div>
        </button>

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
          onDragStart={(event) => onDragStart(event, "switchboard")}
          className="w-full cursor-grab rounded border border-slate-500/70 bg-slate-800 px-3 py-2 text-left active:cursor-grabbing"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-200">
            Switchboard
          </div>
          <div className="mt-1 text-xs text-slate-100">MDB / UPS distribution</div>
        </button>

        <button
          type="button"
          draggable
          onDragStart={(event) => onDragStart(event, "transferSwitch")}
          className="w-full cursor-grab rounded border border-indigo-500/60 bg-slate-800 px-3 py-2 text-left active:cursor-grabbing"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-300/85">
            Transfer Switch
          </div>
          <div className="mt-1 text-xs text-indigo-100">ATS / STS</div>
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
          onDragStart={(event) => onDragStart(event, "mechanical")}
          className="w-full cursor-grab rounded border border-cyan-500/70 bg-slate-800 px-3 py-2 text-left active:cursor-grabbing"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/85">
            Mechanical
          </div>
          <div className="mt-1 text-xs text-cyan-100">CRAH / Fan Coil Wall</div>
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

      <div className="mt-3 rounded border border-slate-700 bg-slate-950 p-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Topology I/O
        </div>
        <div className="mt-2 space-y-2">
          <button
            type="button"
            onClick={onSaveToFile}
            className="w-full rounded border border-slate-500 bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-100"
          >
            Save to File
          </button>
          <button
            type="button"
            onClick={onLoadFromFile}
            className="w-full rounded border border-slate-500 bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-100"
          >
            Load from File
          </button>
          <button
            type="button"
            onClick={onClearYard}
            className="inline-flex w-full items-center justify-center gap-1 rounded border border-red-500 bg-red-950/60 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-red-100"
          >
            <WarningIcon className="h-3 w-3" />
            Clear Yard
          </button>
        </div>
      </div>
    </aside>
  );
}

export { DRAG_MIME_TYPE };
export default EquipmentPalette;
