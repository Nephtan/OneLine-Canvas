import { describe, expect, it } from "vitest";
import { DEFAULT_LOW_VOLTAGE } from "../electrical/voltage";
import { evaluatePowerFlow } from "./powerFlow";
import { evaluateProtectionState } from "./protection";
import {
  BREAKER_STATE,
  EDGE_LINE_SIDE,
  FAULT_TYPE
} from "./protectionModel";
import { EDGE_TYPE as CANVAS_EDGE_TYPE } from "../topology/edgeTypes";
import { normalizeEdgeData } from "../edges/edgeData";

function utilityNode(id, options = {}) {
  return {
    id,
    type: "utility",
    data: {
      label: id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE,
      syncGroup: options.syncGroup ?? "",
      isSourceOnline:
        options.isSourceOnline === undefined ? true : options.isSourceOnline,
      faultType: options.faultType ?? FAULT_TYPE.NONE
    },
    position: { x: 0, y: 0 }
  };
}

function generatorNode(id, options = {}) {
  return {
    id,
    type: "generator",
    data: {
      label: id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE,
      syncGroup: options.syncGroup ?? "",
      isSourceOnline:
        options.isSourceOnline === undefined ? true : options.isSourceOnline,
      faultType: options.faultType ?? FAULT_TYPE.NONE
    },
    position: { x: 0, y: 0 }
  };
}

function switchboardNode(id, options = {}) {
  return {
    id,
    type: "switchboard",
    data: {
      label: id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE,
      faultType: options.faultType ?? FAULT_TYPE.NONE
    },
    position: { x: 0, y: 0 }
  };
}

function loadNode(id, options = {}) {
  return {
    id,
    type: "load",
    data: {
      label: id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE,
      faultType: options.faultType ?? FAULT_TYPE.NONE
    },
    position: { x: 0, y: 0 }
  };
}

function breakerEdge(id, source, target, breakerState, options = {}) {
  return {
    id,
    type: CANVAS_EDGE_TYPE.BREAKER,
    source,
    target,
    sourceHandle: options.sourceHandle,
    targetHandle: options.targetHandle,
    data: {
      breakerState,
      lineSide: options.lineSide ?? EDGE_LINE_SIDE.SOURCE,
      faultType: options.faultType ?? FAULT_TYPE.NONE
    }
  };
}

function standardEdge(id, source, target, options = {}) {
  return {
    id,
    type: CANVAS_EDGE_TYPE.STANDARD,
    source,
    target,
    sourceHandle: options.sourceHandle,
    targetHandle: options.targetHandle,
    data: {
      faultType: options.faultType ?? FAULT_TYPE.NONE
    }
  };
}

function evaluateSystemState(nodes, edges) {
  const powerFlowResult = evaluatePowerFlow(nodes, edges);

  return {
    ...powerFlowResult,
    ...evaluateProtectionState(nodes, edges, powerFlowResult)
  };
}

function setBreakerState(edges, edgeId, breakerState) {
  return edges.map((edge) => {
    if (edge.id !== edgeId) {
      return edge;
    }

    return {
      ...edge,
      data: {
        ...normalizeEdgeData(edge),
        breakerState
      }
    };
  });
}

describe("evaluateProtectionState", () => {
  it("trips only the nearest downstream branch breaker for a branch node fault", () => {
    const nodes = [
      utilityNode("utility-a"),
      switchboardNode("swbd-main"),
      loadNode("load-a", { faultType: FAULT_TYPE.BOLTED })
    ];
    const edges = [
      breakerEdge("main", "utility-a", "swbd-main", BREAKER_STATE.CLOSED),
      breakerEdge("branch", "swbd-main", "load-a", BREAKER_STATE.CLOSED)
    ];
    const { protectionTripEdgeIds } = evaluateSystemState(nodes, edges);

    expect(protectionTripEdgeIds).toEqual(["branch"]);
  });

  it("trips only the main breaker for a main bus fault", () => {
    const nodes = [
      utilityNode("utility-a"),
      switchboardNode("swbd-main", { faultType: FAULT_TYPE.BOLTED }),
      loadNode("load-a")
    ];
    const edges = [
      breakerEdge("main", "utility-a", "swbd-main", BREAKER_STATE.CLOSED),
      breakerEdge("branch", "swbd-main", "load-a", BREAKER_STATE.CLOSED)
    ];
    const { protectionTripEdgeIds } = evaluateSystemState(nodes, edges);

    expect(protectionTripEdgeIds).toEqual(["main"]);
  });

  it("isolates a faulted main-tie-main section while keeping the healthy side live", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "GRID-A" }),
      utilityNode("utility-b", { syncGroup: "GRID-A" }),
      switchboardNode("bus-a", { faultType: FAULT_TYPE.BOLTED }),
      switchboardNode("bus-b"),
      loadNode("load-b")
    ];
    const edges = [
      breakerEdge("main-a", "utility-a", "bus-a", BREAKER_STATE.CLOSED),
      breakerEdge("main-b", "utility-b", "bus-b", BREAKER_STATE.CLOSED),
      breakerEdge("tie", "bus-a", "bus-b", BREAKER_STATE.CLOSED, {
        lineSide: EDGE_LINE_SIDE.TARGET
      }),
      breakerEdge("branch-b", "bus-b", "load-b", BREAKER_STATE.CLOSED)
    ];
    const initialResult = evaluateSystemState(nodes, edges);
    const isolatedResult = evaluateSystemState(
      nodes,
      setBreakerState(
        setBreakerState(edges, "main-a", BREAKER_STATE.OPEN),
        "tie",
        BREAKER_STATE.OPEN
      )
    );

    expect(initialResult.protectionTripEdgeIds).toEqual(["main-a", "tie"]);
    expect(isolatedResult.protectionTripEdgeIds).toEqual([]);
    expect(isolatedResult.powerStateByNodeId["bus-b"]).toBe("Live");
    expect(isolatedResult.powerStateByNodeId["load-b"]).toBe("Live");
  });

  it("chooses the common downstream breaker when synchronized sources parallel a faulted branch", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "GRID-A" }),
      utilityNode("utility-b", { syncGroup: "GRID-A" }),
      switchboardNode("bus-a"),
      switchboardNode("bus-b"),
      loadNode("load-a", { faultType: FAULT_TYPE.BOLTED })
    ];
    const edges = [
      breakerEdge("main-a", "utility-a", "bus-a", BREAKER_STATE.CLOSED),
      breakerEdge("main-b", "utility-b", "bus-b", BREAKER_STATE.CLOSED),
      breakerEdge("tie", "bus-a", "bus-b", BREAKER_STATE.CLOSED),
      breakerEdge("branch", "bus-a", "load-a", BREAKER_STATE.CLOSED)
    ];
    const { protectionTripEdgeIds } = evaluateSystemState(nodes, edges);

    expect(protectionTripEdgeIds).toEqual(["branch"]);
  });

  it("uses line-load orientation to pick the correct backfeed clearing breaker", () => {
    const nodes = [
      utilityNode("utility-a", {
        isSourceOnline: false,
        faultType: FAULT_TYPE.BOLTED
      }),
      generatorNode("gen-a"),
      switchboardNode("bus-a")
    ];
    const edges = [
      breakerEdge("utility-feed", "utility-a", "bus-a", BREAKER_STATE.CLOSED),
      breakerEdge("gen-feed", "gen-a", "bus-a", BREAKER_STATE.CLOSED)
    ];
    const { protectionTripEdgeIds } = evaluateSystemState(nodes, edges);

    expect(protectionTripEdgeIds).toEqual(["gen-feed"]);
  });

  it("never trips a standard wire and re-trips the upstream breaker after reset and reclose", () => {
    const nodes = [
      utilityNode("utility-a"),
      switchboardNode("bus-a"),
      loadNode("load-a")
    ];
    const edges = [
      breakerEdge("main", "utility-a", "bus-a", BREAKER_STATE.CLOSED),
      standardEdge("wire-a", "bus-a", "load-a", {
        faultType: FAULT_TYPE.BOLTED
      })
    ];
    const initialResult = evaluateSystemState(nodes, edges);
    const resetResult = evaluateSystemState(
      nodes,
      setBreakerState(edges, "main", BREAKER_STATE.OPEN)
    );
    const reclosedResult = evaluateSystemState(nodes, edges);

    expect(initialResult.protectionTripEdgeIds).toEqual(["main"]);
    expect(initialResult.protectionTripEdgeIds).not.toContain("wire-a");
    expect(resetResult.protectionTripEdgeIds).toEqual([]);
    expect(reclosedResult.protectionTripEdgeIds).toEqual(["main"]);
  });
});
