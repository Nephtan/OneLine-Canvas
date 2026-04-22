import {
  BREAKER_STATE,
  EDGE_LINE_SIDE,
  getLoadSideForLineSide,
  hasBoltedFault
} from "./protectionModel";
import { normalizeEdgeData } from "../edges/edgeData";
import {
  EDGE_POWER_STATE,
  evaluatePowerFlow,
  isConductiveEdge
} from "./powerFlow";
import { EDGE_TYPE, normalizeCanvasEdgeType } from "../topology/edgeTypes";

const FAULT_STATUS = {
  ACTIVE: "active",
  ISOLATED: "isolated",
  UNPROTECTED: "unprotected"
};

function getNeighborNodeId(edge, nodeId) {
  return edge.source === nodeId ? edge.target : edge.source;
}

function getNodeEdgeEndpoint(edge, nodeId) {
  return edge.source === nodeId ? EDGE_LINE_SIDE.SOURCE : EDGE_LINE_SIDE.TARGET;
}

function isProtectiveEdge(edge) {
  const normalizedEdgeData = normalizeEdgeData(edge);

  return (
    normalizeCanvasEdgeType(edge.type) === EDGE_TYPE.BREAKER &&
    normalizedEdgeData.deviceKind !== "none"
  );
}

function faultEventSort(leftEvent, rightEvent) {
  return leftEvent.id.localeCompare(rightEvent.id);
}

function createConductiveIncidentEdgeMap(nodes, edges) {
  const nodeIds = nodes.map((node) => node.id);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incidentEdgesByNodeId = new Map(
    nodeIds.map((nodeId) => [nodeId, []])
  );

  edges.forEach((edge) => {
    if (
      !nodeById.has(edge.source) ||
      !nodeById.has(edge.target) ||
      !isConductiveEdge(edge, nodeById)
    ) {
      return;
    }

    incidentEdgesByNodeId.get(edge.source)?.push(edge);
    incidentEdgesByNodeId.get(edge.target)?.push(edge);
  });

  return incidentEdgesByNodeId;
}

function isRootSourceType(nodeType) {
  return nodeType === "utility" || nodeType === "generator";
}

function createPhaseConflictEvents(nodes, edges, powerFlowResult, conductiveIncidentEdgesByNodeId) {
  const phaseConflictNodeIdSet = new Set(
    nodes
      .filter((node) => powerFlowResult.powerFlagsByNodeId[node.id]?.hasPhaseConflict)
      .map((node) => node.id)
  );
  const events = [];
  const visitedNodeIds = new Set();

  Array.from(phaseConflictNodeIdSet)
    .sort()
    .forEach((seedNodeId) => {
      if (visitedNodeIds.has(seedNodeId)) {
        return;
      }

      const componentNodeIdSet = new Set([seedNodeId]);
      const queue = [seedNodeId];
      visitedNodeIds.add(seedNodeId);

      while (queue.length > 0) {
        const currentNodeId = queue.shift();
        const incidentEdges = conductiveIncidentEdgesByNodeId.get(currentNodeId) ?? [];

        incidentEdges.forEach((edge) => {
          const neighborNodeId = getNeighborNodeId(edge, currentNodeId);

          if (
            !phaseConflictNodeIdSet.has(neighborNodeId) ||
            visitedNodeIds.has(neighborNodeId)
          ) {
            return;
          }

          visitedNodeIds.add(neighborNodeId);
          componentNodeIdSet.add(neighborNodeId);
          queue.push(neighborNodeId);
        });
      }

      const componentNodeIds = Array.from(componentNodeIdSet).sort();

      if (componentNodeIds.length === 0) {
        return;
      }

      events.push({
        id: `phaseConflict:component:${componentNodeIds.join("|")}`,
        kind: "phaseConflict",
        targetType: "component",
        targetId: componentNodeIds.join("|"),
        targetNodeIds: componentNodeIds
      });
    });

  return events.sort(faultEventSort);
}

function isFaultEventActive(event, edgeById, powerFlowResult) {
  if (event.targetType === "component") {
    return event.targetNodeIds.some(
      (nodeId) => powerFlowResult.powerFlagsByNodeId[nodeId]?.hasPhaseConflict
    );
  }

  if (event.targetType === "node") {
    return (powerFlowResult.sourceIdsByNodeId[event.targetId] ?? []).length > 0;
  }

  const eventEdge = edgeById.get(event.targetId);

  if (!eventEdge) {
    return false;
  }

  return (
    powerFlowResult.edgePowerStateByEdgeId[event.targetId] !==
    EDGE_POWER_STATE.DE_ENERGIZED
  );
}

function getFaultEventSourceIds(event, powerFlowResult) {
  if (event.targetType === "component") {
    return Array.from(
      new Set(
        event.targetNodeIds.flatMap(
          (nodeId) => powerFlowResult.sourceIdsByNodeId[nodeId] ?? []
        )
      )
    ).sort();
  }

  if (event.targetType === "node") {
    return powerFlowResult.sourceIdsByNodeId[event.targetId] ?? [];
  }

  return powerFlowResult.sourceIdsByEdgeId?.[event.targetId] ?? [];
}

function resolveBoundaryTripsFromSeedNodes(seedNodeIds, conductiveIncidentEdgesByNodeId) {
  const visitedNodeIds = new Set(seedNodeIds);
  const queue = [...seedNodeIds];
  const clearingEdgeIdSet = new Set();

  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    const incidentEdges = conductiveIncidentEdgesByNodeId.get(currentNodeId) ?? [];

    incidentEdges.forEach((edge) => {
      const neighborNodeId = getNeighborNodeId(edge, currentNodeId);

      if (visitedNodeIds.has(neighborNodeId)) {
        return;
      }

      if (isProtectiveEdge(edge)) {
        const normalizedEdgeData = normalizeEdgeData(edge);
        const currentEndpoint = getNodeEdgeEndpoint(edge, currentNodeId);
        const loadSide = getLoadSideForLineSide(normalizedEdgeData.lineSide);

        if (currentEndpoint === loadSide) {
          clearingEdgeIdSet.add(edge.id);
          return;
        }
      }

      visitedNodeIds.add(neighborNodeId);
      queue.push(neighborNodeId);
    });
  }

  return Array.from(clearingEdgeIdSet).sort();
}

function createBoltedFaultEvents(nodes, edges) {
  const nodeEvents = nodes
    .filter((node) => hasBoltedFault(node.data?.faultType))
    .map((node) => ({
      id: `boltedFault:node:${node.id}`,
      kind: "boltedFault",
      targetType: "node",
      targetId: node.id
    }));
  const edgeEvents = edges
    .filter((edge) => hasBoltedFault(normalizeEdgeData(edge).faultType))
    .map((edge) => ({
      id: `boltedFault:edge:${edge.id}`,
      kind: "boltedFault",
      targetType: "edge",
      targetId: edge.id
    }));

  return nodeEvents.concat(edgeEvents).sort(faultEventSort);
}

function getPhaseConflictCandidateEdges(event, edgeById) {
  const componentNodeIdSet = new Set(event.targetNodeIds);

  return Array.from(edgeById.values())
    .filter(
      (edge) =>
        isProtectiveEdge(edge) &&
        componentNodeIdSet.has(edge.source) &&
        componentNodeIdSet.has(edge.target)
    )
    .sort((leftEdge, rightEdge) => leftEdge.id.localeCompare(rightEdge.id));
}

function phaseConflictResolvedForComponent(componentNodeIds, powerFlowResult) {
  return componentNodeIds.every(
    (nodeId) => !powerFlowResult.powerFlagsByNodeId[nodeId]?.hasPhaseConflict
  );
}

function countRootEndpoints(edge, nodeById) {
  let rootEndpointCount = 0;

  if (isRootSourceType(nodeById.get(edge.source)?.type)) {
    rootEndpointCount += 1;
  }

  if (isRootSourceType(nodeById.get(edge.target)?.type)) {
    rootEndpointCount += 1;
  }

  return rootEndpointCount;
}

function openCandidateEdges(edges, candidateEdgeIds) {
  const candidateEdgeIdSet = new Set(candidateEdgeIds);

  return edges.map((edge) => {
    if (!candidateEdgeIdSet.has(edge.id)) {
      return edge;
    }

    return {
      ...edge,
      data: {
        ...normalizeEdgeData(edge),
        breakerState: BREAKER_STATE.OPEN
      }
    };
  });
}

function enumerateEdgeIdSubsets(candidateEdges, subsetSize) {
  const subsets = [];

  function visit(startIndex, currentSubset) {
    if (currentSubset.length === subsetSize) {
      subsets.push([...currentSubset]);
      return;
    }

    for (
      let candidateIndex = startIndex;
      candidateIndex <= candidateEdges.length - (subsetSize - currentSubset.length);
      candidateIndex += 1
    ) {
      currentSubset.push(candidateEdges[candidateIndex]);
      visit(candidateIndex + 1, currentSubset);
      currentSubset.pop();
    }
  }

  visit(0, []);
  return subsets;
}

function resolvePhaseConflictTrips(event, nodes, edges, edgeById, conductiveIncidentEdgesByNodeId) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const candidateEdges = getPhaseConflictCandidateEdges(event, edgeById);

  if (candidateEdges.length === 0) {
    return resolveBoundaryTripsFromSeedNodes(event.targetNodeIds, conductiveIncidentEdgesByNodeId);
  }

  if (candidateEdges.length > 8) {
    return resolveBoundaryTripsFromSeedNodes(event.targetNodeIds, conductiveIncidentEdgesByNodeId);
  }

  for (let subsetSize = 1; subsetSize <= candidateEdges.length; subsetSize += 1) {
    const validSubsets = enumerateEdgeIdSubsets(candidateEdges, subsetSize)
      .map((candidateSubset) => {
        const candidateEdgeIds = candidateSubset.map((edge) => edge.id);
        const simulatedPowerFlow = evaluatePowerFlow(
          nodes,
          openCandidateEdges(edges, candidateEdgeIds)
        );

        if (!phaseConflictResolvedForComponent(event.targetNodeIds, simulatedPowerFlow)) {
          return null;
        }

        const rootEndpointPenalty = candidateSubset.reduce(
          (penalty, edge) => penalty + countRootEndpoints(edge, nodeById),
          0
        );

        return {
          candidateEdgeIds,
          rootEndpointPenalty,
          lexicalKey: candidateEdgeIds.join("|")
        };
      })
      .filter(Boolean)
      .sort((leftSubset, rightSubset) => {
        if (leftSubset.rootEndpointPenalty !== rightSubset.rootEndpointPenalty) {
          return leftSubset.rootEndpointPenalty - rightSubset.rootEndpointPenalty;
        }

        return leftSubset.lexicalKey.localeCompare(rightSubset.lexicalKey);
      });

    if (validSubsets.length > 0) {
      return validSubsets[0].candidateEdgeIds;
    }
  }

  return resolveBoundaryTripsFromSeedNodes(event.targetNodeIds, conductiveIncidentEdgesByNodeId);
}

function resolveBoundaryTripsForEvent(
  event,
  nodes,
  edges,
  edgeById,
  conductiveIncidentEdgesByNodeId
) {
  if (event.kind === "phaseConflict" && event.targetType === "component") {
    return resolvePhaseConflictTrips(
      event,
      nodes,
      edges,
      edgeById,
      conductiveIncidentEdgesByNodeId
    );
  }

  if (event.targetType === "edge") {
    const eventEdge = edgeById.get(event.targetId);

    if (!eventEdge) {
      return [];
    }

    if (isProtectiveEdge(eventEdge)) {
      return [eventEdge.id];
    }
  }

  const seedNodeIds =
    event.targetType === "node"
      ? [event.targetId]
      : (() => {
          const eventEdge = edgeById.get(event.targetId);

          if (!eventEdge) {
            return [];
          }

          return [eventEdge.source, eventEdge.target];
        })();

  return resolveBoundaryTripsFromSeedNodes(seedNodeIds, conductiveIncidentEdgesByNodeId);
}

export function evaluateProtectionState(nodes, edges, powerFlowResult) {
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const conductiveIncidentEdgesByNodeId = createConductiveIncidentEdgeMap(nodes, edges);
  const faultEvents = createBoltedFaultEvents(nodes, edges).concat(
    createPhaseConflictEvents(nodes, edges, powerFlowResult, conductiveIncidentEdgesByNodeId)
  );
  const faultSummaries = faultEvents
    .sort(faultEventSort)
    .map((event) => {
      const isActive = isFaultEventActive(event, edgeById, powerFlowResult);
      const sourceIds = getFaultEventSourceIds(event, powerFlowResult);
      const clearingEdgeIds = isActive
        ? resolveBoundaryTripsForEvent(
            event,
            nodes,
            edges,
            edgeById,
            conductiveIncidentEdgesByNodeId
          )
        : [];
      const status = !isActive
        ? FAULT_STATUS.ISOLATED
        : clearingEdgeIds.length > 0
          ? FAULT_STATUS.ACTIVE
          : FAULT_STATUS.UNPROTECTED;

      return {
        ...event,
        status,
        sourceIds,
        clearingEdgeIds
      };
    });
  const protectionTripEdgeIds = Array.from(
    new Set(
      faultSummaries.flatMap((faultSummary) =>
        faultSummary.status === FAULT_STATUS.ACTIVE
          ? faultSummary.clearingEdgeIds
          : []
      )
    )
  ).sort();

  return {
    faultSummaries,
    protectionTripEdgeIds,
    faultedEdgeIds: protectionTripEdgeIds
  };
}
