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
  TRANSFER_SWITCH_CONTROL_MODE,
  TRANSFER_SWITCH_HANDLE_ID
} from "../topology/transferSwitch";
import { TRANSFER_SWITCH_RETRANSFER_POLICY } from "../topology/transferSwitch";
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

export const VALIDATION_SEVERITY = {
  ERROR: "error"
};

export const VALIDATION_SOURCE = {
  LIVE: "live",
  IMPORT: "import",
  STORAGE: "storage"
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
const SUPPORTED_TRANSFER_SWITCH_CONTROL_MODES = new Set(
  Object.values(TRANSFER_SWITCH_CONTROL_MODE)
);
const SUPPORTED_TRANSFER_SWITCH_RETRANSFER_POLICIES = new Set(
  Object.values(TRANSFER_SWITCH_RETRANSFER_POLICY)
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

function normalizeIssueIds(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }

  return Array.from(
    new Set(
      ids.filter((value) => typeof value === "string" && value.trim() !== "")
    )
  );
}

function createValidationContext(source) {
  return {
    source
  };
}

function pushIssue(
  issues,
  context,
  path,
  message,
  {
    code = "invalid-topology",
    severity = VALIDATION_SEVERITY.ERROR,
    nodeIds = [],
    edgeIds = []
  } = {}
) {
  issues.push({
    code,
    severity,
    source: context.source,
    path,
    message,
    nodeIds: normalizeIssueIds(nodeIds),
    edgeIds: normalizeIssueIds(edgeIds)
  });
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

function parseOptionalNonNegativeIntegerLike(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
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
  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.round(numericValue) : null;
}

function validateOptionalStringField(value, path, issues, context, issueOptions) {
  if (value !== undefined && typeof value !== "string") {
    pushIssue(issues, context, path, "must be a string when provided.", issueOptions);
  }
}

function validateOptionalBooleanField(value, path, issues, context, issueOptions) {
  if (value !== undefined && typeof value !== "boolean") {
    pushIssue(issues, context, path, "must be a boolean when provided.", issueOptions);
  }
}

function validateOptionalEnumField(
  value,
  allowedValues,
  path,
  issues,
  context,
  issueOptions
) {
  if (value !== undefined && !allowedValues.has(value)) {
    pushIssue(
      issues,
      context,
      path,
      `must be one of: ${Array.from(allowedValues).join(", ")}.`,
      issueOptions
    );
  }
}

function validateOptionalPositiveIntegerField(value, path, issues, context, issueOptions) {
  if (value === undefined) {
    return;
  }

  if (parseOptionalPositiveIntegerLike(value) === null) {
    pushIssue(
      issues,
      context,
      path,
      "must be a positive whole-number value when provided.",
      issueOptions
    );
  }
}

function validateOptionalPositiveNumberField(value, path, issues, context, issueOptions) {
  if (value === undefined) {
    return;
  }

  if (parseOptionalPositiveNumberLike(value) === null) {
    pushIssue(
      issues,
      context,
      path,
      "must be a positive numeric value when provided.",
      issueOptions
    );
  }
}

function validateOptionalNonNegativeIntegerField(
  value,
  path,
  issues,
  context,
  issueOptions
) {
  if (value === undefined) {
    return;
  }

  if (parseOptionalNonNegativeIntegerLike(value) === null) {
    pushIssue(
      issues,
      context,
      path,
      "must be a non-negative whole-number value when provided.",
      issueOptions
    );
  }
}

function validateRequiredVoltageField(
  value,
  path,
  issues,
  context,
  issueOptions,
  fallbackValue
) {
  if (parseVoltageInput(value ?? fallbackValue) === null) {
    pushIssue(
      issues,
      context,
      path,
      "must resolve to a positive voltage.",
      issueOptions
    );
  }
}

function validateNodeData(node, nodePath, issues, context, isLegacyPayload) {
  const data = node.data;
  const dataPath = `${nodePath}.data`;
  const issueOptions = {
    code: "invalid-node-metadata",
    nodeIds: [node.id]
  };

  validateOptionalStringField(
    data.label,
    `${dataPath}.label`,
    issues,
    context,
    issueOptions
  );
  validateOptionalEnumField(
    data.faultType,
    SUPPORTED_FAULT_TYPES,
    `${dataPath}.faultType`,
    issues,
    context,
    issueOptions
  );

  if (node.type === TRANSFORMER_NODE_TYPE) {
    const legacyRatioVoltages = isLegacyPayload
      ? extractVoltagesFromText(data.ratio)
      : [];

    validateRequiredVoltageField(
      data.primaryVoltage ?? legacyRatioVoltages[0],
      `${dataPath}.primaryVoltage`,
      issues,
      context,
      issueOptions,
      undefined
    );
    validateRequiredVoltageField(
      data.secondaryVoltage ?? legacyRatioVoltages[1],
      `${dataPath}.secondaryVoltage`,
      issues,
      context,
      issueOptions,
      undefined
    );
    validateOptionalPositiveNumberField(
      data.transformerImpedancePercent,
      `${dataPath}.transformerImpedancePercent`,
      issues,
      context,
      issueOptions
    );
    return;
  }

  validateRequiredVoltageField(
    data.nominalVoltage ?? (isLegacyPayload ? data.voltage : undefined),
    `${dataPath}.nominalVoltage`,
    issues,
    context,
    issueOptions,
    undefined
  );

  if (SOURCE_NODE_TYPES.has(node.type)) {
    validateOptionalStringField(
      data.syncGroup,
      `${dataPath}.syncGroup`,
      issues,
      context,
      issueOptions
    );
    validateOptionalBooleanField(
      data.isSourceOnline,
      `${dataPath}.isSourceOnline`,
      issues,
      context,
      issueOptions
    );
    validateOptionalPositiveIntegerField(
      data.availableFaultCurrentAmps,
      `${dataPath}.availableFaultCurrentAmps`,
      issues,
      context,
      issueOptions
    );
    return;
  }

  if (node.type === "mvsg") {
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues,
      context,
      issueOptions
    );
    return;
  }

  if (node.type === "load") {
    validateOptionalStringField(
      data.loadClass,
      `${dataPath}.loadClass`,
      issues,
      context,
      issueOptions
    );
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues,
      context,
      issueOptions
    );
    return;
  }

  if (node.type === "switchboard") {
    validateOptionalStringField(
      data.boardClass,
      `${dataPath}.boardClass`,
      issues,
      context,
      issueOptions
    );
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues,
      context,
      issueOptions
    );
    return;
  }

  if (node.type === TRANSFER_SWITCH_NODE_TYPE) {
    validateOptionalStringField(
      data.switchClass,
      `${dataPath}.switchClass`,
      issues,
      context,
      issueOptions
    );
    validateOptionalEnumField(
      data.activeSource,
      SUPPORTED_TRANSFER_SWITCH_ACTIVE_SOURCES,
      `${dataPath}.activeSource`,
      issues,
      context,
      issueOptions
    );
    validateOptionalEnumField(
      data.controlMode,
      SUPPORTED_TRANSFER_SWITCH_CONTROL_MODES,
      `${dataPath}.controlMode`,
      issues,
      context,
      issueOptions
    );
    validateOptionalEnumField(
      data.retransferPolicy,
      SUPPORTED_TRANSFER_SWITCH_RETRANSFER_POLICIES,
      `${dataPath}.retransferPolicy`,
      issues,
      context,
      issueOptions
    );
    validateOptionalNonNegativeIntegerField(
      data.transferDelaySeconds,
      `${dataPath}.transferDelaySeconds`,
      issues,
      context,
      issueOptions
    );
    validateOptionalNonNegativeIntegerField(
      data.retransferDelaySeconds,
      `${dataPath}.retransferDelaySeconds`,
      issues,
      context,
      issueOptions
    );
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues,
      context,
      issueOptions
    );
    return;
  }

  if (node.type === UPS_NODE_TYPE) {
    validateOptionalStringField(
      data.upsClass,
      `${dataPath}.upsClass`,
      issues,
      context,
      issueOptions
    );
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues,
      context,
      issueOptions
    );
    validateOptionalPositiveIntegerField(
      data.kvaRating,
      `${dataPath}.kvaRating`,
      issues,
      context,
      issueOptions
    );
    validateOptionalPositiveIntegerField(
      data.batteryRuntimeMinutes,
      `${dataPath}.batteryRuntimeMinutes`,
      issues,
      context,
      issueOptions
    );
    validateOptionalBooleanField(
      data.batteryAvailable,
      `${dataPath}.batteryAvailable`,
      issues,
      context,
      issueOptions
    );
    validateOptionalEnumField(
      data.operatingMode,
      SUPPORTED_UPS_OPERATING_MODES,
      `${dataPath}.operatingMode`,
      issues,
      context,
      issueOptions
    );
    validateOptionalStringField(
      data.syncGroup,
      `${dataPath}.syncGroup`,
      issues,
      context,
      issueOptions
    );
    return;
  }

  if (node.type === "mechanical") {
    validateOptionalStringField(
      data.mechanicalClass,
      `${dataPath}.mechanicalClass`,
      issues,
      context,
      issueOptions
    );
    validateOptionalPositiveIntegerField(
      data.ratedCurrentAmps,
      `${dataPath}.ratedCurrentAmps`,
      issues,
      context,
      issueOptions
    );
  }
}

function validateEdgeType(edgeType, edgePath, issues, context, isLegacyPayload, edgeId) {
  if (SUPPORTED_EDGE_TYPES.has(edgeType)) {
    return;
  }

  if (isLegacyPayload && LEGACY_BREAKER_EDGE_TYPES.has(edgeType)) {
    return;
  }

  pushIssue(
    issues,
    context,
    `${edgePath}.type`,
    `must be "${EDGE_TYPE.BREAKER}" or "${EDGE_TYPE.STANDARD}".`,
    {
      code: "invalid-edge-type",
      edgeIds: [edgeId]
    }
  );
}

function validateEdgeData(edge, edgePath, issues, context) {
  const data = edge.data;
  const dataPath = `${edgePath}.data`;
  const issueOptions = {
    code: "invalid-edge-metadata",
    edgeIds: [edge.id],
    nodeIds: [edge.source, edge.target]
  };

  validateOptionalEnumField(
    data.breakerState,
    SUPPORTED_BREAKER_STATES,
    `${dataPath}.breakerState`,
    issues,
    context,
    issueOptions
  );
  validateOptionalEnumField(
    data.deviceKind,
    SUPPORTED_EDGE_DEVICE_KINDS,
    `${dataPath}.deviceKind`,
    issues,
    context,
    issueOptions
  );
  validateOptionalEnumField(
    data.protectionMode,
    SUPPORTED_PROTECTION_MODES,
    `${dataPath}.protectionMode`,
    issues,
    context,
    issueOptions
  );
  validateOptionalEnumField(
    data.lineSide,
    SUPPORTED_EDGE_LINE_SIDES,
    `${dataPath}.lineSide`,
    issues,
    context,
    issueOptions
  );
  validateOptionalEnumField(
    data.faultType,
    SUPPORTED_FAULT_TYPES,
    `${dataPath}.faultType`,
    issues,
    context,
    issueOptions
  );
  validateOptionalEnumField(
    data.tripReason,
    SUPPORTED_TRIP_REASONS,
    `${dataPath}.tripReason`,
    issues,
    context,
    issueOptions
  );
  validateOptionalPositiveIntegerField(
    data.ratedCurrentAmps,
    `${dataPath}.ratedCurrentAmps`,
    issues,
    context,
    issueOptions
  );
  validateOptionalPositiveIntegerField(
    data.interruptingRatingAmps,
    `${dataPath}.interruptingRatingAmps`,
    issues,
    context,
    issueOptions
  );
  validateOptionalPositiveNumberField(
    data.conductorImpedanceOhms,
    `${dataPath}.conductorImpedanceOhms`,
    issues,
    context,
    issueOptions
  );
  validateOptionalStringField(
    data.deviceFamily,
    `${dataPath}.deviceFamily`,
    issues,
    context,
    issueOptions
  );
  validateOptionalStringField(
    data.tripUnit,
    `${dataPath}.tripUnit`,
    issues,
    context,
    issueOptions
  );
  validateOptionalStringField(
    data.curveKey,
    `${dataPath}.curveKey`,
    issues,
    context,
    issueOptions
  );
}

function validateEndpointHandle({
  nodeType,
  handleValue,
  allowedValues,
  path,
  issues,
  context,
  issueOptions,
  allowMissing,
  allowedLegacyValues = []
}) {
  if (handleValue === undefined || handleValue === null || handleValue === "") {
    if (!allowMissing) {
      pushIssue(issues, context, path, "is required for this endpoint.", issueOptions);
    }
    return;
  }

  if (typeof handleValue !== "string") {
    pushIssue(issues, context, path, "must be a string when provided.", issueOptions);
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
    context,
    path,
    `is not a supported handle for ${nodeType} endpoints.`,
    issueOptions
  );
}

function validateHandleAssignments(
  edge,
  edgePath,
  nodeById,
  issues,
  context,
  isLegacyPayload
) {
  const sourceNode = nodeById.get(edge.source);
  const targetNode = nodeById.get(edge.target);
  const issueOptions = {
    code: "invalid-handle-assignment",
    edgeIds: [edge.id],
    nodeIds: [edge.source, edge.target]
  };

  if (sourceNode?.type === TRANSFORMER_NODE_TYPE) {
    validateEndpointHandle({
      nodeType: TRANSFORMER_NODE_TYPE,
      handleValue: edge.sourceHandle,
      allowedValues: SUPPORTED_TRANSFORMER_HANDLES,
      path: `${edgePath}.sourceHandle`,
      issues,
      context,
      issueOptions,
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
      context,
      issueOptions,
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
      context,
      issueOptions,
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
      context,
      issueOptions,
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
      context,
      issueOptions,
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
      context,
      issueOptions,
      allowMissing: isLegacyPayload
    });
  }
}

function validateGraphState(graphValue, graphPath, issues, context, isLegacyPayload) {
  if (!isPlainObject(graphValue)) {
    pushIssue(
      issues,
      context,
      graphPath,
      "must be an object containing nodes and edges.",
      {
        code: "invalid-graph-shape"
      }
    );
    return;
  }

  if (!Array.isArray(graphValue.nodes)) {
    pushIssue(issues, context, `${graphPath}.nodes`, "must be an array.", {
      code: "invalid-graph-shape"
    });
  }

  if (!Array.isArray(graphValue.edges)) {
    pushIssue(issues, context, `${graphPath}.edges`, "must be an array.", {
      code: "invalid-graph-shape"
    });
  }

  if (!Array.isArray(graphValue.nodes) || !Array.isArray(graphValue.edges)) {
    return;
  }

  const nodeById = new Map();
  const seenNodeIds = new Set();

  graphValue.nodes.forEach((node, index) => {
    const nodePath = `${graphPath}.nodes[${index}]`;

    if (!isPlainObject(node)) {
      pushIssue(issues, context, nodePath, "must be an object.", {
        code: "invalid-node-shape"
      });
      return;
    }

    const nodeId =
      typeof node.id === "string" && node.id.trim() !== "" ? node.id : null;
    const nodeIssueOptions = nodeId
      ? {
          nodeIds: [nodeId]
        }
      : {};

    if (!nodeId) {
      pushIssue(issues, context, `${nodePath}.id`, "must be a non-empty string.", {
        code: "invalid-node-id"
      });
    } else if (seenNodeIds.has(nodeId)) {
      pushIssue(
        issues,
        context,
        `${nodePath}.id`,
        `duplicates node id "${nodeId}".`,
        {
          code: "duplicate-node-id",
          nodeIds: [nodeId]
        }
      );
    } else {
      seenNodeIds.add(nodeId);
      nodeById.set(nodeId, node);
    }

    if (!SUPPORTED_NODE_TYPES.has(node.type)) {
      pushIssue(
        issues,
        context,
        `${nodePath}.type`,
        "is not a supported equipment type.",
        {
          code: "invalid-node-type",
          ...nodeIssueOptions
        }
      );
    }

    if (!isPlainObject(node.position)) {
      pushIssue(
        issues,
        context,
        `${nodePath}.position`,
        "must be an object with finite x/y.",
        {
          code: "invalid-node-shape",
          ...nodeIssueOptions
        }
      );
    } else {
      if (typeof node.position.x !== "number" || !Number.isFinite(node.position.x)) {
        pushIssue(
          issues,
          context,
          `${nodePath}.position.x`,
          "must be a finite number.",
          {
            code: "invalid-node-shape",
            ...nodeIssueOptions
          }
        );
      }

      if (typeof node.position.y !== "number" || !Number.isFinite(node.position.y)) {
        pushIssue(
          issues,
          context,
          `${nodePath}.position.y`,
          "must be a finite number.",
          {
            code: "invalid-node-shape",
            ...nodeIssueOptions
          }
        );
      }
    }

    if (!isPlainObject(node.data)) {
      pushIssue(issues, context, `${nodePath}.data`, "must be an object.", {
        code: "invalid-node-shape",
        ...nodeIssueOptions
      });
      return;
    }

    if (SUPPORTED_NODE_TYPES.has(node.type)) {
      validateNodeData(node, nodePath, issues, context, isLegacyPayload);
    }
  });

  const seenEdgeIds = new Set();

  graphValue.edges.forEach((edge, index) => {
    const edgePath = `${graphPath}.edges[${index}]`;

    if (!isPlainObject(edge)) {
      pushIssue(issues, context, edgePath, "must be an object.", {
        code: "invalid-edge-shape"
      });
      return;
    }

    const edgeId =
      typeof edge.id === "string" && edge.id.trim() !== "" ? edge.id : null;
    const edgeIssueOptions = edgeId
      ? {
          edgeIds: [edgeId]
        }
      : {};

    if (!edgeId) {
      pushIssue(issues, context, `${edgePath}.id`, "must be a non-empty string.", {
        code: "invalid-edge-id"
      });
    } else if (seenEdgeIds.has(edgeId)) {
      pushIssue(
        issues,
        context,
        `${edgePath}.id`,
        `duplicates edge id "${edgeId}".`,
        {
          code: "duplicate-edge-id",
          edgeIds: [edgeId]
        }
      );
    } else {
      seenEdgeIds.add(edgeId);
    }

    if (typeof edge.source !== "string" || edge.source.trim() === "") {
      pushIssue(
        issues,
        context,
        `${edgePath}.source`,
        "must be a non-empty node id string.",
        {
          code: "invalid-edge-shape",
          ...edgeIssueOptions
        }
      );
    } else if (!nodeById.has(edge.source)) {
      pushIssue(
        issues,
        context,
        `${edgePath}.source`,
        `references missing node "${edge.source}".`,
        {
          code: "missing-node-reference",
          edgeIds: edgeId ? [edgeId] : [],
          nodeIds: [edge.source]
        }
      );
    }

    if (typeof edge.target !== "string" || edge.target.trim() === "") {
      pushIssue(
        issues,
        context,
        `${edgePath}.target`,
        "must be a non-empty node id string.",
        {
          code: "invalid-edge-shape",
          ...edgeIssueOptions
        }
      );
    } else if (!nodeById.has(edge.target)) {
      pushIssue(
        issues,
        context,
        `${edgePath}.target`,
        `references missing node "${edge.target}".`,
        {
          code: "missing-node-reference",
          edgeIds: edgeId ? [edgeId] : [],
          nodeIds: [edge.target]
        }
      );
    }

    validateEdgeType(edge.type, edgePath, issues, context, isLegacyPayload, edgeId);

    if (!isPlainObject(edge.data)) {
      pushIssue(issues, context, `${edgePath}.data`, "must be an object.", {
        code: "invalid-edge-shape",
        edgeIds: edgeId ? [edgeId] : [],
        nodeIds: [edge.source, edge.target]
      });
      return;
    }

    validateEdgeData(edge, edgePath, issues, context);
    validateHandleAssignments(
      edge,
      edgePath,
      nodeById,
      issues,
      context,
      isLegacyPayload
    );
  });
}

function getMopTargetIssueOptions(step) {
  const targetId =
    typeof step.targetId === "string" && step.targetId.trim() !== ""
      ? step.targetId
      : null;

  if (targetId === null) {
    return {
      code: "invalid-mop-state"
    };
  }

  if (
    step.actionType === MOP_ACTION_TYPE.TOGGLE_BREAKER ||
    step.actionType === MOP_ACTION_TYPE.DELETE_EDGE
  ) {
    return {
      code: "invalid-mop-state",
      edgeIds: [targetId]
    };
  }

  return {
    code: "invalid-mop-state",
    nodeIds: [targetId]
  };
}

function validateMopTargetState(step, stepPath, issues, context, issueOptions) {
  if (step.actionType === MOP_ACTION_TYPE.TOGGLE_SOURCE) {
    if (typeof step.targetState !== "boolean") {
      pushIssue(
        issues,
        context,
        `${stepPath}.targetState`,
        "must be a boolean.",
        issueOptions
      );
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
        context,
        `${stepPath}.targetState`,
        `must be "${BREAKER_STATE.OPEN}" or "${BREAKER_STATE.CLOSED}".`,
        issueOptions
      );
    }
    return;
  }

  if (step.actionType === MOP_ACTION_TYPE.THROW_TRANSFER_SWITCH) {
    if (!SUPPORTED_TRANSFER_SWITCH_ACTIVE_SOURCES.has(step.targetState)) {
      pushIssue(
        issues,
        context,
        `${stepPath}.targetState`,
        `must be one of: ${Array.from(
          SUPPORTED_TRANSFER_SWITCH_ACTIVE_SOURCES
        ).join(", ")}.`,
        issueOptions
      );
    }
    return;
  }

  if (step.actionType === MOP_ACTION_TYPE.SET_UPS_MODE) {
    if (!SUPPORTED_UPS_OPERATING_MODES.has(step.targetState)) {
      pushIssue(
        issues,
        context,
        `${stepPath}.targetState`,
        `must be one of: ${Array.from(SUPPORTED_UPS_OPERATING_MODES).join(", ")}.`,
        issueOptions
      );
    }
    return;
  }

  if (step.targetState !== "deleted") {
    pushIssue(
      issues,
      context,
      `${stepPath}.targetState`,
      'must be "deleted".',
      issueOptions
    );
  }
}

function validateAppStateCore(value, rootPath, issues, context, isLegacyPayload) {
  validateGraphState(value, rootPath, issues, context, isLegacyPayload);

  if (value.mopBaseSnapshot !== undefined && value.mopBaseSnapshot !== null) {
    validateGraphState(
      value.mopBaseSnapshot,
      `${rootPath}.mopBaseSnapshot`,
      issues,
      context,
      isLegacyPayload
    );
  }

  if (value.mopSteps !== undefined && !Array.isArray(value.mopSteps)) {
    pushIssue(issues, context, `${rootPath}.mopSteps`, "must be an array when provided.", {
      code: "invalid-mop-state"
    });
  }

  if (!Array.isArray(value.mopSteps)) {
    return;
  }

  if (
    value.mopSteps.length > 0 &&
    (value.mopBaseSnapshot === null || value.mopBaseSnapshot === undefined)
  ) {
    pushIssue(
      issues,
      context,
      `${rootPath}.mopBaseSnapshot`,
      "must be a graph snapshot when mopSteps are present.",
      {
        code: "invalid-mop-state"
      }
    );
  }

  value.mopSteps.forEach((step, index) => {
    const stepPath = `${rootPath}.mopSteps[${index}]`;

    if (!isPlainObject(step)) {
      pushIssue(issues, context, stepPath, "must be an object.", {
        code: "invalid-mop-state"
      });
      return;
    }

    const issueOptions = getMopTargetIssueOptions(step);

    if (typeof step.targetId !== "string" || step.targetId.trim() === "") {
      pushIssue(
        issues,
        context,
        `${stepPath}.targetId`,
        "must be a non-empty string.",
        issueOptions
      );
    }

    if (!Object.values(MOP_ACTION_TYPE).includes(step.actionType)) {
      pushIssue(
        issues,
        context,
        `${stepPath}.actionType`,
        "is not a supported MOP action.",
        issueOptions
      );
    } else {
      validateMopTargetState(step, stepPath, issues, context, issueOptions);
    }

    if (step.actionText !== undefined && typeof step.actionText !== "string") {
      pushIssue(
        issues,
        context,
        `${stepPath}.actionText`,
        "must be a string when provided.",
        issueOptions
      );
    }

    validateGraphState(
      step.snapshot,
      `${stepPath}.snapshot`,
      issues,
      context,
      isLegacyPayload
    );
  });
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
    nodes: Array.isArray(appState.nodes) ? appState.nodes : [],
    edges: Array.isArray(appState.edges) ? appState.edges : [],
    mopSteps: Array.isArray(appState.mopSteps) ? appState.mopSteps : [],
    mopBaseSnapshot: appState.mopBaseSnapshot ?? null
  };
}

export function serializePersistedAppState(appState, pretty = false) {
  return JSON.stringify(
    createPersistedAppState(appState),
    null,
    pretty ? 2 : undefined
  );
}

export function validatePersistedAppState(
  value,
  { source = VALIDATION_SOURCE.IMPORT } = {}
) {
  const issues = [];
  const context = createValidationContext(source);

  if (!isPlainObject(value)) {
    pushIssue(issues, context, "", "Topology payload must be an object.", {
      code: "invalid-payload"
    });
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
      context,
      "schemaVersion",
      `must be ${TOPOLOGY_SCHEMA_VERSION} or omitted for legacy payloads.`,
      {
        code: "unsupported-schema-version"
      }
    );
  }

  validateAppStateCore(value, "payload", issues, context, isLegacyPayload);

  return {
    isValid: issues.length === 0,
    issues,
    isLegacyPayload
  };
}

export function validateLiveAppState(appState) {
  const issues = [];
  const context = createValidationContext(VALIDATION_SOURCE.LIVE);

  if (!isPlainObject(appState)) {
    pushIssue(issues, context, "", "Live topology must be an object.", {
      code: "invalid-payload"
    });
    return {
      isValid: false,
      issues
    };
  }

  validateAppStateCore(appState, "appState", issues, context, false);

  return {
    isValid: issues.length === 0,
    issues
  };
}

export function hasBlockingValidationIssues(issues) {
  return Array.isArray(issues)
    ? issues.some((issue) => issue?.severity === VALIDATION_SEVERITY.ERROR)
    : false;
}

export function parsePersistedAppState(
  value,
  { source = VALIDATION_SOURCE.IMPORT } = {}
) {
  const validation = validatePersistedAppState(value, { source });

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

export function deserializePersistedAppStateJson(
  rawText,
  { source = VALIDATION_SOURCE.IMPORT } = {}
) {
  try {
    const parsedValue = JSON.parse(rawText);
    return parsePersistedAppState(parsedValue, { source });
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          code: "invalid-json",
          severity: VALIDATION_SEVERITY.ERROR,
          source,
          path: "",
          message: "Topology payload is not valid JSON.",
          nodeIds: [],
          edgeIds: []
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

export function createValidationReport({
  label = "Topology import",
  issues = [],
  source = issues[0]?.source ?? VALIDATION_SOURCE.IMPORT,
  parseError
} = {}) {
  return {
    label,
    source,
    issues: Array.isArray(issues) ? issues : [],
    summary: formatPersistedAppStateValidationSummary(issues, label),
    parseError
  };
}
