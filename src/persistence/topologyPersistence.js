import { extractVoltagesFromText, parseVoltageInput } from "../electrical/voltage";
import {
  BREAKER_STATE,
  EDGE_DEVICE_KIND,
  EDGE_LINE_SIDE,
  FAULT_TYPE,
  PROTECTION_MODE,
  TRIP_REASON
} from "../engine/protectionModel";
import { EDGE_TYPE } from "../topology/edgeTypes";
import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_HANDLE_ID
} from "../topology/transferSwitch";
import { normalizeGraphState } from "../nodes/nodeData";
import { TRANSFORMER_HANDLE_ID } from "../topology/transformer";
import { UPS_HANDLE_ID, UPS_OPERATING_MODE } from "../topology/ups";

export const TOPOLOGY_SCHEMA_VERSION = 1;

export const MOP_ACTION_TYPE = {
  TOGGLE_SOURCE: "TOGGLE_SOURCE",
  TOGGLE_BREAKER: "TOGGLE_BREAKER",
  THROW_TRANSFER_SWITCH: "THROW_TRANSFER_SWITCH",
  SET_UPS_MODE: "SET_UPS_MODE",
  DELETE_NODE: "DELETE_NODE",
  DELETE_EDGE: "DELETE_EDGE"
};

const SUPPORTED_NODE_TYPES = new Set([
  "utility",
  "generator",
  "mvsg",
  "ptx",
  "load",
  "switchboard",
  "transferSwitch",
  "ups",
  "mechanical"
]);

const SUPPORTED_BREAKER_STATES = new Set(Object.values(BREAKER_STATE));
const SUPPORTED_EDGE_DEVICE_KINDS = new Set(Object.values(EDGE_DEVICE_KIND));
const SUPPORTED_PROTECTION_MODES = new Set(Object.values(PROTECTION_MODE));
const SUPPORTED_EDGE_LINE_SIDES = new Set(Object.values(EDGE_LINE_SIDE));
const SUPPORTED_FAULT_TYPES = new Set(Object.values(FAULT_TYPE));
const SUPPORTED_TRIP_REASONS = new Set(Object.values(TRIP_REASON));
const SUPPORTED_TRANSFER_SWITCH_ACTIVE_SOURCES = new Set(
  Object.values(TRANSFER_SWITCH_ACTIVE_SOURCE)
);
const SUPPORTED_UPS_OPERATING_MODES = new Set(Object.values(UPS_OPERATING_MODE));
const SUPPORTED_TRANSFORMER_HANDLES = new Set(Object.values(TRANSFORMER_HANDLE_ID));
const SUPPORTED_UPS_HANDLES = new Set(Object.values(UPS_HANDLE_ID));
const SUPPORTED_EDGE_TYPES = new Set(Object.values(EDGE_TYPE));
const LEGACY_BREAKER_EDGE_TYPES = new Set([undefined, null, "", "default"]);
const SOURCE_NODE_TYPES = new Set(["utility", "generator"]);
const TRANSFER_SWITCH_NODE_TYPE = "transferSwitch";
const UPS_NODE_TYPE = "ups";
const TRANSFORMER_NODE_TYPE = "ptx";
const MAX_VALIDATION_SUMMARY_ISSUES = 8;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pushIssue(issues, path, message) {
  issues.push({ path, message });
}

function formatPath(path) {
  return path ? `${path}: ` : "";
}

function parseOptionalPositiveIntegerLike(value) {
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

function parseOptionalPositiveNumberLike(value) {
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

function validateOptionalStringField(value, path, issues) {
  if (value !== undefined && typeof value !== "string") {
    pushIssue(issues, path, "must be a string when provided.");
  }
}

function validateOptionalBooleanField(value, path, issues) {
  if (value !== undefined && typeof value !== "boolean") {
    pushIssue(issues, path, "must be a boolean when provided.");
  }
}

function validateOptionalEnumField(value, allowedValues, path, issues) {
  if (value !== undefined && !allowedValues.has(value)) {
    pushIssue(
      issues,
      path,
      `must be one of: ${Array.from(allowedValues).join(", ")}.`
    );
  }
}

function validateOptionalPositiveIntegerField(value, path, issues) {
  if (value === undefined) {
    return;
  }

  if (parseOptionalPositiveIntegerLike(value) === null) {
    pushIssue(issues, path, "must be a positive whole-number value when provided.");
  }
}

function validateOptionalPositiveNumberField(value, path, issues) {
  if (value === undefined) {
    return;
  }

  if (parseOptionalPositiveNumberLike(value) === null) {
    pushIssue(issues, path, "must be a positive numeric value when provided.");
  }
}

function validateRequiredVoltageField(value, path, issues, fallbackValue) {
  if (parseVoltageInput(value ?? fallbackValue) === null) {
    pushIssue(issues, path, "must resolve to a positive voltage.");
  }
}

function validateNodeData(node, nodePath, issues, isLegacyPayload) {
  const data = node.data;
  const dataPath = `${nodePath}.data`;

  validateOptionalStringField(data.label, `${dataPath}.label`, issues);
  validateOptionalEnumField(data.faultType, SUPPORTED_FAULT_TYPES, `${dataPath}.faultType`, issues);

  if (node.type === TRANSFORMER_NODE_TYPE) {
    const legacyRatioVoltages = isLegacyPayload
      ? extractVoltagesFromText(data.ratio)
      : [];

    validateRequiredVoltageField(
      data.primaryVoltage ?? legacyRatioVoltages[0],
      `${dataPath}.primaryVoltage`,
      issues
    );
    validateRequiredVoltageField(
      data.secondaryVoltage ?? legacyRatioVoltages[1],
      `${dataPath}.secondaryVoltage`,
      issues
    );
    validateOptionalPositiveNumberField(
      data.transformerImpedancePercent,
      `${dataPath}.transformerImpedancePercent`,
      issues
    );
    return;
  }

  validateRequiredVoltageField(
    data.nominalVoltage ?? (isLegacyPayload ? data.voltage : undefined),
    `${dataPath}.nominalVoltage`,
    issues
  );

  if (SOURCE_NODE_TYPES.has(node.type)) {
    validateOptionalStringField(data.syncGroup, `${dataPath}.syncGroup`, issues);
    validateOptionalBooleanField(data.isSourceOnline, `${dataPath}.isSourceOnline`, issues);
    validateOptionalPositiveIntegerField(
      data.availableFaultCurrentAmps,
      `${dataPath}.availableFaultCurrentAmps`,
      issues
    );
    return;
  }

  if (node.type === "mvsg") {
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues
    );
    return;
  }

  if (node.type === "load") {
    validateOptionalStringField(data.loadClass, `${dataPath}.loadClass`, issues);
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues
    );
    return;
  }

  if (node.type === "switchboard") {
    validateOptionalStringField(data.boardClass, `${dataPath}.boardClass`, issues);
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues
    );
    return;
  }

  if (node.type === TRANSFER_SWITCH_NODE_TYPE) {
    validateOptionalStringField(data.switchClass, `${dataPath}.switchClass`, issues);
    validateOptionalEnumField(
      data.activeSource,
      SUPPORTED_TRANSFER_SWITCH_ACTIVE_SOURCES,
      `${dataPath}.activeSource`,
      issues
    );
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues
    );
    return;
  }

  if (node.type === UPS_NODE_TYPE) {
    validateOptionalStringField(data.upsClass, `${dataPath}.upsClass`, issues);
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues
    );
    validateOptionalPositiveIntegerField(data.kvaRating, `${dataPath}.kvaRating`, issues);
    validateOptionalPositiveIntegerField(
      data.batteryRuntimeMinutes,
      `${dataPath}.batteryRuntimeMinutes`,
      issues
    );
    validateOptionalBooleanField(
      data.batteryAvailable,
      `${dataPath}.batteryAvailable`,
      issues
    );
    validateOptionalEnumField(
      data.operatingMode,
      SUPPORTED_UPS_OPERATING_MODES,
      `${dataPath}.operatingMode`,
      issues
    );
    validateOptionalStringField(data.syncGroup, `${dataPath}.syncGroup`, issues);
    return;
  }

  if (node.type === "mechanical") {
    validateOptionalStringField(
      data.mechanicalClass,
      `${dataPath}.mechanicalClass`,
      issues
    );
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues
    );
  }
}

function validateEdgeType(edgeType, edgePath, issues, isLegacyPayload) {
  if (SUPPORTED_EDGE_TYPES.has(edgeType)) {
    return;
  }

  if (isLegacyPayload && LEGACY_BREAKER_EDGE_TYPES.has(edgeType)) {
    return;
  }

  pushIssue(
    issues,
    `${edgePath}.type`,
    `must be "${EDGE_TYPE.BREAKER}" or "${EDGE_TYPE.STANDARD}".`
  );
}

function validateEdgeData(edge, edgePath, issues) {
  const data = edge.data;
  const dataPath = `${edgePath}.data`;

  validateOptionalEnumField(
    data.breakerState,
    SUPPORTED_BREAKER_STATES,
    `${dataPath}.breakerState`,
    issues
  );
  validateOptionalEnumField(
    data.deviceKind,
    SUPPORTED_EDGE_DEVICE_KINDS,
    `${dataPath}.deviceKind`,
    issues
  );
  validateOptionalEnumField(
    data.protectionMode,
    SUPPORTED_PROTECTION_MODES,
    `${dataPath}.protectionMode`,
    issues
  );
  validateOptionalEnumField(
    data.lineSide,
    SUPPORTED_EDGE_LINE_SIDES,
    `${dataPath}.lineSide`,
    issues
  );
  validateOptionalEnumField(
    data.faultType,
    SUPPORTED_FAULT_TYPES,
    `${dataPath}.faultType`,
    issues
  );
  validateOptionalEnumField(
    data.tripReason,
    SUPPORTED_TRIP_REASONS,
    `${dataPath}.tripReason`,
    issues
  );
  validateOptionalPositiveIntegerField(
    data.ratedCurrentAmps,
    `${dataPath}.ratedCurrentAmps`,
    issues
  );
  validateOptionalPositiveIntegerField(
    data.interruptingRatingAmps,
    `${dataPath}.interruptingRatingAmps`,
    issues
  );
  validateOptionalPositiveNumberField(
    data.conductorImpedanceOhms,
    `${dataPath}.conductorImpedanceOhms`,
    issues
  );
  validateOptionalStringField(data.deviceFamily, `${dataPath}.deviceFamily`, issues);
  validateOptionalStringField(data.tripUnit, `${dataPath}.tripUnit`, issues);
  validateOptionalStringField(data.curveKey, `${dataPath}.curveKey`, issues);
}

function validateEndpointHandle({
  nodeType,
  handleValue,
  allowedValues,
  path,
  issues,
  allowMissing,
  allowedLegacyValues = []
}) {
  if (handleValue === undefined || handleValue === null || handleValue === "") {
    if (!allowMissing) {
      pushIssue(issues, path, "is required for this endpoint.");
    }
    return;
  }

  if (typeof handleValue !== "string") {
    pushIssue(issues, path, "must be a string when provided.");
    return;
  }

  if (allowedValues.has(handleValue)) {
    return;
  }

  if (allowedLegacyValues.includes(handleValue)) {
    return;
  }

  pushIssue(
    issues,
    path,
    `is not a supported handle for ${nodeType} endpoints.`
  );
}

function validateHandleAssignments(edge, edgePath, nodeById, issues, isLegacyPayload) {
  const sourceNode = nodeById.get(edge.source);
  const targetNode = nodeById.get(edge.target);

  if (sourceNode?.type === TRANSFORMER_NODE_TYPE) {
    validateEndpointHandle({
      nodeType: TRANSFORMER_NODE_TYPE,
      handleValue: edge.sourceHandle,
      allowedValues: SUPPORTED_TRANSFORMER_HANDLES,
      path: `${edgePath}.sourceHandle`,
      issues,
      allowMissing: isLegacyPayload
    });
  }

  if (targetNode?.type === TRANSFORMER_NODE_TYPE) {
    validateEndpointHandle({
      nodeType: TRANSFORMER_NODE_TYPE,
      handleValue: edge.targetHandle,
      allowedValues: SUPPORTED_TRANSFORMER_HANDLES,
      path: `${edgePath}.targetHandle`,
      issues,
      allowMissing: isLegacyPayload
    });
  }

  if (sourceNode?.type === TRANSFER_SWITCH_NODE_TYPE) {
    validateEndpointHandle({
      nodeType: TRANSFER_SWITCH_NODE_TYPE,
      handleValue: edge.sourceHandle,
      allowedValues: new Set([TRANSFER_SWITCH_HANDLE_ID.OUTPUT]),
      path: `${edgePath}.sourceHandle`,
      issues,
      allowMissing: isLegacyPayload
    });
  }

  if (targetNode?.type === TRANSFER_SWITCH_NODE_TYPE) {
    validateEndpointHandle({
      nodeType: TRANSFER_SWITCH_NODE_TYPE,
      handleValue: edge.targetHandle,
      allowedValues: new Set([
        TRANSFER_SWITCH_HANDLE_ID.PRIMARY,
        TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
      ]),
      path: `${edgePath}.targetHandle`,
      issues,
      allowMissing: isLegacyPayload,
      allowedLegacyValues: isLegacyPayload
        ? [TRANSFER_SWITCH_HANDLE_ID.LEGACY_INPUT]
        : []
    });
  }

  if (sourceNode?.type === UPS_NODE_TYPE) {
    validateEndpointHandle({
      nodeType: UPS_NODE_TYPE,
      handleValue: edge.sourceHandle,
      allowedValues: new Set([UPS_HANDLE_ID.OUTPUT]),
      path: `${edgePath}.sourceHandle`,
      issues,
      allowMissing: isLegacyPayload
    });
  }

  if (targetNode?.type === UPS_NODE_TYPE) {
    validateEndpointHandle({
      nodeType: UPS_NODE_TYPE,
      handleValue: edge.targetHandle,
      allowedValues: new Set([UPS_HANDLE_ID.INPUT]),
      path: `${edgePath}.targetHandle`,
      issues,
      allowMissing: isLegacyPayload
    });
  }
}

function validateGraphState(graphValue, graphPath, issues, isLegacyPayload) {
  if (!isPlainObject(graphValue)) {
    pushIssue(issues, graphPath, "must be an object containing nodes and edges.");
    return;
  }

  if (!Array.isArray(graphValue.nodes)) {
    pushIssue(issues, `${graphPath}.nodes`, "must be an array.");
  }

  if (!Array.isArray(graphValue.edges)) {
    pushIssue(issues, `${graphPath}.edges`, "must be an array.");
  }

  if (!Array.isArray(graphValue.nodes) || !Array.isArray(graphValue.edges)) {
    return;
  }

  const nodeById = new Map();
  const seenNodeIds = new Set();

  graphValue.nodes.forEach((node, index) => {
    const nodePath = `${graphPath}.nodes[${index}]`;

    if (!isPlainObject(node)) {
      pushIssue(issues, nodePath, "must be an object.");
      return;
    }

    if (typeof node.id !== "string" || node.id.trim() === "") {
      pushIssue(issues, `${nodePath}.id`, "must be a non-empty string.");
    } else if (seenNodeIds.has(node.id)) {
      pushIssue(issues, `${nodePath}.id`, `duplicates node id "${node.id}".`);
    } else {
      seenNodeIds.add(node.id);
      nodeById.set(node.id, node);
    }

    if (!SUPPORTED_NODE_TYPES.has(node.type)) {
      pushIssue(issues, `${nodePath}.type`, "is not a supported equipment type.");
    }

    if (!isPlainObject(node.position)) {
      pushIssue(issues, `${nodePath}.position`, "must be an object with finite x/y.");
    } else {
      if (
        typeof node.position.x !== "number" ||
        !Number.isFinite(node.position.x)
      ) {
        pushIssue(issues, `${nodePath}.position.x`, "must be a finite number.");
      }

      if (
        typeof node.position.y !== "number" ||
        !Number.isFinite(node.position.y)
      ) {
        pushIssue(issues, `${nodePath}.position.y`, "must be a finite number.");
      }
    }

    if (!isPlainObject(node.data)) {
      pushIssue(issues, `${nodePath}.data`, "must be an object.");
      return;
    }

    if (SUPPORTED_NODE_TYPES.has(node.type)) {
      validateNodeData(node, nodePath, issues, isLegacyPayload);
    }
  });

  const seenEdgeIds = new Set();

  graphValue.edges.forEach((edge, index) => {
    const edgePath = `${graphPath}.edges[${index}]`;

    if (!isPlainObject(edge)) {
      pushIssue(issues, edgePath, "must be an object.");
      return;
    }

    if (typeof edge.id !== "string" || edge.id.trim() === "") {
      pushIssue(issues, `${edgePath}.id`, "must be a non-empty string.");
    } else if (seenEdgeIds.has(edge.id)) {
      pushIssue(issues, `${edgePath}.id`, `duplicates edge id "${edge.id}".`);
    } else {
      seenEdgeIds.add(edge.id);
    }

    if (typeof edge.source !== "string" || edge.source.trim() === "") {
      pushIssue(issues, `${edgePath}.source`, "must be a non-empty node id string.");
    } else if (!nodeById.has(edge.source)) {
      pushIssue(
        issues,
        `${edgePath}.source`,
        `references missing node "${edge.source}".`
      );
    }

    if (typeof edge.target !== "string" || edge.target.trim() === "") {
      pushIssue(issues, `${edgePath}.target`, "must be a non-empty node id string.");
    } else if (!nodeById.has(edge.target)) {
      pushIssue(
        issues,
        `${edgePath}.target`,
        `references missing node "${edge.target}".`
      );
    }

    validateEdgeType(edge.type, edgePath, issues, isLegacyPayload);

    if (!isPlainObject(edge.data)) {
      pushIssue(issues, `${edgePath}.data`, "must be an object.");
      return;
    }

    validateEdgeData(edge, edgePath, issues);
    validateHandleAssignments(edge, edgePath, nodeById, issues, isLegacyPayload);
  });
}

function validateMopTargetState(step, stepPath, issues) {
  if (step.actionType === MOP_ACTION_TYPE.TOGGLE_SOURCE) {
    if (typeof step.targetState !== "boolean") {
      pushIssue(issues, `${stepPath}.targetState`, "must be a boolean.");
    }
    return;
  }

  if (step.actionType === MOP_ACTION_TYPE.TOGGLE_BREAKER) {
    if (
      step.targetState !== BREAKER_STATE.OPEN &&
      step.targetState !== BREAKER_STATE.CLOSED
    ) {
      pushIssue(
        issues,
        `${stepPath}.targetState`,
        `must be "${BREAKER_STATE.OPEN}" or "${BREAKER_STATE.CLOSED}".`
      );
    }
    return;
  }

  if (step.actionType === MOP_ACTION_TYPE.THROW_TRANSFER_SWITCH) {
    if (!SUPPORTED_TRANSFER_SWITCH_ACTIVE_SOURCES.has(step.targetState)) {
      pushIssue(
        issues,
        `${stepPath}.targetState`,
        `must be one of: ${Array.from(SUPPORTED_TRANSFER_SWITCH_ACTIVE_SOURCES).join(", ")}.`
      );
    }
    return;
  }

  if (step.actionType === MOP_ACTION_TYPE.SET_UPS_MODE) {
    if (!SUPPORTED_UPS_OPERATING_MODES.has(step.targetState)) {
      pushIssue(
        issues,
        `${stepPath}.targetState`,
        `must be one of: ${Array.from(SUPPORTED_UPS_OPERATING_MODES).join(", ")}.`
      );
    }
    return;
  }

  if (step.targetState !== "deleted") {
    pushIssue(issues, `${stepPath}.targetState`, 'must be "deleted".');
  }
}

function normalizeMopTargetState(actionType, targetState) {
  if (actionType === MOP_ACTION_TYPE.TOGGLE_SOURCE) {
    return targetState === true;
  }

  if (actionType === MOP_ACTION_TYPE.THROW_TRANSFER_SWITCH) {
    return targetState === TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
      ? TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
      : TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY;
  }

  if (actionType === MOP_ACTION_TYPE.SET_UPS_MODE) {
    if (targetState === UPS_OPERATING_MODE.BATTERY) {
      return UPS_OPERATING_MODE.BATTERY;
    }

    if (targetState === UPS_OPERATING_MODE.BYPASS) {
      return UPS_OPERATING_MODE.BYPASS;
    }

    return UPS_OPERATING_MODE.NORMAL;
  }

  if (
    actionType === MOP_ACTION_TYPE.DELETE_NODE ||
    actionType === MOP_ACTION_TYPE.DELETE_EDGE
  ) {
    return "deleted";
  }

  return targetState === BREAKER_STATE.CLOSED
    ? BREAKER_STATE.CLOSED
    : BREAKER_STATE.OPEN;
}

function getDefaultMopActionText(actionType, targetId, targetState) {
  if (actionType === MOP_ACTION_TYPE.TOGGLE_SOURCE) {
    return targetState ? `Restored ${targetId}` : `Killed ${targetId}`;
  }

  if (actionType === MOP_ACTION_TYPE.THROW_TRANSFER_SWITCH) {
    return targetState === TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
      ? `Transfer ${targetId} to Emergency`
      : `Transfer ${targetId} to Primary`;
  }

  if (actionType === MOP_ACTION_TYPE.SET_UPS_MODE) {
    if (targetState === UPS_OPERATING_MODE.BATTERY) {
      return `Set ${targetId} to Battery`;
    }

    if (targetState === UPS_OPERATING_MODE.BYPASS) {
      return `Set ${targetId} to Bypass`;
    }

    return `Set ${targetId} to Normal`;
  }

  if (
    actionType === MOP_ACTION_TYPE.DELETE_NODE ||
    actionType === MOP_ACTION_TYPE.DELETE_EDGE
  ) {
    return `Deleted ${targetId}`;
  }

  return targetState === BREAKER_STATE.CLOSED
    ? `Closed Breaker ${targetId}`
    : `Opened Breaker ${targetId}`;
}

function normalizeValidatedMopSteps(mopSteps) {
  return (Array.isArray(mopSteps) ? mopSteps : []).map((step) => {
    const normalizedTargetState = normalizeMopTargetState(
      step.actionType,
      step.targetState
    );

    return {
      targetId: step.targetId,
      actionType: step.actionType,
      targetState: normalizedTargetState,
      actionText:
        typeof step.actionText === "string" && step.actionText.trim() !== ""
          ? step.actionText
          : getDefaultMopActionText(
              step.actionType,
              step.targetId,
              normalizedTargetState
            ),
      snapshot: cloneGraphState(normalizeGraphState(step.snapshot))
    };
  });
}

export function createBlankAppState() {
  return {
    nodes: [],
    edges: [],
    mopSteps: [],
    mopBaseSnapshot: null
  };
}

export function cloneGraphState(graphState) {
  return JSON.parse(
    JSON.stringify({
      nodes: graphState.nodes,
      edges: graphState.edges
    })
  );
}

export function serializeGraphState(graphState) {
  return JSON.stringify({
    nodes: graphState.nodes,
    edges: graphState.edges
  });
}

export function createPersistedAppState(appState) {
  return {
    schemaVersion: TOPOLOGY_SCHEMA_VERSION,
    nodes: appState.nodes,
    edges: appState.edges,
    mopSteps: appState.mopSteps,
    mopBaseSnapshot: appState.mopBaseSnapshot
  };
}

export function serializePersistedAppState(appState, pretty = false) {
  return JSON.stringify(
    createPersistedAppState(appState),
    null,
    pretty ? 2 : undefined
  );
}

export function validatePersistedAppState(value) {
  const issues = [];

  if (!isPlainObject(value)) {
    pushIssue(issues, "", "Topology payload must be an object.");
    return {
      isValid: false,
      issues,
      isLegacyPayload: false
    };
  }

  const schemaVersion = value.schemaVersion;
  const isLegacyPayload = schemaVersion === undefined;

  if (!isLegacyPayload && schemaVersion !== TOPOLOGY_SCHEMA_VERSION) {
    pushIssue(
      issues,
      "schemaVersion",
      `must be ${TOPOLOGY_SCHEMA_VERSION} or omitted for legacy payloads.`
    );
  }

  validateGraphState(value, "payload", issues, isLegacyPayload);

  if (value.mopBaseSnapshot !== undefined && value.mopBaseSnapshot !== null) {
    validateGraphState(
      value.mopBaseSnapshot,
      "payload.mopBaseSnapshot",
      issues,
      isLegacyPayload
    );
  }

  if (value.mopSteps !== undefined && !Array.isArray(value.mopSteps)) {
    pushIssue(issues, "payload.mopSteps", "must be an array when provided.");
  }

  if (Array.isArray(value.mopSteps)) {
    if (
      value.mopSteps.length > 0 &&
      (value.mopBaseSnapshot === null || value.mopBaseSnapshot === undefined)
    ) {
      pushIssue(
        issues,
        "payload.mopBaseSnapshot",
        "must be a graph snapshot when mopSteps are present."
      );
    }

    value.mopSteps.forEach((step, index) => {
      const stepPath = `payload.mopSteps[${index}]`;

      if (!isPlainObject(step)) {
        pushIssue(issues, stepPath, "must be an object.");
        return;
      }

      if (typeof step.targetId !== "string" || step.targetId.trim() === "") {
        pushIssue(issues, `${stepPath}.targetId`, "must be a non-empty string.");
      }

      if (!Object.values(MOP_ACTION_TYPE).includes(step.actionType)) {
        pushIssue(issues, `${stepPath}.actionType`, "is not a supported MOP action.");
      } else {
        validateMopTargetState(step, stepPath, issues);
      }

      if (step.actionText !== undefined && typeof step.actionText !== "string") {
        pushIssue(issues, `${stepPath}.actionText`, "must be a string when provided.");
      }

      validateGraphState(step.snapshot, `${stepPath}.snapshot`, issues, isLegacyPayload);
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
    isLegacyPayload
  };
}

export function parsePersistedAppState(value) {
  const validation = validatePersistedAppState(value);

  if (!validation.isValid) {
    return {
      ok: false,
      issues: validation.issues,
      isLegacyPayload: validation.isLegacyPayload
    };
  }

  const normalizedGraph = normalizeGraphState(value);
  const mopBaseSnapshot =
    value.mopBaseSnapshot && isPlainObject(value.mopBaseSnapshot)
      ? cloneGraphState(normalizeGraphState(value.mopBaseSnapshot))
      : null;
  const mopSteps =
    mopBaseSnapshot === null
      ? []
      : normalizeValidatedMopSteps(Array.isArray(value.mopSteps) ? value.mopSteps : []);

  return {
    ok: true,
    appState: {
      nodes: normalizedGraph.nodes,
      edges: normalizedGraph.edges,
      mopSteps,
      mopBaseSnapshot
    },
    isLegacyPayload: validation.isLegacyPayload
  };
}

export function deserializePersistedAppStateJson(rawText) {
  try {
    const parsedValue = JSON.parse(rawText);
    return parsePersistedAppState(parsedValue);
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          message: "Topology payload is not valid JSON."
        }
      ],
      parseError: error
    };
  }
}

export function formatPersistedAppStateValidationSummary(
  issues,
  label = "Topology import"
) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return `${label} rejected.`;
  }

  const visibleIssues = issues.slice(0, MAX_VALIDATION_SUMMARY_ISSUES);
  const summaryLines = visibleIssues.map(
    (issue, index) => `${index + 1}. ${formatPath(issue.path)}${issue.message}`
  );
  const remainingIssueCount = issues.length - visibleIssues.length;

  if (remainingIssueCount > 0) {
    summaryLines.push(`...and ${remainingIssueCount} more issue(s).`);
  }

  return `${label} rejected.\n\n${summaryLines.join("\n")}`;
}
