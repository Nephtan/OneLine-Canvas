export const BREAKER_STATE = {
  OPEN: "open",
  CLOSED: "closed"
};

export function normalizeBreakerState(state) {
  return state === BREAKER_STATE.CLOSED
    ? BREAKER_STATE.CLOSED
    : BREAKER_STATE.OPEN;
}

export function createTopologyKey(nodes, edges) {
  const nodeSignature = nodes
    .map((node) => `${node.id}:${node.type ?? "default"}`)
    .sort();

  const edgeSignature = edges
    .map((edge) => {
      const breakerState = normalizeBreakerState(edge.data?.breakerState);
      return `${edge.source}->${edge.target}:${breakerState}`;
    })
    .sort();

  return JSON.stringify({
    nodes: nodeSignature,
    edges: edgeSignature
  });
}

export function evaluatePowerFlow(nodes, edges) {
  const nodeIds = nodes.map((node) => node.id);
  const validNodeIdSet = new Set(nodeIds);
  const adjacencySets = new Map();

  for (const nodeId of nodeIds) {
    adjacencySets.set(nodeId, new Set());
  }

  for (const edge of edges) {
    const breakerState = normalizeBreakerState(edge.data?.breakerState);

    if (breakerState !== BREAKER_STATE.CLOSED) {
      continue;
    }

    if (!validNodeIdSet.has(edge.source) || !validNodeIdSet.has(edge.target)) {
      continue;
    }

    adjacencySets.get(edge.source).add(edge.target);
    adjacencySets.get(edge.target).add(edge.source);
  }

  const utilitySourceIds = nodes
    .filter((node) => node.type === "utility")
    .map((node) => node.id);

  const liveNodeIds = new Set(utilitySourceIds);
  const queue = [...utilitySourceIds];
  let readIndex = 0;

  while (readIndex < queue.length) {
    const currentNodeId = queue[readIndex];
    readIndex += 1;

    const neighbors = adjacencySets.get(currentNodeId);

    if (!neighbors) {
      continue;
    }

    for (const neighborId of neighbors) {
      if (liveNodeIds.has(neighborId)) {
        continue;
      }

      liveNodeIds.add(neighborId);
      queue.push(neighborId);
    }
  }

  const powerStateByNodeId = {};

  for (const nodeId of nodeIds) {
    powerStateByNodeId[nodeId] = liveNodeIds.has(nodeId) ? "Live" : "Dead";
  }

  const adjacencyByNodeId = {};

  for (const [nodeId, neighborSet] of adjacencySets.entries()) {
    adjacencyByNodeId[nodeId] = Array.from(neighborSet).sort();
  }

  return {
    powerStateByNodeId,
    adjacencyByNodeId
  };
}
