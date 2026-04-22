import { useEffect, useMemo, useState } from "react";
import {
  EDGE_LINE_SIDE,
  FAULT_TYPE,
  PROTECTION_MODE,
  TRIP_REASON,
  formatEdgeLineSide,
  formatFaultType,
  formatProtectionMode,
  getLoadSideForLineSide,
  normalizeFaultType,
  normalizeProtectionMode
} from "../engine/protectionModel";
import { normalizeEdgeData } from "../edges/edgeData";
import { EDGE_TYPE, normalizeCanvasEdgeType } from "../topology/edgeTypes";

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

function parseOptionalPositiveNumber(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue === "") {
    return undefined;
  }

  const numericValue = Number(trimmedValue.replace(/,/g, ""));
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

function stringifyOptionalNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
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
  optional = false,
  min = "1",
  step = "1"
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
        min={min}
        step={step}
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

function buildDraftFromEdge(edge) {
  const normalizedEdgeData = normalizeEdgeData(edge);

  return {
    protectionMode: normalizeProtectionMode(normalizedEdgeData.protectionMode),
    lineSide: normalizedEdgeData.lineSide,
    faultType: normalizeFaultType(normalizedEdgeData.faultType),
    ratedCurrentAmps: stringifyOptionalNumber(normalizedEdgeData.ratedCurrentAmps),
    interruptingRatingAmps: stringifyOptionalNumber(
      normalizedEdgeData.interruptingRatingAmps
    ),
    deviceFamily: normalizedEdgeData.deviceFamily ?? "",
    tripUnit: normalizedEdgeData.tripUnit ?? "",
    curveKey: normalizedEdgeData.curveKey ?? "",
    conductorImpedanceOhms: stringifyOptionalNumber(
      normalizedEdgeData.conductorImpedanceOhms
    )
  };
}

function EdgePropertiesModal({
  edge,
  sourceNodeLabel,
  targetNodeLabel,
  onApply,
  onClose
}) {
  const [draft, setDraft] = useState(() => buildDraftFromEdge(edge));

  useEffect(() => {
    setDraft(buildDraftFromEdge(edge));
  }, [edge]);

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

  const normalizedEdgeData = useMemo(() => normalizeEdgeData(edge), [edge]);
  const normalizedEdgeType = normalizeCanvasEdgeType(edge.type);
  const isProtective =
    normalizedEdgeType === EDGE_TYPE.BREAKER &&
    normalizedEdgeData.deviceKind !== "none";
  const ratedCurrentAmps = parseOptionalPositiveInteger(draft.ratedCurrentAmps);
  const interruptingRatingAmps = isProtective
    ? parseOptionalPositiveInteger(draft.interruptingRatingAmps)
    : undefined;
  const conductorImpedanceOhms = parseOptionalPositiveNumber(draft.conductorImpedanceOhms);
  const faultType = normalizeFaultType(draft.faultType);
  const lineSide = draft.lineSide === EDGE_LINE_SIDE.TARGET
    ? EDGE_LINE_SIDE.TARGET
    : EDGE_LINE_SIDE.SOURCE;
  const loadSide = getLoadSideForLineSide(lineSide);
  const protectionMode = normalizeProtectionMode(draft.protectionMode);
  const ratedCurrentAmpsError =
    ratedCurrentAmps === null ? "Enter a positive amp rating or leave blank." : "";
  const interruptingRatingAmpsError =
    isProtective && interruptingRatingAmps === null
      ? "Enter a positive interrupting rating or leave blank."
      : "";
  const conductorImpedanceOhmsError =
    conductorImpedanceOhms === null
      ? "Enter a positive impedance or leave blank."
      : "";
  const canApply =
    ratedCurrentAmps !== null &&
    interruptingRatingAmps !== null &&
    conductorImpedanceOhms !== null;

  function handleApply() {
    if (!canApply) {
      return;
    }

    onApply?.(edge.id, {
      protectionMode,
      lineSide,
      faultType,
      ratedCurrentAmps,
      interruptingRatingAmps,
      deviceFamily: draft.deviceFamily.trim(),
      tripUnit: draft.tripUnit.trim(),
      curveKey: draft.curveKey.trim(),
      conductorImpedanceOhms
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
        onClick={stopCanvasEvent}
      >
        <div className="border-b border-slate-700 px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Edge Properties
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-100">
            {isProtective ? "Protective Edge" : "Standard Wire"}
          </div>
          <div className="mt-1 text-xs text-slate-500">{edge.id}</div>
          <div className="mt-3 rounded border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
            <div>
              {sourceNodeLabel} -&gt; {targetNodeLabel}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
              {isProtective
                ? `State: ${normalizedEdgeData.breakerState.toUpperCase()}`
                : "Non-protective conductor"}
              {normalizedEdgeData.tripReason === TRIP_REASON.PROTECTION
                ? " | Tripped by Protection"
                : ""}
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <SelectField
            id="edge-properties-fault-state"
            label="Fault State"
            value={draft.faultType}
            onChange={(nextValue) => {
              setDraft((currentDraft) => ({
                ...currentDraft,
                faultType: nextValue
              }));
            }}
            options={[
              {
                value: FAULT_TYPE.NONE,
                label: formatFaultType(FAULT_TYPE.NONE)
              },
              {
                value: FAULT_TYPE.BOLTED,
                label: formatFaultType(FAULT_TYPE.BOLTED)
              }
            ]}
            helperText="Inject or clear a persistent edge-side bolted fault."
          />

          {isProtective ? (
            <>
              <SelectField
                id="edge-properties-protection-mode"
                label="Protection Mode"
                value={draft.protectionMode}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    protectionMode: nextValue
                  }));
                }}
                options={[
                  {
                    value: PROTECTION_MODE.IDEAL_SELECTIVE,
                    label: formatProtectionMode(PROTECTION_MODE.IDEAL_SELECTIVE)
                  },
                  {
                    value: PROTECTION_MODE.TCC,
                    label: formatProtectionMode(PROTECTION_MODE.TCC)
                  }
                ]}
                helperText="The current solver honors only ideal selective clearing; TCC is stored for later study work."
              />
              <SelectField
                id="edge-properties-line-side"
                label="Line Side Endpoint"
                value={draft.lineSide}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    lineSide: nextValue
                  }));
                }}
                options={[
                  {
                    value: EDGE_LINE_SIDE.SOURCE,
                    label: formatEdgeLineSide(EDGE_LINE_SIDE.SOURCE)
                  },
                  {
                    value: EDGE_LINE_SIDE.TARGET,
                    label: formatEdgeLineSide(EDGE_LINE_SIDE.TARGET)
                  }
                ]}
                helperText={`Load side resolves to ${formatEdgeLineSide(loadSide)} for backfeed-aware selective clearing.`}
              />
              <div className="grid grid-cols-2 gap-4">
                <NumberInputField
                  id="edge-properties-rated-current"
                  label="Rated Current (A)"
                  value={draft.ratedCurrentAmps}
                  onChange={(nextValue) => {
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      ratedCurrentAmps: nextValue
                    }));
                  }}
                  helperText="Optional device ampacity metadata."
                  errorText={ratedCurrentAmpsError}
                  optional
                />
                <NumberInputField
                  id="edge-properties-interrupting-rating"
                  label="Interrupting Rating (A)"
                  value={draft.interruptingRatingAmps}
                  onChange={(nextValue) => {
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      interruptingRatingAmps: nextValue
                    }));
                  }}
                  helperText="Reserved study field for later fault-duty checks."
                  errorText={interruptingRatingAmpsError}
                  optional
                />
              </div>
              <TextInputField
                id="edge-properties-device-family"
                label="Device Family"
                value={draft.deviceFamily}
                onChange={(nextValue) => {
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    deviceFamily: nextValue
                  }));
                }}
                helperText="Reserved identifier for later relay/trip-unit catalog lookups."
              />
              <div className="grid grid-cols-2 gap-4">
                <TextInputField
                  id="edge-properties-trip-unit"
                  label="Trip Unit"
                  value={draft.tripUnit}
                  onChange={(nextValue) => {
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      tripUnit: nextValue
                    }));
                  }}
                  helperText="Reserved trip-unit identifier."
                />
                <TextInputField
                  id="edge-properties-curve-key"
                  label="Curve Key"
                  value={draft.curveKey}
                  onChange={(nextValue) => {
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      curveKey: nextValue
                    }));
                  }}
                  helperText="Reserved TCC curve reference."
                />
              </div>
            </>
          ) : (
            <div className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
              Standard wires remain non-protective in v1. They carry faults and energy, but they never trip themselves.
            </div>
          )}

          <NumberInputField
            id="edge-properties-conductor-impedance"
            label="Conductor / Segment Impedance (Ohms)"
            value={draft.conductorImpedanceOhms}
            onChange={(nextValue) => {
              setDraft((currentDraft) => ({
                ...currentDraft,
                conductorImpedanceOhms: nextValue
              }));
            }}
            helperText="Reserved segment-study input for later fault-current calculations."
            errorText={conductorImpedanceOhmsError}
            optional
            min="0.0001"
            step="0.0001"
          />
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

export default EdgePropertiesModal;
