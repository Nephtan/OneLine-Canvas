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
import { normalizeVoltageValue } from "../electrical/voltage";
import {
  TRANSFORMER_HANDLE_ID,
  TRANSFORMER_PRIMARY_HANDLE_IDS,
  TRANSFORMER_SIDE,
  getTransformerHandleRoleForEdge,
  getTransformerSideForEdge,
  isTransformerNodeType
} from "../topology/transformer";
import {
  getUpsHandleRoleForEdge,
  isUpsNodeType,
  normalizeUpsOperatingMode,
  normalizeUpsSourceHandle,
  normalizeUpsTargetHandle,
  UPS_HANDLE_ID,
  UPS_OPERATING_MODE
} from "../topology/ups";

export const BREAKER_STATE = {
  OPEN: "open",
  CLOSED: "closed",
  TRIPPED: "tripped"
};

export const NODE_POWER_STATE = {
  DEAD: "Dead",
  LIVE: "Live",
  BACKFEED: "Backfeed",
  PHASE_CONFLICT: "Phase Conflict",
  VOLTAGE_FAULT: "Voltage Fault"
};

export const EDGE_POWER_STATE = {
  DE_ENERGIZED: "de-energized",
  ENERGIZED: "energized",
  PHASE_CONFLICT: "phase-conflict"
};

function isRootSourceType(nodeType) {
  return nodeType === "utility" || nodeType === "generator";
}

function isUpsBatterySource(node) {
  return (
    isUpsNodeType(node?.type) &&
    normalizeUpsOperatingMode(node?.data?.operatingMode) === UPS_OPERATING_MODE.BATTERY &&
    node?.data?.batteryAvailable !== false
  );
}

function getNodeNominalVoltage(node) {
  return normalizeVoltageValue(node?.data?.nominalVoltage, 0);
}

function getTransformerVoltage(node, side) {
  if (side === TRANSFORMER_SIDE.PRIMARY) {
    return normalizeVoltageValue(node?.data?.primaryVoltage, 0);
  }

  return normalizeVoltageValue(node?.data?.secondaryVoltage, 0);
}

function getTransferSwitchHandleIdForEdge(edge, nodeId) {
  if (edge.target === nodeId) {
    return normalizeTransferSwitchTargetHandle(edge.targetHandle);
  }

  return typeof edge.sourceHandle === "string" && edge.sourceHandle.trim() !== ""
    ? edge.sourceHandle
    : TRANSFER_SWITCH_HANDLE_ID.OUTPUT;
}

function getUpsHandleIdForEdge(edge, nodeId) {
  if (edge.target === nodeId) {
    return normalizeUpsTargetHandle(edge.targetHandle);
  }

  return normalizeUpsSourceHandle(edge.sourceHandle);
}

function transferSwitchConductsHandle(node, handleId) {
  const handleRole = getTransferSwitchHandleRole(handleId);

  if (handleRole === null || handleRole === "output") {
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

function createEmptyPowerFlags() {
  return {
    isLive: false,
    isBackfeed: false,
    hasPhaseConflict: false,
    hasVoltageFault: false
  };
}

function resolveDominantPowerState(powerFlags) {
  if (powerFlags.hasVoltageFault) {
    return NODE_POWER_STATE.VOLTAGE_FAULT;
  }

  if (powerFlags.hasPhaseConflict) {
    return NODE_POWER_STATE.PHASE_CONFLICT;
  }

  if (powerFlags.isBackfeed) {
    return NODE_POWER_STATE.BACKFEED;
  }

  if (powerFlags.isLive) {
    return NODE_POWER_STATE.LIVE;
  }

  return NODE_POWER_STATE.DEAD;
}

function getNodeVoltageSignature(node) {
  if (isTransformerNodeType(node.type)) {
    return `${getTransformerVoltage(node, TRANSFORMER_SIDE.PRIMARY)}:${getTransformerVoltage(
      node,
      TRANSFORMER_SIDE.SECONDARY
    )}`;
  }

  return String(getNodeNominalVoltage(node));
}

function createPacketKey(nodeId, arrivalSide, sourceId, voltage) {
  return `${nodeId}|${arrivalSide ?? "bus"}|${sourceId}|${voltage}`;
}

function createArrivalBuckets() {
  return {
    bus: new Set(),
    primary: new Set(),
    secondary: new Set()
  };
}

function getNeighborIdForEdge(edge, nodeId) {
  return edge.source === nodeId ? edge.target : edge.source;
}

function getArrivalSideForNeighbor(edge, neighborNode) {
  if (!neighborNode) {
    return null;
  }

  if (isTransformerNodeType(neighborNode.type)) {
    return getTransformerSideForEdge(edge, neighborNode.id);
  }

  if (isUpsNodeType(neighborNode.type)) {
    return getUpsHandleIdForEdge(edge, neighborNode.id);
  }

  return null;
}

function getTransformerOutgoingTransmissions(node, arrivalSide, voltage) {
  const primaryVoltage = getTransformerVoltage(node, TRANSFORMER_SIDE.PRIMARY);
  const secondaryVoltage = getTransformerVoltage(node, TRANSFORMER_SIDE.SECONDARY);

  if (arrivalSide === TRANSFORMER_SIDE.PRIMARY) {
    if (voltage !== primaryVoltage) {
      return [];
    }

    return [
      {
        outgoingHandleRoles: TRANSFORMER_PRIMARY_HANDLE_IDS,
        outgoingVoltage: primaryVoltage
      },
      {
        outgoingHandleRoles: [TRANSFORMER_HANDLE_ID.SECONDARY],
        outgoingVoltage: secondaryVoltage
      }
    ];
  }

  if (arrivalSide === TRANSFORMER_SIDE.SECONDARY) {
    if (voltage !== secondaryVoltage) {
      return [];
    }

    return [
      {
        outgoingHandleRoles: TRANSFORMER_PRIMARY_HANDLE_IDS,
        outgoingVoltage: primaryVoltage
      }
    ];
  }

  return [];
}

function shouldRecordArrivalForUps(node, arrivalSide) {
  const operatingMode = normalizeUpsOperatingMode(node?.data?.operatingMode);

  if (operatingMode === UPS_OPERATING_MODE.BATTERY) {
    return arrivalSide === UPS_HANDLE_ID.OUTPUT;
  }

  return arrivalSide === UPS_HANDLE_ID.INPUT;
}

function getUpsOutgoingTransmissions(node, arrivalSide, voltage) {
  const operatingMode = normalizeUpsOperatingMode(node?.data?.operatingMode);
  const nominalVoltage = getNodeNominalVoltage(node);

  if (operatingMode === UPS_OPERATING_MODE.BATTERY) {
    if (arrivalSide !== UPS_HANDLE_ID.OUTPUT) {
      return [];
    }

    return [
      {
        outgoingHandleRoles: [UPS_HANDLE_ID.OUTPUT],
        outgoingVoltage: voltage
      }
    ];
  }

  if (arrivalSide !== UPS_HANDLE_ID.INPUT || voltage !== nominalVoltage) {
    return [];
  }

  return [
    {
      outgoingHandleRoles: [UPS_HANDLE_ID.OUTPUT],
      outgoingVoltage: voltage
    }
  ];
}

function recordArrivalVoltage(arrivalBucketsByNodeId, nodeId, arrivalSide, voltage) {
  const arrivalBuckets = arrivalBucketsByNodeId.get(nodeId);

  if (!arrivalBuckets) {
    return;
  }

  if (arrivalSide === TRANSFORMER_SIDE.PRIMARY) {
    arrivalBuckets.primary.add(voltage);
    return;
  }

  if (arrivalSide === TRANSFORMER_SIDE.SECONDARY) {
    arrivalBuckets.secondary.add(voltage);
    return;
  }

  arrivalBuckets.bus.add(voltage);
}

function setHasVoltageFaultForNode(node, arrivalBuckets, nodeVoltageSet) {
  if (isTransformerNodeType(node.type)) {
    const primaryVoltage = getTransformerVoltage(node, TRANSFORMER_SIDE.PRIMARY);
    const secondaryVoltage = getTransformerVoltage(
      node,
      TRANSFORMER_SIDE.SECONDARY
    );
    const primaryMismatch = Array.from(arrivalBuckets.primary).some(
      (voltage) => voltage !== primaryVoltage
    );
    const secondaryMismatch = Array.from(arrivalBuckets.secondary).some(
      (voltage) => voltage !== secondaryVoltage
    );

    return primaryMismatch || secondaryMismatch;
  }

  const nominalVoltage = getNodeNominalVoltage(node);
  return Array.from(nodeVoltageSet).some((voltage) => voltage !== nominalVoltage);
}

export function createTopologyKey(nodes, edges) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nodeSignature = nodes
    .map((node) => {
      const sourceOnlineSignature =
        isRootSourceType(node.type) ? (isRootSourceOnline(node) ? "1" : "0") : "-";
      const syncGroupSignature = isRootSourceType(node.type) || isUpsNodeType(node.type)
        ? normalizeSyncGroup(node.data?.syncGroup)
        : "-";
      const activeSourceSignature = isTransferSwitchNodeType(node.type)
        ? normalizeTransferSwitchActiveSource(node.data?.activeSource)
        : "-";
      const upsModeSignature = isUpsNodeType(node.type)
        ? normalizeUpsOperatingMode(node.data?.operatingMode)
        : "-";
      const upsBatterySignature = isUpsNodeType(node.type)
        ? node.data?.batteryAvailable !== false
          ? "1"
          : "0"
        : "-";

      return `${node.id}:${node.type ?? "default"}:${sourceOnlineSignature}:${syncGroupSignature}:${activeSourceSignature}:${upsModeSignature}:${upsBatterySignature}:${getNodeVoltageSignature(
        node
      )}`;
    })
    .sort();

  const edgeSignature = edges
    .map((edge) => {
      const edgeType = normalizeCanvasEdgeType(edge.type);
      const sourceNode = nodeById.get(edge.source);
      const targetNode = nodeById.get(edge.target);
      const breakerState =
        edgeType === EDGE_TYPE.BREAKER
          ? normalizeBreakerState(edge.data?.breakerState)
          : "-";
      const sourceHandleSignature = isUpsNodeType(sourceNode?.type)
        ? normalizeUpsSourceHandle(edge.sourceHandle)
        : typeof edge.sourceHandle === "string"
          ? edge.sourceHandle
          : "";
      const targetHandleSignature =
        isUpsNodeType(targetNode?.type)
          ? normalizeUpsTargetHandle(edge.targetHandle)
          : typeof edge.targetHandle === "string"
          ? edge.targetHandle === TRANSFER_SWITCH_HANDLE_ID.LEGACY_INPUT
            ? TRANSFER_SWITCH_HANDLE_ID.PRIMARY
            : edge.targetHandle
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
  const incidentEdgesByNodeId = new Map();
  const sourceSetsByNodeId = new Map();
  const voltageSetsByNodeId = new Map();
  const arrivalBucketsByNodeId = new Map();
  const edgeTransmissionSourceIdsByEdgeId = new Map();

  for (const nodeId of nodeIds) {
    adjacencySets.set(nodeId, new Set());
    incidentEdgesByNodeId.set(nodeId, []);
    sourceSetsByNodeId.set(nodeId, new Set());
    voltageSetsByNodeId.set(nodeId, new Set());
    arrivalBucketsByNodeId.set(nodeId, createArrivalBuckets());
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
    incidentEdgesByNodeId.get(edge.source).push(edge);
    incidentEdgesByNodeId.get(edge.target).push(edge);
    edgeTransmissionSourceIdsByEdgeId.set(edge.id, new Set());
  }

  const packetQueue = [];
  const seenPacketKeys = new Set();

  function enqueuePacket(nodeId, arrivalSide, sourceId, voltage) {
    const packetKey = createPacketKey(nodeId, arrivalSide, sourceId, voltage);

    if (seenPacketKeys.has(packetKey)) {
      return;
    }

    seenPacketKeys.add(packetKey);
    packetQueue.push({
      nodeId,
      arrivalSide,
      sourceId,
      voltage
    });
  }

  nodes
    .filter((node) => isRootSourceOnline(node) || isUpsBatterySource(node))
    .forEach((node) => {
      enqueuePacket(
        node.id,
        isUpsBatterySource(node) ? UPS_HANDLE_ID.OUTPUT : null,
        node.id,
        getNodeNominalVoltage(node)
      );
    });

  let readIndex = 0;

  while (readIndex < packetQueue.length) {
    const packet = packetQueue[readIndex];
    readIndex += 1;

    const currentNode = nodeById.get(packet.nodeId);

    if (!currentNode) {
      continue;
    }

    if (
      !isUpsNodeType(currentNode.type) ||
      shouldRecordArrivalForUps(currentNode, packet.arrivalSide)
    ) {
      sourceSetsByNodeId.get(packet.nodeId).add(packet.sourceId);
      voltageSetsByNodeId.get(packet.nodeId).add(packet.voltage);
      recordArrivalVoltage(
        arrivalBucketsByNodeId,
        packet.nodeId,
        packet.arrivalSide,
        packet.voltage
      );
    }

    const incidentEdges = incidentEdgesByNodeId.get(packet.nodeId);

    if (!incidentEdges || incidentEdges.length === 0) {
      continue;
    }

    if (isTransformerNodeType(currentNode.type)) {
      const outgoingTransmissions = getTransformerOutgoingTransmissions(
        currentNode,
        packet.arrivalSide,
        packet.voltage
      );

      if (outgoingTransmissions.length === 0) {
        continue;
      }

      for (const outgoingTransmission of outgoingTransmissions) {
        for (const edge of incidentEdges) {
          const edgeHandleRole = getTransformerHandleRoleForEdge(
            edge,
            packet.nodeId
          );

          if (
            !outgoingTransmission.outgoingHandleRoles.includes(edgeHandleRole)
          ) {
            continue;
          }

          const neighborId = getNeighborIdForEdge(edge, packet.nodeId);
          const neighborNode = nodeById.get(neighborId);

          edgeTransmissionSourceIdsByEdgeId.get(edge.id)?.add(packet.sourceId);
          enqueuePacket(
            neighborId,
            getArrivalSideForNeighbor(edge, neighborNode),
            packet.sourceId,
            outgoingTransmission.outgoingVoltage
          );
        }
      }

      continue;
    }

    if (isUpsNodeType(currentNode.type)) {
      const outgoingTransmissions = getUpsOutgoingTransmissions(
        currentNode,
        packet.arrivalSide,
        packet.voltage
      );

      if (outgoingTransmissions.length === 0) {
        continue;
      }

      for (const outgoingTransmission of outgoingTransmissions) {
        for (const edge of incidentEdges) {
          const edgeHandleRole = getUpsHandleRoleForEdge(edge, packet.nodeId);

          if (!outgoingTransmission.outgoingHandleRoles.includes(edgeHandleRole)) {
            continue;
          }

          const neighborId = getNeighborIdForEdge(edge, packet.nodeId);
          const neighborNode = nodeById.get(neighborId);

          edgeTransmissionSourceIdsByEdgeId.get(edge.id)?.add(packet.sourceId);
          enqueuePacket(
            neighborId,
            getArrivalSideForNeighbor(edge, neighborNode),
            packet.sourceId,
            outgoingTransmission.outgoingVoltage
          );
        }
      }

      continue;
    }

    for (const edge of incidentEdges) {
      const neighborId = getNeighborIdForEdge(edge, packet.nodeId);
      const neighborNode = nodeById.get(neighborId);

      edgeTransmissionSourceIdsByEdgeId.get(edge.id)?.add(packet.sourceId);
      enqueuePacket(
        neighborId,
        getArrivalSideForNeighbor(edge, neighborNode),
        packet.sourceId,
        packet.voltage
      );
    }
  }

  const powerStateByNodeId = {};
  const powerFlagsByNodeId = {};
  const sourceIdsByNodeId = {};
  const propagatingVoltagesByNodeId = {};

  for (const nodeId of nodeIds) {
    const node = nodeById.get(nodeId);
    const sourceSet = sourceSetsByNodeId.get(nodeId);
    const voltageSet = voltageSetsByNodeId.get(nodeId);
    const sourceIds = Array.from(sourceSet ?? []).sort();
    const voltageValues = Array.from(voltageSet ?? []).sort((left, right) => left - right);
    const powerFlags = createEmptyPowerFlags();

    sourceIdsByNodeId[nodeId] = sourceIds;
    propagatingVoltagesByNodeId[nodeId] = voltageValues;

    if (sourceIds.length > 0) {
      powerFlags.hasPhaseConflict = hasUnsynchronizedSources(sourceIds, nodeById);
      powerFlags.hasVoltageFault = setHasVoltageFaultForNode(
        node,
        arrivalBucketsByNodeId.get(nodeId),
        voltageSet ?? new Set()
      );

      if (isRootSourceType(node?.type)) {
        powerFlags.isLive = sourceIds.includes(nodeId);
        powerFlags.isBackfeed = !sourceIds.includes(nodeId);
      } else {
        powerFlags.isLive = true;
      }
    }

    powerFlagsByNodeId[nodeId] = powerFlags;
    powerStateByNodeId[nodeId] = resolveDominantPowerState(powerFlags);
  }

  const phaseConflictNodeIdSet = new Set(
    nodeIds.filter((nodeId) => powerFlagsByNodeId[nodeId]?.hasPhaseConflict)
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
      (phaseConflictNodeIdSet.has(edge.source) ||
        phaseConflictNodeIdSet.has(edge.target))
    ) {
      faultedEdgeIdSet.add(edge.id);
    }

    const transmittedSourceIds = Array.from(
      edgeTransmissionSourceIdsByEdgeId.get(edge.id) ?? []
    );

    if (transmittedSourceIds.length === 0) {
      edgePowerStateByEdgeId[edge.id] = EDGE_POWER_STATE.DE_ENERGIZED;
      continue;
    }

    if (hasUnsynchronizedSources(transmittedSourceIds, nodeById)) {
      edgePowerStateByEdgeId[edge.id] = EDGE_POWER_STATE.PHASE_CONFLICT;
      continue;
    }

    edgePowerStateByEdgeId[edge.id] = EDGE_POWER_STATE.ENERGIZED;
  }

  return {
    powerStateByNodeId,
    powerFlagsByNodeId,
    sourceIdsByNodeId,
    propagatingVoltagesByNodeId,
    adjacencyByNodeId,
    edgePowerStateByEdgeId,
    faultedEdgeIds: Array.from(faultedEdgeIdSet).sort()
  };
}
