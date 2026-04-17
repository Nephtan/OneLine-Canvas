import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_HANDLE_ID,
  isTransferSwitchNodeType,
  normalizeTransferSwitchActiveSource,
  normalizeTransferSwitchTargetHandle
} from "../topology/transferSwitch";
import { normalizeCanvasEdgeType } from "../topology/edgeTypes";
import {
  DEFAULT_LOW_VOLTAGE,
  DEFAULT_MEDIUM_VOLTAGE,
  extractVoltagesFromText,
  normalizeVoltageValue
} from "../electrical/voltage";
import { isTransformerNodeType } from "../topology/transformer";
import { normalizeCanvasEdgeData } from "../canvas/edgeLayout";

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
    syncGroup: ""
  }),
  generator: (labelSuffix) => ({
    label: `Generator ${labelSuffix}`,
    nominalVoltage: DEFAULT_MEDIUM_VOLTAGE,
    isSourceOnline: true,
    syncGroup: ""
  }),
  mvsg: (labelSuffix) => ({
    label: `MVSG ${labelSuffix}`,
    nominalVoltage: DEFAULT_MEDIUM_VOLTAGE
  }),
  ptx: (labelSuffix) => ({
    label: `PTX ${labelSuffix}`,
    primaryVoltage: DEFAULT_MEDIUM_VOLTAGE,
    secondaryVoltage: DEFAULT_LOW_VOLTAGE
  }),
  load: (labelSuffix) => ({
    label: `Load ${labelSuffix}`,
    nominalVoltage: DEFAULT_LOW_VOLTAGE,
    loadClass: "Data Hall"
  }),
  switchboard: (labelSuffix) => ({
    label: `SWBD ${labelSuffix}`,
    nominalVoltage: DEFAULT_LOW_VOLTAGE,
    boardClass: "Main Distribution Board"
  }),
  transferSwitch: (labelSuffix) => ({
    label: `ATS ${labelSuffix}`,
    nominalVoltage: DEFAULT_LOW_VOLTAGE,
    switchClass: "Automatic Transfer Switch",
    activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
  }),
  mechanical: (labelSuffix) => ({
    label: `FCW ${labelSuffix}`,
    nominalVoltage: DEFAULT_LOW_VOLTAGE,
    mechanicalClass: "Fan Coil Wall"
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

  if (isSourceNodeType(node.type)) {
    nextData.syncGroup =
      typeof currentData.syncGroup === "string" ? currentData.syncGroup : "";
    nextData.isSourceOnline = currentData.isSourceOnline !== false;
  } else {
    delete nextData.syncGroup;
    delete nextData.isSourceOnline;
  }

  if (isTransferSwitchNodeType(node.type)) {
    nextData.activeSource = normalizeTransferSwitchActiveSource(
      currentData.activeSource
    );
  } else {
    delete nextData.activeSource;
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
        data: normalizeCanvasEdgeData(edge.data)
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
