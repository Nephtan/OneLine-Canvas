import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import {
  EDGE_POWER_STATE,
  NODE_POWER_STATE,
  createTopologyKey,
  evaluatePowerFlow
} from "./powerFlow";
import { evaluateProtectionState } from "./protection";
import {
  BREAKER_STATE,
  normalizeBreakerState
} from "./protectionModel";
import {
  cloneTopologyWithShiftedLayout,
  createMainTieMainConflictTopology,
  createMixedVoltageCorridorTopology,
  createRadialFeederTopology
} from "./performanceTopologies";
import { TRANSFER_SWITCH_ACTIVE_SOURCE } from "../topology/transferSwitch";

const CREATE_KEY_BUDGET_MS = 2500;
const POWER_FLOW_BUDGET_MS = 2500;
const PROTECTION_BUDGET_MS = 2500;

function measureDuration(callback) {
  const startedAt = performance.now();
  const result = callback();
  return {
    result,
    durationMs: performance.now() - startedAt
  };
}

function evaluateSystemState(nodes, edges) {
  const powerFlowMeasurement = measureDuration(() => evaluatePowerFlow(nodes, edges));
  const protectionMeasurement = measureDuration(() =>
    evaluateProtectionState(nodes, edges, powerFlowMeasurement.result)
  );

  return {
    ...powerFlowMeasurement.result,
    ...protectionMeasurement.result,
    timing: {
      powerFlowDurationMs: powerFlowMeasurement.durationMs,
      protectionDurationMs: protectionMeasurement.durationMs
    }
  };
}

describe("large-graph engine performance coverage", () => {
  it("keeps a deep radial feeder deterministic across a large partially open corridor", () => {
    const topology = createRadialFeederTopology({
      segmentCount: 220,
      branchLoadFanout: 2,
      openSegmentIndex: 164
    });
    const topologyKeyMeasurement = measureDuration(() =>
      createTopologyKey(topology.nodes, topology.edges)
    );
    const evaluation = evaluateSystemState(topology.nodes, topology.edges);

    expect(topologyKeyMeasurement.durationMs).toBeLessThan(CREATE_KEY_BUDGET_MS);
    expect(evaluation.timing.powerFlowDurationMs).toBeLessThan(POWER_FLOW_BUDGET_MS);
    expect(evaluation.timing.protectionDurationMs).toBeLessThan(PROTECTION_BUDGET_MS);
    expect(topologyKeyMeasurement.result.length).toBeGreaterThan(0);
    expect(
      evaluation.powerStateByNodeId[topology.sentinels.lastLiveNodeId]
    ).toBe(NODE_POWER_STATE.LIVE);
    expect(
      evaluation.powerStateByNodeId[topology.sentinels.firstDeadNodeId]
    ).toBe(NODE_POWER_STATE.DEAD);
    expect(
      evaluation.powerStateByNodeId[topology.sentinels.deepestDeadLoadId]
    ).toBe(NODE_POWER_STATE.DEAD);
    expect(evaluation.protectionTripEdgeIds).toEqual([]);
  });

  it("propagates large main-tie-main conflict components and selects the tie as the clearing breaker", () => {
    const topology = createMainTieMainConflictTopology({
      sectionCount: 128,
      branchLoadFanout: 1
    });
    const evaluation = evaluateSystemState(topology.nodes, topology.edges);
    const isolatedEdges = topology.edges.map((edge) => {
      if (edge.id !== topology.sentinels.tieBreakerEdgeId) {
        return edge;
      }

      return {
        ...edge,
        data: {
          ...edge.data,
          breakerState: BREAKER_STATE.OPEN
        }
      };
    });
    const isolatedEvaluation = evaluateSystemState(topology.nodes, isolatedEdges);

    expect(evaluation.timing.powerFlowDurationMs).toBeLessThan(POWER_FLOW_BUDGET_MS);
    expect(evaluation.timing.protectionDurationMs).toBeLessThan(PROTECTION_BUDGET_MS);
    expect(
      evaluation.powerStateByNodeId[topology.sentinels.leftConflictNodeId]
    ).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(
      evaluation.powerStateByNodeId[topology.sentinels.rightConflictNodeId]
    ).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(
      evaluation.edgePowerStateByEdgeId[topology.sentinels.tieBreakerEdgeId]
    ).toBe(EDGE_POWER_STATE.PHASE_CONFLICT);
    expect(evaluation.protectionTripEdgeIds).toEqual([topology.sentinels.tieBreakerEdgeId]);
    expect(
      isolatedEvaluation.powerStateByNodeId[topology.sentinels.leftHealthyLoadId]
    ).toBe(NODE_POWER_STATE.LIVE);
    expect(
      isolatedEvaluation.powerStateByNodeId[topology.sentinels.rightHealthyLoadId]
    ).toBe(NODE_POWER_STATE.LIVE);
  });

  it("holds voltage-aware PTX, ATS, and UPS semantics across a wide mixed-voltage corridor", () => {
    const topology = createMixedVoltageCorridorTopology({
      corridorCount: 64,
      faultedUpsIndex: 63
    });
    const evaluation = evaluateSystemState(topology.nodes, topology.edges);

    expect(evaluation.timing.powerFlowDurationMs).toBeLessThan(POWER_FLOW_BUDGET_MS);
    expect(evaluation.timing.protectionDurationMs).toBeLessThan(PROTECTION_BUDGET_MS);
    expect(
      evaluation.powerStateByNodeId[topology.sentinels.healthyLoadId]
    ).toBe(NODE_POWER_STATE.LIVE);
    expect(
      evaluation.powerStateByNodeId[topology.sentinels.healthyUpsId]
    ).toBe(NODE_POWER_STATE.LIVE);
    expect(
      evaluation.edgePowerStateByEdgeId[topology.sentinels.inactiveEmergencyEdgeId]
    ).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
    expect(
      evaluation.powerStateByNodeId[topology.sentinels.faultedUpsId]
    ).toBe(NODE_POWER_STATE.VOLTAGE_FAULT);
    expect(
      evaluation.powerStateByNodeId[topology.sentinels.deadFaultedLoadId]
    ).toBe(NODE_POWER_STATE.DEAD);
    expect(evaluation.protectionTripEdgeIds).toEqual([]);
  });

  it("keeps topology keys stable for layout-only shifts and invalidates them for electrical changes on large graphs", () => {
    const topology = createMixedVoltageCorridorTopology({
      corridorCount: 40,
      faultedUpsIndex: 39
    });
    const shiftedTopology = cloneTopologyWithShiftedLayout(topology);
    const stableKey = createTopologyKey(topology.nodes, topology.edges);
    const shiftedKeyMeasurement = measureDuration(() =>
      createTopologyKey(shiftedTopology.nodes, shiftedTopology.edges)
    );
    const atsMutatedNodes = topology.nodes.map((node) => {
      if (node.id !== topology.sentinels.electricalMutationAtsNodeId) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
        }
      };
    });
    const breakerMutatedEdges = topology.edges.map((edge) => {
      if (edge.id !== topology.sentinels.electricalMutationBreakerEdgeId) {
        return edge;
      }

      return {
        ...edge,
        data: {
          ...edge.data,
          breakerState: normalizeBreakerState(BREAKER_STATE.OPEN)
        }
      };
    });

    expect(shiftedKeyMeasurement.durationMs).toBeLessThan(CREATE_KEY_BUDGET_MS);
    expect(stableKey).toBe(shiftedKeyMeasurement.result);
    expect(createTopologyKey(atsMutatedNodes, topology.edges)).not.toBe(stableKey);
    expect(createTopologyKey(topology.nodes, breakerMutatedEdges)).not.toBe(stableKey);
  });
});
