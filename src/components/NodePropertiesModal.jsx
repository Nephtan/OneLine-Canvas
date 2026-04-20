import { useEffect, useMemo, useState } from "react";
import {
  formatTransformerVoltage,
  formatVoltageValue,
  parseVoltageInput
} from "../electrical/voltage";
import { normalizeNodeData } from "../nodes/nodeData";
import { isTransformerNodeType } from "../topology/transformer";
import {
  formatUpsOperatingMode,
  isUpsNodeType,
  normalizeUpsOperatingMode,
  UPS_OPERATING_MODE
} from "../topology/ups";

const NODE_TYPE_LABEL = {
  utility: "Utility Source",
  generator: "Generator Source",
  mvsg: "MV Switchgear",
  ptx: "Pad Mount Transformer",
  load: "Terminal Load",
  switchboard: "Switchboard",
  transferSwitch: "Transfer Switch",
  ups: "UPS",
  mechanical: "Mechanical Load"
};

function parseOptionalPositiveInteger(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue === "") {
    return undefined;
  }

  const numericValue = Number(trimmedValue.replace(/,/g, ""));
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.round(numericValue) : null;
}

function buildDraftFromNode(node) {
  const normalizedNodeData = normalizeNodeData(node);

  if (isTransformerNodeType(node.type)) {
    return {
      label: normalizedNodeData.label,
      primaryVoltage: String(normalizedNodeData.primaryVoltage),
      secondaryVoltage: String(normalizedNodeData.secondaryVoltage)
    };
  }

  const baseDraft = {
    label: normalizedNodeData.label,
    nominalVoltage: String(normalizedNodeData.nominalVoltage)
  };

  if (node.type === "switchboard") {
    return {
      ...baseDraft,
      boardClass: normalizedNodeData.boardClass ?? "",
      ratedCurrentAmps:
        typeof normalizedNodeData.ratedCurrentAmps === "number"
          ? String(normalizedNodeData.ratedCurrentAmps)
          : ""
    };
  }

  if (isUpsNodeType(node.type)) {
    return {
      ...baseDraft,
      upsClass: normalizedNodeData.upsClass ?? "",
      ratedCurrentAmps:
        typeof normalizedNodeData.ratedCurrentAmps === "number"
          ? String(normalizedNodeData.ratedCurrentAmps)
          : "",
      kvaRating:
        typeof normalizedNodeData.kvaRating === "number"
          ? String(normalizedNodeData.kvaRating)
          : "",
      batteryRuntimeMinutes:
        typeof normalizedNodeData.batteryRuntimeMinutes === "number"
          ? String(normalizedNodeData.batteryRuntimeMinutes)
          : "",
      batteryAvailable: normalizedNodeData.batteryAvailable !== false,
      operatingMode: normalizeUpsOperatingMode(normalizedNodeData.operatingMode),
      syncGroup: normalizedNodeData.syncGroup ?? ""
    };
  }

  return baseDraft;
}

function stopCanvasEvent(event) {
  event.stopPropagation();
}

function TextInputField({ id, label, value, onChange, helperText }) {
  return (
    <label htmlFor={id} className="block">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onPointerDown={stopCanvasEvent}
        onKeyDown={stopCanvasEvent}
        className="nodrag mt-1 w-full rounded border border-slate-600 bg-slate-950/90 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/80"
      />
      {helperText ? <div className="mt-1 text-xs text-slate-500">{helperText}</div> : null}
    </label>
  );
}

function NumberInputField({
  id,
  label,
  value,
  onChange,
  helperText,
  errorText,
  optional = false
}) {
  return (
    <label htmlFor={id} className="block">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
        {optional ? " (Optional)" : ""}
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
        onPointerDown={stopCanvasEvent}
        onKeyDown={stopCanvasEvent}
        className={`nodrag mt-1 w-full rounded border bg-slate-950/90 px-3 py-2 text-sm text-slate-100 outline-none ${
          errorText
            ? "border-rose-400/80 focus:border-rose-300"
            : "border-slate-600 focus:border-cyan-300/80"
        }`}
      />
      {helperText ? <div className="mt-1 text-xs text-slate-500">{helperText}</div> : null}
      {errorText ? <div className="mt-1 text-[11px] text-rose-200">{errorText}</div> : null}
    </label>
  );
}

function CheckboxField({ id, label, checked, onChange, helperText }) {
  return (
    <label htmlFor={id} className="block">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 rounded border border-slate-600 bg-slate-950/90 px-3 py-2">
        <label className="flex items-center gap-3 text-sm text-slate-100">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(event) => {
              onChange(event.target.checked);
            }}
            onPointerDown={stopCanvasEvent}
            onKeyDown={stopCanvasEvent}
            className="nodrag h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-300 focus:ring-cyan-300/60"
          />
          Battery system available
        </label>
      </div>
      {helperText ? <div className="mt-1 text-xs text-slate-500">{helperText}</div> : null}
    </label>
  );
}

function SelectField({ id, label, value, onChange, options, helperText }) {
  return (
    <label htmlFor={id} className="block">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onPointerDown={stopCanvasEvent}
        onKeyDown={stopCanvasEvent}
        className="nodrag mt-1 w-full rounded border border-slate-600 bg-slate-950/90 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/80"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <div className="mt-1 text-xs text-slate-500">{helperText}</div> : null}
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

  const normalizedNodeData = useMemo(() => normalizeNodeData(node), [node]);
  const isTransformer = isTransformerNodeType(node.type);
  const isUps = isUpsNodeType(node.type);
  const isSwitchboard = node.type === "switchboard";
  const modalTitle = NODE_TYPE_LABEL[node.type] ?? "Equipment Properties";
  const trimmedLabel = draft.label.trim();
  const nominalVoltage = isTransformer ? null : parseVoltageInput(draft.nominalVoltage);
  const primaryVoltage = isTransformer ? parseVoltageInput(draft.primaryVoltage) : null;
  const secondaryVoltage = isTransformer ? parseVoltageInput(draft.secondaryVoltage) : null;
  const ratedCurrentAmps =
    isUps || isSwitchboard ? parseOptionalPositiveInteger(draft.ratedCurrentAmps) : undefined;
  const kvaRating = isUps ? parseOptionalPositiveInteger(draft.kvaRating) : undefined;
  const batteryRuntimeMinutes = isUps
    ? parseOptionalPositiveInteger(draft.batteryRuntimeMinutes)
    : undefined;
  const nominalVoltageError =
    !isTransformer && nominalVoltage === null ? "Enter a positive voltage in volts." : "";
  const primaryVoltageError =
    isTransformer && primaryVoltage === null ? "Enter a positive primary voltage in volts." : "";
  const secondaryVoltageError =
    isTransformer && secondaryVoltage === null
      ? "Enter a positive secondary voltage in volts."
      : "";
  const ratedCurrentAmpsError =
    (isUps || isSwitchboard) && ratedCurrentAmps === null
      ? "Enter a positive current rating or leave blank."
      : "";
  const kvaRatingError =
    isUps && kvaRating === null ? "Enter a positive kVA rating or leave blank." : "";
  const batteryRuntimeMinutesError =
    isUps && batteryRuntimeMinutes === null
      ? "Enter a positive runtime in minutes or leave blank."
      : "";

  const canApply = useMemo(() => {
    if (trimmedLabel === "") {
      return false;
    }

    if (isTransformer) {
      return primaryVoltage !== null && secondaryVoltage !== null;
    }

    if (nominalVoltage === null) {
      return false;
    }

    if (ratedCurrentAmps === null) {
      return false;
    }

    if (isUps && (kvaRating === null || batteryRuntimeMinutes === null)) {
      return false;
    }

    return true;
  }, [
    batteryRuntimeMinutes,
    isTransformer,
    isUps,
    kvaRating,
    nominalVoltage,
    primaryVoltage,
    ratedCurrentAmps,
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

    const nextProperties = {
      label: trimmedLabel,
      nominalVoltage
    };

    if (isSwitchboard) {
      nextProperties.boardClass =
        draft.boardClass.trim() !== "" ? draft.boardClass.trim() : normalizedNodeData.boardClass;
      nextProperties.ratedCurrentAmps = ratedCurrentAmps;
    }

    if (isUps) {
      nextProperties.upsClass =
        draft.upsClass.trim() !== "" ? draft.upsClass.trim() : normalizedNodeData.upsClass;
      nextProperties.ratedCurrentAmps = ratedCurrentAmps;
      nextProperties.kvaRating = kvaRating;
      nextProperties.batteryRuntimeMinutes = batteryRuntimeMinutes;
      nextProperties.batteryAvailable = draft.batteryAvailable;
      nextProperties.operatingMode = normalizeUpsOperatingMode(draft.operatingMode);
      nextProperties.syncGroup = draft.syncGroup;
    }

    onApply?.(node.id, nextProperties);
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
        onClick={stopCanvasEvent}
      >
        <div className="border-b border-slate-700 px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Properties
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-100">{modalTitle}</div>
          <div className="mt-1 text-xs text-slate-500">{node.id}</div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <TextInputField
            id="node-properties-label"
            label="Label"
            value={draft.label}
            onChange={(nextValue) => {
              setDraft((currentDraft) => ({
                ...currentDraft,
                label: nextValue
              }));
            }}
            helperText="Canvas label used by SCADA, MOP snapshots, and exports."
          />
          {trimmedLabel === "" ? (
            <div className="-mt-2 text-[11px] text-rose-200">Label cannot be blank.</div>
          ) : null}

          {isTransformer ? (
            <>
              <NumberInputField
                id="node-properties-primary-voltage"
                label="Primary Voltage (V)"
                value={draft.primaryVoltage}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    primaryVoltage: nextValue
                  }));
                }}
                helperText={`Engineering format: ${formatVoltageValue(draft.primaryVoltage)}`}
                errorText={primaryVoltageError}
              />
              <NumberInputField
                id="node-properties-secondary-voltage"
                label="Secondary Voltage (V)"
                value={draft.secondaryVoltage}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    secondaryVoltage: nextValue
                  }));
                }}
                helperText={`Engineering format: ${formatVoltageValue(draft.secondaryVoltage)}`}
                errorText={secondaryVoltageError}
              />
              <div className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                Ratio Preview:{" "}
                <span className="text-cyan-100">
                  {formatTransformerVoltage(draft.primaryVoltage, draft.secondaryVoltage)}
                </span>
              </div>
            </>
          ) : (
            <NumberInputField
              id="node-properties-nominal-voltage"
              label="Nominal Voltage (V)"
              value={draft.nominalVoltage}
              onChange={(nextValue) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  nominalVoltage: nextValue
                }));
              }}
              helperText={`Engineering format: ${formatVoltageValue(draft.nominalVoltage)}`}
              errorText={nominalVoltageError}
            />
          )}

          {isSwitchboard ? (
            <>
              <TextInputField
                id="node-properties-board-class"
                label="Board Class"
                value={draft.boardClass}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    boardClass: nextValue
                  }));
                }}
                helperText="Project-agnostic equipment class preserved in topology data."
              />
              <NumberInputField
                id="node-properties-rated-current"
                label="Rated Current (A)"
                value={draft.ratedCurrentAmps}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    ratedCurrentAmps: nextValue
                  }));
                }}
                helperText="Optional bus ampacity metadata for future protection modeling."
                errorText={ratedCurrentAmpsError}
                optional
              />
            </>
          ) : null}

          {isUps ? (
            <>
              <TextInputField
                id="node-properties-ups-class"
                label="UPS Class"
                value={draft.upsClass}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    upsClass: nextValue
                  }));
                }}
                helperText="Examples: Double Conversion UPS, Rotary UPS, Line Interactive UPS."
              />
              <SelectField
                id="node-properties-ups-mode"
                label="Operating Mode"
                value={draft.operatingMode}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    operatingMode: nextValue
                  }));
                }}
                options={[
                  {
                    value: UPS_OPERATING_MODE.NORMAL,
                    label: formatUpsOperatingMode(UPS_OPERATING_MODE.NORMAL)
                  },
                  {
                    value: UPS_OPERATING_MODE.BATTERY,
                    label: formatUpsOperatingMode(UPS_OPERATING_MODE.BATTERY)
                  },
                  {
                    value: UPS_OPERATING_MODE.BYPASS,
                    label: formatUpsOperatingMode(UPS_OPERATING_MODE.BYPASS)
                  }
                ]}
                helperText="Manual v1 operating state used by the directed UPS traversal model."
              />
              <CheckboxField
                id="node-properties-battery-available"
                label="Battery Status"
                checked={draft.batteryAvailable}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    batteryAvailable: nextValue
                  }));
                }}
                helperText="When unavailable, Battery mode will not seed the UPS output bus."
              />
              <TextInputField
                id="node-properties-ups-sync-group"
                label="Sync Group"
                value={draft.syncGroup}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    syncGroup: nextValue
                  }));
                }}
                helperText="Used when multiple battery-mode UPS outputs parallel on the same bus."
              />
              <div className="grid grid-cols-2 gap-4">
                <NumberInputField
                  id="node-properties-ups-rated-current"
                  label="Rated Current (A)"
                  value={draft.ratedCurrentAmps}
                  onChange={(nextValue) => {
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      ratedCurrentAmps: nextValue
                    }));
                  }}
                  helperText="Optional output current rating."
                  errorText={ratedCurrentAmpsError}
                  optional
                />
                <NumberInputField
                  id="node-properties-ups-kva"
                  label="kVA Rating"
                  value={draft.kvaRating}
                  onChange={(nextValue) => {
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      kvaRating: nextValue
                    }));
                  }}
                  helperText="Optional apparent power rating."
                  errorText={kvaRatingError}
                  optional
                />
              </div>
              <NumberInputField
                id="node-properties-ups-runtime"
                label="Battery Runtime (min)"
                value={draft.batteryRuntimeMinutes}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    batteryRuntimeMinutes: nextValue
                  }));
                }}
                helperText="Optional ride-through duration preserved on the node."
                errorText={batteryRuntimeMinutesError}
                optional
              />
            </>
          ) : null}
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
