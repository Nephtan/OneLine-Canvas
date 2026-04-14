function NodeDeleteButton({ onDelete, title = "Delete gear" }) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDelete?.();
      }}
      className="nodrag inline-flex h-5 w-5 items-center justify-center rounded border border-red-400/70 bg-slate-950/90 text-[10px] font-bold text-red-100 transition hover:bg-red-950/80"
    >
      X
    </button>
  );
}

export default NodeDeleteButton;
