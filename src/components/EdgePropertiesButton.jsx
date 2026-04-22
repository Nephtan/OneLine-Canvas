function SettingsIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5v2.2m0 12.6v2.2m8.5-8.5h-2.2M5.7 12H3.5m14.4-5.9-1.6 1.6M7.7 16.3l-1.6 1.6m0-11.8 1.6 1.6m8.6 8.6 1.6 1.6"
      />
      <circle cx="12" cy="12" r="3.3" />
    </svg>
  );
}

function EdgePropertiesButton({ onOpen, title = "Edit edge properties" }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpen?.();
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="pointer-events-auto nodrag nopan inline-flex h-6 w-6 items-center justify-center rounded border border-slate-600 bg-slate-950/90 text-slate-300 transition hover:border-cyan-300/80 hover:text-cyan-100"
      aria-label={title}
      title={title}
    >
      <SettingsIcon className="h-3.5 w-3.5" />
    </button>
  );
}

export default EdgePropertiesButton;
