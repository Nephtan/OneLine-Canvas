import {
  TRANSFER_SWITCH_HANDLE_ID,
  getTransferSwitchHandleRole,
  isTransferSwitchNodeType,
  normalizeTransferSwitchActiveSource,
  normalizeTransferSwitchTargetHandle
} from "../topology/transferSwitch";
import {
  EDGE_TYPE,
  isBreakerEdgeType,
  normalizeCanvasEdgeType
} from "../topology/edgeTypes";

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

function getTransferSwitchHandleIdForEdge(edge, nodeId) {
  if (edge.target === nodeId) {
    return normalizeTransferSwitchTargetHandle(edge.targetHandle);
  }

  return typeof edge.sourceHandle === "string" && edge.sourceHandle.trim() !== ""
    ? edge.sourceHandle
    : TRANSFER_SWITCH_HANDLE_ID.OUTPUT;
}

function transferSwitchConductsHandle(node, handleId) {
  const handleRole = getTransferSwitchHandleRole(handleId);

  if (
    handleRole === null ||
    handleRole === "output"
  ) {
    return true;
  }

  return normalizeTransferSwitchActiveSource(node.data?.activeSource) === handleRole;
}

function edgeConductsForTransferSwitches(edge, nodeById) {
  const sourceNode = nodeById.get(edge.source);
  const targetNode = nodeById.get(edge.target);

  if (!sourceNode || !targetNode) {
    return false;
  }

  if (
    isTransferSwitchNodeType(sourceNode.type) &&
    !transferSwitchConductsHandle(
      sourceNode,
      getTransferSwitchHandleIdForEdge(edge, sourceNode.id)
    )
  ) {
    return false;
  }

  if (
    isTransferSwitchNodeType(targetNode.type) &&
    !transferSwitchConductsHandle(
      targetNode,
      getTransferSwitchHandleIdForEdge(edge, targetNode.id)
    )
  ) {
    return false;
  }

  return true;
}

function isConductiveEdge(edge, nodeById) {
  const edgeType = normalizeCanvasEdgeType(edge.type);

  if (
    edgeType === EDGE_TYPE.BREAKER &&
    normalizeBreakerState(edge.data?.breakerState) !== BREAKER_STATE.CLOSED
  ) {
    return false;
  }

  return edgeConductsForTransferSwitches(edge, nodeById);
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
      const activeSourceSignature = isTransferSwitchNodeType(node.type)
        ? normalizeTransferSwitchActiveSource(node.data?.activeSource)
        : "-";
      return `${node.id}:${node.type ?? "default"}:${utilityOnlineSignature}:${syncGroupSignature}:${activeSourceSignature}`;
    })
    .sort();

  const edgeSignature = edges
    .map((edge) => {
      const edgeType = normalizeCanvasEdgeType(edge.type);
      const breakerState =
        edgeType === EDGE_TYPE.BREAKER
          ? normalizeBreakerState(edge.data?.breakerState)
          : "-";
      const sourceHandleSignature =
        typeof edge.sourceHandle === "string" ? edge.sourceHandle : "";
      const targetHandleSignature =
        typeof edge.targetHandle === "string"
          ? (edge.targetHandle === TRANSFER_SWITCH_HANDLE_ID.LEGACY_INPUT
              ? TRANSFER_SWITCH_HANDLE_ID.PRIMARY
              : edge.targetHandle)
          : "";
      return `${edgeType}:${edge.source}:${sourceHandleSignature}->${edge.target}:${targetHandleSignature}:${breakerState}`;
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
    if (!validNodeIdSet.has(edge.source) || !validNodeIdSet.has(edge.target)) {
      continue;
    }

    if (!isConductiveEdge(edge, nodeById)) {
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
    if (
      !validNodeIdSet.has(edge.source) ||
      !validNodeIdSet.has(edge.target) ||
      !isConductiveEdge(edge, nodeById)
    ) {
      edgePowerStateByEdgeId[edge.id] = EDGE_POWER_STATE.DE_ENERGIZED;
      continue;
    }

    if (
      isBreakerEdgeType(edge.type) &&
      (conflictNodeIdSet.has(edge.source) || conflictNodeIdSet.has(edge.target))
    ) {
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
