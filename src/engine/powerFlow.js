export const BREAKER_STATE = {
  OPEN: "open",
  CLOSED: "closed",
  TRIPPED: "tripped"
};

export const NODE_POWER_STATE = {
  DEAD: "Dead",
  LIVE: "Live",
  BACKFEED: "Backfeed",
  PHASE_CONFLICT: "Phase Conflict"
};

export const EDGE_POWER_STATE = {
  DE_ENERGIZED: "de-energized",
  ENERGIZED: "energized",
  PHASE_CONFLICT: "phase-conflict"
};

function isRootSourceType(nodeType) {
  return nodeType === "utility" || nodeType === "generator";
}

export function normalizeSyncGroup(syncGroup) {
  if (typeof syncGroup !== "string") {
    return "";
  }

  return syncGroup.trim().toUpperCase();
}

export function normalizeBreakerState(state) {
  if (state === BREAKER_STATE.CLOSED) {
    return BREAKER_STATE.CLOSED;
  }

  if (state === BREAKER_STATE.TRIPPED) {
    return BREAKER_STATE.TRIPPED;
  }

  return BREAKER_STATE.OPEN;
}

function isRootSourceOnline(node) {
  return isRootSourceType(node.type) && node.data?.isSourceOnline !== false;
}

function hasUnsynchronizedSources(sourceIds, nodeById) {
  const sourceIdList = Array.isArray(sourceIds)
    ? sourceIds
    : Array.from(sourceIds ?? []);

  if (sourceIdList.length <= 1) {
    return false;
  }

  let expectedSyncGroup = null;

  for (const sourceId of sourceIdList) {
    const sourceNode = nodeById.get(sourceId);
    const normalizedSyncGroup = normalizeSyncGroup(sourceNode?.data?.syncGroup);

    if (!normalizedSyncGroup) {
      return true;
    }

    if (expectedSyncGroup === null) {
      expectedSyncGroup = normalizedSyncGroup;
      continue;
    }

    if (expectedSyncGroup !== normalizedSyncGroup) {
      return true;
    }
  }

  return false;
}

export function createTopologyKey(nodes, edges) {
  const nodeSignature = nodes
    .map((node) => {
      const utilityOnlineSignature =
        isRootSourceType(node.type) ? (isRootSourceOnline(node) ? "1" : "0") : "-";
      const syncGroupSignature = isRootSourceType(node.type)
        ? normalizeSyncGroup(node.data?.syncGroup)
        : "-";
      return `${node.id}:${node.type ?? "default"}:${utilityOnlineSignature}:${syncGroupSignature}`;
    })
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
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacencySets = new Map();
  const sourceSetsByNodeId = new Map();

  for (const nodeId of nodeIds) {
    adjacencySets.set(nodeId, new Set());
    sourceSetsByNodeId.set(nodeId, new Set());
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

  const onlineRootSourceIds = nodes
    .filter((node) => isRootSourceOnline(node))
    .map((node) => node.id);

  const queue = [...onlineRootSourceIds];
  const queuedSet = new Set(onlineRootSourceIds);

  for (const utilitySourceId of onlineRootSourceIds) {
    sourceSetsByNodeId.get(utilitySourceId).add(utilitySourceId);
  }

  let readIndex = 0;

  while (readIndex < queue.length) {
    const currentNodeId = queue[readIndex];
    readIndex += 1;
    queuedSet.delete(currentNodeId);

    const neighbors = adjacencySets.get(currentNodeId);
    const currentNodeSources = sourceSetsByNodeId.get(currentNodeId);

    if (!neighbors || !currentNodeSources || currentNodeSources.size === 0) {
      continue;
    }

    for (const neighborId of neighbors) {
      const neighborSources = sourceSetsByNodeId.get(neighborId);

      if (!neighborSources) {
        continue;
      }

      let neighborChanged = false;

      for (const sourceId of currentNodeSources) {
        if (neighborSources.has(sourceId)) {
          continue;
        }

        neighborSources.add(sourceId);
        neighborChanged = true;
      }

      if (!neighborChanged || queuedSet.has(neighborId)) {
        continue;
      }

      queue.push(neighborId);
      queuedSet.add(neighborId);
    }
  }

  const powerStateByNodeId = {};
  const sourceIdsByNodeId = {};

  for (const nodeId of nodeIds) {
    const node = nodeById.get(nodeId);
    const sourceSet = sourceSetsByNodeId.get(nodeId);
    const sourceIds = Array.from(sourceSet ?? []).sort();
    sourceIdsByNodeId[nodeId] = sourceIds;

    if (sourceIds.length === 0) {
      powerStateByNodeId[nodeId] = NODE_POWER_STATE.DEAD;
      continue;
    }

    const hasConflict = hasUnsynchronizedSources(sourceIds, nodeById);

    if (isRootSourceType(node?.type)) {
      if (hasConflict) {
        powerStateByNodeId[nodeId] = NODE_POWER_STATE.PHASE_CONFLICT;
        continue;
      }

      powerStateByNodeId[nodeId] =
        sourceIds.includes(nodeId)
          ? NODE_POWER_STATE.LIVE
          : NODE_POWER_STATE.BACKFEED;
      continue;
    }

    powerStateByNodeId[nodeId] =
      hasConflict
        ? NODE_POWER_STATE.PHASE_CONFLICT
        : NODE_POWER_STATE.LIVE;
  }

  const conflictNodeIdSet = new Set(
    nodeIds.filter(
      (nodeId) => powerStateByNodeId[nodeId] === NODE_POWER_STATE.PHASE_CONFLICT
    )
  );

  const adjacencyByNodeId = {};

  for (const [nodeId, neighborSet] of adjacencySets.entries()) {
    adjacencyByNodeId[nodeId] = Array.from(neighborSet).sort();
  }

  const edgePowerStateByEdgeId = {};
  const faultedEdgeIdSet = new Set();

  for (const edge of edges) {
    const breakerState = normalizeBreakerState(edge.data?.breakerState);

    if (breakerState !== BREAKER_STATE.CLOSED) {
      edgePowerStateByEdgeId[edge.id] = EDGE_POWER_STATE.DE_ENERGIZED;
      continue;
    }

    if (conflictNodeIdSet.has(edge.source) || conflictNodeIdSet.has(edge.target)) {
      faultedEdgeIdSet.add(edge.id);
    }

    const sourceIdsAtSource = sourceSetsByNodeId.get(edge.source);
    const sourceIdsAtTarget = sourceSetsByNodeId.get(edge.target);

    if (!sourceIdsAtSource || !sourceIdsAtTarget) {
      edgePowerStateByEdgeId[edge.id] = EDGE_POWER_STATE.DE_ENERGIZED;
      continue;
    }

    const unionSourceIds = new Set([
      ...sourceIdsAtSource,
      ...sourceIdsAtTarget
    ]);

    if (hasUnsynchronizedSources(unionSourceIds, nodeById)) {
      edgePowerStateByEdgeId[edge.id] = EDGE_POWER_STATE.PHASE_CONFLICT;
      continue;
    }

    edgePowerStateByEdgeId[edge.id] =
      unionSourceIds.size > 0
        ? EDGE_POWER_STATE.ENERGIZED
        : EDGE_POWER_STATE.DE_ENERGIZED;
  }

  return {
    powerStateByNodeId,
    sourceIdsByNodeId,
    adjacencyByNodeId,
    edgePowerStateByEdgeId,
    faultedEdgeIds: Array.from(faultedEdgeIdSet).sort()
  };
}
