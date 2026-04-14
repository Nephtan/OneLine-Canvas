import { useEffect, useRef, useState } from "react";

function stopEvent(event) {
  event.stopPropagation();
}

function InlineLabelEditor({ label, onCommit, className, inputClassName }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isEditing) {
      setDraftLabel(label);
    }
  }, [isEditing, label]);

  useEffect(() => {
    if (!isEditing || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  const commitLabel = () => {
    const nextLabel = draftLabel.trim() === "" ? label : draftLabel;
    setIsEditing(false);
    setDraftLabel(nextLabel);

    if (nextLabel !== label) {
      onCommit?.(nextLabel);
    }
  };

  const cancelEdit = () => {
    setDraftLabel(label);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draftLabel}
        onChange={(event) => {
          setDraftLabel(event.target.value);
        }}
        onBlur={commitLabel}
        onPointerDown={stopEvent}
        onClick={stopEvent}
        onDoubleClick={stopEvent}
        onKeyDown={(event) => {
          stopEvent(event);

          if (event.key === "Enter") {
            commitLabel();
            return;
          }

          if (event.key === "Escape") {
            cancelEdit();
          }
        }}
        className={`nodrag w-full rounded border border-slate-500/70 bg-slate-950/80 px-2 py-1 text-left outline-none ring-0 focus:border-amber-300/80 ${inputClassName ?? ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      title="Double-click to rename"
      onPointerDown={stopEvent}
      onClick={stopEvent}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDraftLabel(label);
        setIsEditing(true);
      }}
      className={`nodrag w-full text-left ${className ?? ""}`}
    >
      {label}
    </button>
  );
}

export default InlineLabelEditor;
