import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_HANDLE_ID,
  isTransferSwitchNodeType,
  normalizeTransferSwitchActiveSource,
  normalizeTransferSwitchTargetHandle
} from "../topology/transferSwitch";
import { normalizeCanvasEdgeType } from "../topology/edgeTypes";

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
    voltage: "12.47 kV",
    isSourceOnline: true,
    syncGroup: ""
  }),
  generator: (labelSuffix) => ({
    label: `Generator ${labelSuffix}`,
    voltage: "480 V Generator",
    isSourceOnline: true,
    syncGroup: ""
  }),
  mvsg: (labelSuffix) => ({
    label: `MVSG ${labelSuffix}`,
    nominalVoltage: "12.47 kV Bus"
  }),
  ptx: (labelSuffix) => ({
    label: `PTX ${labelSuffix}`,
    ratio: "12.47 kV / 480 V"
  }),
  load: (labelSuffix) => ({
    label: `Load ${labelSuffix}`,
    loadClass: "Data Hall"
  }),
  switchboard: (labelSuffix) => ({
    label: `SWBD ${labelSuffix}`,
    boardClass: "Main Distribution Board"
  }),
  transferSwitch: (labelSuffix) => ({
    label: `ATS ${labelSuffix}`,
    switchClass: "Automatic Transfer Switch",
    activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
  }),
  mechanical: (labelSuffix) => ({
    label: `FCW ${labelSuffix}`,
    mechanicalClass: "Fan Coil Wall"
  })
};

export function getDefaultNodeData(nodeType, nodeId) {
  const normalizedType = DEFAULT_NODE_DATA_BY_TYPE[nodeType] ? nodeType : "mvsg";
  const labelSuffix = getNodeLabelSuffix(nodeId);

  return DEFAULT_NODE_DATA_BY_TYPE[normalizedType](labelSuffix);
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

  if (isSourceNodeType(node.type)) {
    nextData.syncGroup =
      typeof currentData.syncGroup === "string" ? currentData.syncGroup : "";
  } else {
    delete nextData.syncGroup;
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
        type: normalizeCanvasEdgeType(edge.type)
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
