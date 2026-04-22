import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_HANDLE_ID,
  isTransferSwitchNodeType,
  normalizeTransferSwitchActiveSource,
  normalizeTransferSwitchTargetHandle
} from "../topology/transferSwitch";
import {
  isUpsNodeType,
  normalizeUpsOperatingMode
} from "../topology/ups";
import { normalizeCanvasEdgeType } from "../topology/edgeTypes";
import {
  DEFAULT_LOW_VOLTAGE,
  DEFAULT_MEDIUM_VOLTAGE,
  extractVoltagesFromText,
  normalizeVoltageValue
} from "../electrical/voltage";
import { FAULT_TYPE, normalizeFaultType } from "../engine/protectionModel";
import { normalizeEdgeData } from "../edges/edgeData";
import { isTransformerNodeType } from "../topology/transformer";
import { normalizeEdgePathOptions } from "../topology/edgePathOptions";

function isSourceNodeType(nodeType) {
  return nodeType === "utility" || nodeType === "generator";
}

function getNodeLabelSuffix(seed) {
  const normalizedSeed = String(seed ?? "");
  const canonicalSeed = normalizedSeed.includes("-")
    ? normalizedSeed.slice(normalizedSeed.indexOf("-") + 1)
    : normalizedSeed;
  const suffix = canonicalSeed
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase();

  return suffix || "0000";
}

const DEFAULT_NODE_DATA_BY_TYPE = {
  utility: (labelSuffix) => ({
    label: `Utility ${labelSuffix}`,
    nominalVoltage: DEFAULT_MEDIUM_VOLTAGE,
    isSourceOnline: true,
    syncGroup: "",
    faultType: FAULT_TYPE.NONE,
    availableFaultCurrentAmps: undefined
  }),
  generator: (labelSuffix) => ({
    label: `Generator ${labelSuffix}`,
    nominalVoltage: DEFAULT_MEDIUM_VOLTAGE,
    isSourceOnline: true,
    syncGroup: "",
    faultType: FAULT_TYPE.NONE,
    availableFaultCurrentAmps: undefined
  }),
  mvsg: (labelSuffix) => ({
    label: `MVSG ${labelSuffix}`,
    nominalVoltage: DEFAULT_MEDIUM_VOLTAGE,
    faultType: FAULT_TYPE.NONE
  }),
  ptx: (labelSuffix) => ({
    label: `PTX ${labelSuffix}`,
    primaryVoltage: DEFAULT_MEDIUM_VOLTAGE,
    secondaryVoltage: DEFAULT_LOW_VOLTAGE,
    faultType: FAULT_TYPE.NONE,
    transformerImpedancePercent: undefined
  }),
  load: (labelSuffix) => ({
    label: `Load ${labelSuffix}`,
    nominalVoltage: DEFAULT_LOW_VOLTAGE,
    loadClass: "Data Hall",
    faultType: FAULT_TYPE.NONE
  }),
  switchboard: (labelSuffix) => ({
    label: `SWBD ${labelSuffix}`,
    nominalVoltage: DEFAULT_LOW_VOLTAGE,
    boardClass: "Main Distribution Board",
    faultType: FAULT_TYPE.NONE
  }),
  ups: (labelSuffix) => ({
    label: `UPS ${labelSuffix}`,
    nominalVoltage: DEFAULT_LOW_VOLTAGE,
    upsClass: "Double Conversion UPS",
    batteryAvailable: true,
    operatingMode: "normal",
    syncGroup: "",
    faultType: FAULT_TYPE.NONE
  }),
  transferSwitch: (labelSuffix) => ({
    label: `ATS ${labelSuffix}`,
    nominalVoltage: DEFAULT_LOW_VOLTAGE,
    switchClass: "Automatic Transfer Switch",
    activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
    faultType: FAULT_TYPE.NONE
  }),
  mechanical: (labelSuffix) => ({
    label: `FCW ${labelSuffix}`,
    nominalVoltage: DEFAULT_LOW_VOLTAGE,
    mechanicalClass: "Fan Coil Wall",
    faultType: FAULT_TYPE.NONE
  })
};

export function getDefaultNodeData(nodeType, nodeId) {
  const normalizedType = DEFAULT_NODE_DATA_BY_TYPE[nodeType] ? nodeType : "mvsg";
  const labelSuffix = getNodeLabelSuffix(nodeId);

  return DEFAULT_NODE_DATA_BY_TYPE[normalizedType](labelSuffix);
}

function normalizeNominalVoltage(currentData, fallbackData) {
  return normalizeVoltageValue(
    currentData.nominalVoltage,
    normalizeVoltageValue(currentData.voltage, fallbackData.nominalVoltage)
  );
}

function normalizeTransformerVoltages(currentData, fallbackData) {
  const legacyRatioValues = extractVoltagesFromText(currentData.ratio);

  return {
    primaryVoltage: normalizeVoltageValue(
      currentData.primaryVoltage,
      legacyRatioValues[0] ?? fallbackData.primaryVoltage
    ),
    secondaryVoltage: normalizeVoltageValue(
      currentData.secondaryVoltage,
      legacyRatioValues[1] ?? fallbackData.secondaryVoltage
    )
  };
}

function normalizeOptionalPositiveInteger(value) {
  const normalizedValue = normalizeVoltageValue(value, null);
  return normalizedValue === null ? undefined : normalizedValue;
}

function normalizeOptionalPositiveNumber(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      return undefined;
    }

    const numericValue = Number(trimmedValue.replace(/,/g, ""));
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : undefined;
  }

  return undefined;
}

function normalizeOptionalTrimmedText(value, fallbackValue) {
  if (typeof value !== "string") {
    return fallbackValue;
  }

  const trimmedValue = value.trim();
  return trimmedValue !== "" ? trimmedValue : fallbackValue;
}

export function normalizeNodeData(node) {
  const fallbackData = getDefaultNodeData(node.type, node.id);
  const currentData =
    node.data && typeof node.data === "object" ? node.data : {};
  const nextData = {
    ...fallbackData,
    ...currentData,
    label:
      typeof currentData.label === "string" && currentData.label.trim() !== ""
        ? currentData.label
        : fallbackData.label
  };

  if (isTransformerNodeType(node.type)) {
    const { primaryVoltage, secondaryVoltage } = normalizeTransformerVoltages(
      currentData,
      fallbackData
    );
    nextData.primaryVoltage = primaryVoltage;
    nextData.secondaryVoltage = secondaryVoltage;
    delete nextData.nominalVoltage;
  } else {
    nextData.nominalVoltage = normalizeNominalVoltage(currentData, fallbackData);
    delete nextData.primaryVoltage;
    delete nextData.secondaryVoltage;
  }

  delete nextData.voltage;
  delete nextData.ratio;
  nextData.faultType = normalizeFaultType(currentData.faultType);

  if (isSourceNodeType(node.type)) {
    nextData.syncGroup =
      typeof currentData.syncGroup === "string" ? currentData.syncGroup : "";
    nextData.isSourceOnline = currentData.isSourceOnline !== false;
    nextData.availableFaultCurrentAmps = normalizeOptionalPositiveInteger(
      currentData.availableFaultCurrentAmps
    );
  } else {
    if (isUpsNodeType(node.type)) {
      nextData.syncGroup =
        typeof currentData.syncGroup === "string" ? currentData.syncGroup : "";
    } else {
      delete nextData.syncGroup;
    }
    delete nextData.isSourceOnline;
    delete nextData.availableFaultCurrentAmps;
  }

  if (isTransferSwitchNodeType(node.type)) {
    nextData.activeSource = normalizeTransferSwitchActiveSource(
      currentData.activeSource
    );
  } else {
    delete nextData.activeSource;
  }

  if (node.type === "switchboard") {
    nextData.boardClass =
      normalizeOptionalTrimmedText(currentData.boardClass, fallbackData.boardClass);
    nextData.ratedCurrentAmps = normalizeOptionalPositiveInteger(
      currentData.ratedCurrentAmps
    );
  }

  if (node.type === "mvsg") {
    nextData.ratedCurrentAmps = normalizeOptionalPositiveInteger(
      currentData.ratedCurrentAmps
    );
  }

  if (node.type === "load") {
    nextData.loadClass = normalizeOptionalTrimmedText(
      currentData.loadClass,
      fallbackData.loadClass
    );
    nextData.ratedCurrentAmps = normalizeOptionalPositiveInteger(
      currentData.ratedCurrentAmps
    );
  }

  if (isUpsNodeType(node.type)) {
    nextData.upsClass =
      normalizeOptionalTrimmedText(currentData.upsClass, fallbackData.upsClass);
    nextData.batteryAvailable = currentData.batteryAvailable !== false;
    nextData.operatingMode = normalizeUpsOperatingMode(currentData.operatingMode);
    nextData.ratedCurrentAmps = normalizeOptionalPositiveInteger(
      currentData.ratedCurrentAmps
    );
    nextData.kvaRating = normalizeOptionalPositiveInteger(currentData.kvaRating);
    nextData.batteryRuntimeMinutes = normalizeOptionalPositiveInteger(
      currentData.batteryRuntimeMinutes
    );
  }

  if (isTransferSwitchNodeType(node.type)) {
    nextData.switchClass = normalizeOptionalTrimmedText(
      currentData.switchClass,
      fallbackData.switchClass
    );
    nextData.ratedCurrentAmps = normalizeOptionalPositiveInteger(
      currentData.ratedCurrentAmps
    );
  }

  if (node.type === "mechanical") {
    nextData.mechanicalClass = normalizeOptionalTrimmedText(
      currentData.mechanicalClass,
      fallbackData.mechanicalClass
    );
    nextData.ratedCurrentAmps = normalizeOptionalPositiveInteger(
      currentData.ratedCurrentAmps
    );
  }

  if (isTransformerNodeType(node.type)) {
    nextData.transformerImpedancePercent = normalizeOptionalPositiveNumber(
      currentData.transformerImpedancePercent
    );
  } else {
    delete nextData.transformerImpedancePercent;
  }

  return nextData;
}

export function normalizeGraphState(graph) {
  const normalizedNodes = graph.nodes.map((node) => ({
    ...node,
    data: normalizeNodeData(node)
  }));
  const nodeById = new Map(normalizedNodes.map((node) => [node.id, node]));

  return {
    nodes: normalizedNodes,
    edges: graph.edges.map((edge) => {
      const targetNode = nodeById.get(edge.target);
      const normalizedEdge = {
        ...edge,
        type: normalizeCanvasEdgeType(edge.type),
        data: normalizeEdgeData(edge),
        pathOptions: normalizeEdgePathOptions(edge.pathOptions)
      };

      if (!isTransferSwitchNodeType(targetNode?.type)) {
        return normalizedEdge;
      }

      const normalizedTargetHandle = normalizeTransferSwitchTargetHandle(
        normalizedEdge.targetHandle
      );

      if (normalizedEdge.targetHandle === normalizedTargetHandle) {
        return normalizedEdge;
      }

      return {
        ...normalizedEdge,
        targetHandle: normalizedTargetHandle
      };
    })
  };
}

export { isSourceNodeType, isTransferSwitchNodeType, TRANSFER_SWITCH_HANDLE_ID };
