import { useEffect, useMemo, useState } from "react";
import {
  formatTransformerVoltage,
  formatVoltageValue,
  parseVoltageInput
} from "../electrical/voltage";
import { isTransformerNodeType } from "../topology/transformer";
import { normalizeNodeData } from "../nodes/nodeData";

const NODE_TYPE_LABEL = {
  utility: "Utility Source",
  generator: "Generator Source",
  mvsg: "MV Switchgear",
  ptx: "Pad Mount Transformer",
  load: "Terminal Load",
  switchboard: "Switchboard",
  transferSwitch: "Transfer Switch",
  mechanical: "Mechanical Load"
};

function buildDraftFromNode(node) {
  const normalizedNodeData = normalizeNodeData(node);

  if (isTransformerNodeType(node.type)) {
    return {
      label: normalizedNodeData.label,
      primaryVoltage: String(normalizedNodeData.primaryVoltage),
      secondaryVoltage: String(normalizedNodeData.secondaryVoltage)
    };
  }

  return {
    label: normalizedNodeData.label,
    nominalVoltage: String(normalizedNodeData.nominalVoltage)
  };
}

function VoltageInputField({
  id,
  label,
  value,
  onChange,
  helperText,
  errorText
}) {
  return (
    <label htmlFor={id} className="block">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <input
        id={id}
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
        className={`nodrag mt-1 w-full rounded border bg-slate-950/90 px-3 py-2 text-sm text-slate-100 outline-none ${
          errorText
            ? "border-rose-400/80 focus:border-rose-300"
            : "border-slate-600 focus:border-cyan-300/80"
        }`}
      />
      <div className="mt-1 text-xs text-slate-500">{helperText}</div>
      {errorText ? (
        <div className="mt-1 text-[11px] text-rose-200">{errorText}</div>
      ) : null}
    </label>
  );
}

function NodePropertiesModal({ node, onApply, onClose }) {
  const [draft, setDraft] = useState(() => buildDraftFromNode(node));

  useEffect(() => {
    setDraft(buildDraftFromNode(node));
  }, [node]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const isTransformer = isTransformerNodeType(node.type);
  const modalTitle = NODE_TYPE_LABEL[node.type] ?? "Equipment Properties";
  const trimmedLabel = draft.label.trim();
  const nominalVoltage = isTransformer ? null : parseVoltageInput(draft.nominalVoltage);
  const primaryVoltage = isTransformer ? parseVoltageInput(draft.primaryVoltage) : null;
  const secondaryVoltage = isTransformer
    ? parseVoltageInput(draft.secondaryVoltage)
    : null;
  const nominalVoltageError =
    !isTransformer && nominalVoltage === null
      ? "Enter a positive voltage in volts."
      : "";
  const primaryVoltageError =
    isTransformer && primaryVoltage === null
      ? "Enter a positive primary voltage in volts."
      : "";
  const secondaryVoltageError =
    isTransformer && secondaryVoltage === null
      ? "Enter a positive secondary voltage in volts."
      : "";

  const canApply = useMemo(() => {
    if (trimmedLabel === "") {
      return false;
    }

    if (isTransformer) {
      return primaryVoltage !== null && secondaryVoltage !== null;
    }

    return nominalVoltage !== null;
  }, [
    isTransformer,
    nominalVoltage,
    primaryVoltage,
    secondaryVoltage,
    trimmedLabel
  ]);

  function handleApply() {
    if (!canApply) {
      return;
    }

    if (isTransformer) {
      onApply?.(node.id, {
        label: trimmedLabel,
        primaryVoltage,
        secondaryVoltage
      });
      return;
    }

    onApply?.(node.id, {
      label: trimmedLabel,
      nominalVoltage
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
      onClick={() => {
        onClose?.();
      }}
    >
      <div
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 shadow-[0_18px_70px_rgba(2,6,23,0.85)]"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="border-b border-slate-700 px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Properties
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-100">
            {modalTitle}
          </div>
          <div className="mt-1 text-xs text-slate-500">{node.id}</div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label htmlFor="node-properties-label" className="block">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Label
            </div>
            <input
              id="node-properties-label"
              type="text"
              value={draft.label}
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  label: event.target.value
                }));
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
              }}
              autoFocus
              className="nodrag mt-1 w-full rounded border border-slate-600 bg-slate-950/90 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/80"
            />
            <div className="mt-1 text-xs text-slate-500">
              Canvas label used by SCADA, MOP snapshots, and exports.
            </div>
            {trimmedLabel === "" ? (
              <div className="mt-1 text-[11px] text-rose-200">
                Label cannot be blank.
              </div>
            ) : null}
          </label>

          {isTransformer ? (
            <>
              <VoltageInputField
                id="node-properties-primary-voltage"
                label="Primary Voltage (V)"
                value={draft.primaryVoltage}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    primaryVoltage: nextValue
                  }));
                }}
                helperText={`Engineering format: ${formatVoltageValue(
                  draft.primaryVoltage
                )}`}
                errorText={primaryVoltageError}
              />
              <VoltageInputField
                id="node-properties-secondary-voltage"
                label="Secondary Voltage (V)"
                value={draft.secondaryVoltage}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    secondaryVoltage: nextValue
                  }));
                }}
                helperText={`Engineering format: ${formatVoltageValue(
                  draft.secondaryVoltage
                )}`}
                errorText={secondaryVoltageError}
              />
              <div className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                Ratio Preview:{" "}
                <span className="text-cyan-100">
                  {formatTransformerVoltage(
                    draft.primaryVoltage,
                    draft.secondaryVoltage
                  )}
                </span>
              </div>
            </>
          ) : (
            <VoltageInputField
              id="node-properties-nominal-voltage"
              label="Nominal Voltage (V)"
              value={draft.nominalVoltage}
              onChange={(nextValue) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  nominalVoltage: nextValue
                }));
              }}
              helperText={`Engineering format: ${formatVoltageValue(
                draft.nominalVoltage
              )}`}
              errorText={nominalVoltageError}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-700 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onClose?.();
            }}
            className="nodrag rounded border border-slate-600 bg-slate-950 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!canApply}
            className={`nodrag rounded border px-3 py-2 text-xs uppercase tracking-[0.18em] transition ${
              canApply
                ? "border-cyan-300/80 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/20"
                : "cursor-not-allowed border-slate-700 bg-slate-950 text-slate-600"
            }`}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default NodePropertiesModal;
