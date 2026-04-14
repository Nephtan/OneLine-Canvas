function EdgeDeleteButton({ onDelete, title = "Delete wire" }) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDelete?.();
      }}
      className="pointer-events-auto inline-flex h-5 w-5 items-center justify-center rounded border border-red-400/80 bg-slate-950/95 text-[10px] font-bold text-red-100 shadow-[0_0_8px_rgba(15,23,42,0.65)] transition hover:bg-red-950/90"
    >
      X
    </button>
  );
}

export default EdgeDeleteButton;
