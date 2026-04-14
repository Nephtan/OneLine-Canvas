import { describe, expect, it } from "vitest";
import {
  EDGE_POWER_STATE,
  NODE_POWER_STATE,
  createTopologyKey,
  evaluatePowerFlow
} from "./powerFlow";

function utilityNode(id, options = {}) {
  return {
    id,
    type: "utility",
    data: {
      label: id,
      isSourceOnline:
        options.isSourceOnline === undefined ? true : options.isSourceOnline
    },
    position: { x: 0, y: 0 }
  };
}

function mvsgNode(id) {
  return {
    id,
    type: "mvsg",
    data: { label: id },
    position: { x: 0, y: 0 }
  };
}

function breakerEdge(id, source, target, breakerState) {
  return {
    id,
    type: "breaker",
    source,
    target,
    data: { breakerState }
  };
}

describe("evaluatePowerFlow", () => {
  it("tracks one source and marks downstream gear live on a closed path", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a")];
    const edges = [breakerEdge("e1", "utility-a", "mvsg-a", "closed")];
    const { powerStateByNodeId, sourceIdsByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["mvsg-a"]).toEqual(["utility-a"]);
  });

  it("keeps two independent feeders healthy with an open tie", () => {
    const nodes = [
      utilityNode("utility-a"),
      utilityNode("utility-b"),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", "closed"),
      breakerEdge("e2", "utility-b", "mvsg-b", "closed"),
      breakerEdge("tie", "mvsg-a", "mvsg-b", "open")
    ];
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["utility-b"]).toBe(NODE_POWER_STATE.LIVE);
  });

  it("flags phase conflict when a tie closes between two live utility sources", () => {
    const nodes = [
      utilityNode("utility-a"),
      utilityNode("utility-b"),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", "closed"),
      breakerEdge("e2", "utility-b", "mvsg-b", "closed"),
      breakerEdge("tie", "mvsg-a", "mvsg-b", "closed")
    ];
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["utility-b"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
  });

  it("marks an offline utility as backfeed when energized by another source", () => {
    const nodes = [utilityNode("utility-a"), utilityNode("utility-b", { isSourceOnline: false })];
    const edges = [breakerEdge("e1", "utility-a", "utility-b", "closed")];
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["utility-b"]).toBe(NODE_POWER_STATE.BACKFEED);
  });

  it("prioritizes phase conflict over backfeed when a utility has own and foreign sources", () => {
    const nodes = [utilityNode("utility-a"), utilityNode("utility-b"), mvsgNode("mvsg-a")];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", "closed"),
      breakerEdge("e2", "mvsg-a", "utility-b", "closed")
    ];
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-b"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
  });

  it("maps closed edges to energized or phase-conflict based on endpoint source unions", () => {
    const nodes = [
      utilityNode("utility-a"),
      utilityNode("utility-b"),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", "closed"),
      breakerEdge("e2", "utility-b", "mvsg-b", "closed"),
      breakerEdge("tie", "mvsg-a", "mvsg-b", "closed"),
      breakerEdge("open-branch", "mvsg-a", "mvsg-b", "open")
    ];
    const { edgePowerStateByEdgeId } = evaluatePowerFlow(nodes, edges);

    expect(edgePowerStateByEdgeId["e1"]).toBe(EDGE_POWER_STATE.PHASE_CONFLICT);
    expect(edgePowerStateByEdgeId["e2"]).toBe(EDGE_POWER_STATE.PHASE_CONFLICT);
    expect(edgePowerStateByEdgeId["tie"]).toBe(EDGE_POWER_STATE.PHASE_CONFLICT);
    expect(edgePowerStateByEdgeId["open-branch"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
  });

  it("keeps isolated open edges de-energized and healthy feeders energized", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a"), mvsgNode("mvsg-b")];
    const edges = [
      breakerEdge("live-edge", "utility-a", "mvsg-a", "closed"),
      breakerEdge("open-edge", "mvsg-a", "mvsg-b", "open")
    ];
    const { edgePowerStateByEdgeId, powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(edgePowerStateByEdgeId["live-edge"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(edgePowerStateByEdgeId["open-edge"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.DEAD);
  });
});

describe("createTopologyKey", () => {
  it("changes when utility source online flag changes", () => {
    const nodesOnline = [utilityNode("utility-a", { isSourceOnline: true }), mvsgNode("mvsg-a")];
    const nodesOffline = [utilityNode("utility-a", { isSourceOnline: false }), mvsgNode("mvsg-a")];
    const edges = [breakerEdge("e1", "utility-a", "mvsg-a", "closed")];
    const keyOnline = createTopologyKey(nodesOnline, edges);
    const keyOffline = createTopologyKey(nodesOffline, edges);

    expect(keyOnline).not.toBe(keyOffline);
  });

  it("ignores position-only node changes so drag events do not invalidate the key", () => {
    const nodesAtPositionA = [utilityNode("utility-a"), mvsgNode("mvsg-a")];
    const nodesAtPositionB = [
      { ...utilityNode("utility-a"), position: { x: 800, y: 240 } },
      { ...mvsgNode("mvsg-a"), position: { x: 1200, y: 360 } }
    ];
    const edges = [breakerEdge("e1", "utility-a", "mvsg-a", "closed")];
    const keyA = createTopologyKey(nodesAtPositionA, edges);
    const keyB = createTopologyKey(nodesAtPositionB, edges);

    expect(keyA).toBe(keyB);
  });
});
