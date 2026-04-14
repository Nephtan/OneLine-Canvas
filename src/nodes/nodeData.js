function isSourceNodeType(nodeType) {
  return nodeType === "utility" || nodeType === "generator";
}

function getNodeLabelSuffix(seed) {
  const suffix = String(seed ?? "")
    .replace(/[^a-z0-9]/gi, "")
    .slice(-4)
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
    switchClass: "Automatic Transfer Switch"
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

  return nextData;
}

export function normalizeGraphState(graph) {
  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      data: normalizeNodeData(node)
    })),
    edges: graph.edges
  };
}

export { isSourceNodeType };
