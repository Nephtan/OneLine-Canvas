import { describe, expect, it } from "vitest";
import {
  BREAKER_STATE,
  EDGE_POWER_STATE,
  NODE_POWER_STATE,
  createTopologyKey,
  evaluatePowerFlow
} from "./powerFlow";
import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_HANDLE_ID
} from "../topology/transferSwitch";

function utilityNode(id, options = {}) {
  return {
    id,
    type: "utility",
    data: {
      label: id,
      syncGroup: options.syncGroup ?? "",
      isSourceOnline:
        options.isSourceOnline === undefined ? true : options.isSourceOnline
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
      syncGroup: options.syncGroup ?? "",
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

function ptxNode(id) {
  return {
    id,
    type: "ptx",
    data: { label: id },
    position: { x: 0, y: 0 }
  };
}

function loadNode(id) {
  return {
    id,
    type: "load",
    data: { label: id },
    position: { x: 0, y: 0 }
  };
}

function switchboardNode(id) {
  return {
    id,
    type: "switchboard",
    data: { label: id },
    position: { x: 0, y: 0 }
  };
}

function transferSwitchNode(id, options = {}) {
  return {
    id,
    type: "transferSwitch",
    data: {
      label: id,
      activeSource:
        options.activeSource ?? TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
    },
    position: { x: 0, y: 0 }
  };
}

function mechanicalNode(id) {
  return {
    id,
    type: "mechanical",
    data: { label: id },
    position: { x: 0, y: 0 }
  };
}

function breakerEdge(id, source, target, breakerState, handleOptions = {}) {
  return {
    id,
    type: "breaker",
    source,
    target,
    ...handleOptions,
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

  it("flags phase conflict when a tie closes between two live utility sources with blank sync groups", () => {
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

  it("allows two utility sources in the same sync group to parallel without tripping", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "SUBSTATION-1" }),
      utilityNode("utility-b", { syncGroup: "SUBSTATION-1" }),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "utility-b", "mvsg-b", BREAKER_STATE.CLOSED),
      breakerEdge("tie", "mvsg-a", "mvsg-b", BREAKER_STATE.CLOSED)
    ];
    const {
      powerStateByNodeId,
      edgePowerStateByEdgeId,
      faultedEdgeIds,
      sourceIdsByNodeId
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["utility-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["mvsg-a"]).toEqual(["utility-a", "utility-b"]);
    expect(edgePowerStateByEdgeId["e1"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(edgePowerStateByEdgeId["e2"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(edgePowerStateByEdgeId["tie"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("flags phase conflict when one tied utility has a blank sync group and the other is tagged", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "GRID-A" }),
      utilityNode("utility-b", { syncGroup: "" }),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "utility-b", "mvsg-b", BREAKER_STATE.CLOSED),
      breakerEdge("tie", "mvsg-a", "mvsg-b", BREAKER_STATE.CLOSED)
    ];
    const { powerStateByNodeId, faultedEdgeIds } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(faultedEdgeIds).toEqual(["e1", "e2", "tie"]);
  });

  it("normalizes sync group strings before allowing a parallel tie", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: " grid-a " }),
      utilityNode("utility-b", { syncGroup: "GRID-A" }),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "utility-b", "mvsg-b", BREAKER_STATE.CLOSED),
      breakerEdge("tie", "mvsg-a", "mvsg-b", BREAKER_STATE.CLOSED)
    ];
    const { powerStateByNodeId, faultedEdgeIds } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["utility-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(faultedEdgeIds).toEqual([]);
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

  it("treats tripped breakers as non-conductive and de-energized", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a")];
    const edges = [breakerEdge("trip-edge", "utility-a", "mvsg-a", BREAKER_STATE.TRIPPED)];
    const { powerStateByNodeId, edgePowerStateByEdgeId, faultedEdgeIds } =
      evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(edgePowerStateByEdgeId["trip-edge"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("emits faulted edge ids for all closed breakers touching conflict nodes", () => {
    const nodes = [
      utilityNode("utility-a"),
      utilityNode("utility-b"),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "utility-b", "mvsg-b", BREAKER_STATE.CLOSED),
      breakerEdge("tie", "mvsg-a", "mvsg-b", BREAKER_STATE.CLOSED)
    ];
    const { faultedEdgeIds, powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(faultedEdgeIds).toEqual(["e1", "e2", "tie"]);
  });

  it("never emits open or tripped breakers in faulted edge ids", () => {
    const nodes = [
      utilityNode("utility-a"),
      utilityNode("utility-b"),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("closed-a", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("closed-b", "utility-b", "mvsg-b", BREAKER_STATE.CLOSED),
      breakerEdge("open-tie", "mvsg-a", "mvsg-b", BREAKER_STATE.OPEN),
      breakerEdge("tripped-tie", "mvsg-a", "mvsg-b", BREAKER_STATE.TRIPPED)
    ];
    const { powerStateByNodeId, faultedEdgeIds } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("emits no faulted edge ids on single-source energized paths", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a"), loadNode("load-a")];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "mvsg-a", "load-a", BREAKER_STATE.CLOSED)
    ];
    const { faultedEdgeIds, powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["load-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(faultedEdgeIds).toEqual([]);
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

  it("energizes PTX and Load in a downstream chain from one utility", () => {
    const nodes = [
      utilityNode("utility-a"),
      mvsgNode("mvsg-a"),
      ptxNode("ptx-a"),
      loadNode("load-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", "closed"),
      breakerEdge("e2", "mvsg-a", "ptx-a", "closed"),
      breakerEdge("e3", "ptx-a", "load-a", "closed")
    ];
    const { powerStateByNodeId, sourceIdsByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["load-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["ptx-a"]).toEqual(["utility-a"]);
    expect(sourceIdsByNodeId["load-a"]).toEqual(["utility-a"]);
  });

  it("drops PTX and Load dark when the only utility source is offline", () => {
    const nodes = [
      utilityNode("utility-a", { isSourceOnline: false }),
      mvsgNode("mvsg-a"),
      ptxNode("ptx-a"),
      loadNode("load-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", "closed"),
      breakerEdge("e2", "mvsg-a", "ptx-a", "closed"),
      breakerEdge("e3", "ptx-a", "load-a", "closed")
    ];
    const { powerStateByNodeId, edgePowerStateByEdgeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(powerStateByNodeId["load-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(edgePowerStateByEdgeId["e1"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
    expect(edgePowerStateByEdgeId["e2"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
    expect(edgePowerStateByEdgeId["e3"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
  });

  it("treats generator as a root source and energizes downstream nodes", () => {
    const nodes = [generatorNode("gen-a"), mvsgNode("mvsg-a"), loadNode("load-a")];
    const edges = [
      breakerEdge("e1", "gen-a", "mvsg-a", "closed"),
      breakerEdge("e2", "mvsg-a", "load-a", "closed")
    ];
    const { powerStateByNodeId, sourceIdsByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["gen-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["load-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["load-a"]).toEqual(["gen-a"]);
  });

  it("de-energizes the generator feeder when generator source is offline", () => {
    const nodes = [generatorNode("gen-a", { isSourceOnline: false }), mvsgNode("mvsg-a")];
    const edges = [breakerEdge("e1", "gen-a", "mvsg-a", "closed")];
    const { powerStateByNodeId, edgePowerStateByEdgeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["gen-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(edgePowerStateByEdgeId["e1"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
  });

  it("propagates generator power through switchboard and transfer switch to mechanical load", () => {
    const nodes = [
      generatorNode("gen-a"),
      switchboardNode("swbd-a"),
      transferSwitchNode("ats-a"),
      mechanicalNode("fcw-a")
    ];
    const edges = [
      breakerEdge("e1", "gen-a", "swbd-a", "closed"),
      breakerEdge("e2", "swbd-a", "ats-a", "closed", {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      }),
      breakerEdge("e3", "ats-a", "fcw-a", "closed", {
        sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT
      })
    ];
    const { powerStateByNodeId, sourceIdsByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ats-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["fcw-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["fcw-a"]).toEqual(["gen-a"]);
  });

  it("conducts only the primary ATS feeder when the transfer switch is set to primary", () => {
    const nodes = [
      utilityNode("utility-a"),
      generatorNode("gen-a", { syncGroup: "GEN-BUS" }),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
      }),
      mechanicalNode("fcw-a")
    ];
    const edges = [
      breakerEdge("primary-feed", "utility-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      }),
      breakerEdge("emergency-feed", "gen-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
      }),
      breakerEdge("load-feed", "ats-a", "fcw-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT
      })
    ];
    const {
      powerStateByNodeId,
      sourceIdsByNodeId,
      edgePowerStateByEdgeId,
      faultedEdgeIds
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["gen-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ats-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["fcw-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["ats-a"]).toEqual(["utility-a"]);
    expect(sourceIdsByNodeId["fcw-a"]).toEqual(["utility-a"]);
    expect(edgePowerStateByEdgeId["primary-feed"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(edgePowerStateByEdgeId["emergency-feed"]).toBe(
      EDGE_POWER_STATE.DE_ENERGIZED
    );
    expect(edgePowerStateByEdgeId["load-feed"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("conducts only the emergency ATS feeder when the transfer switch is set to emergency", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "GRID-A" }),
      generatorNode("gen-a", { syncGroup: "GEN-BUS" }),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
      }),
      mechanicalNode("fcw-a")
    ];
    const edges = [
      breakerEdge("primary-feed", "utility-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      }),
      breakerEdge("emergency-feed", "gen-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
      }),
      breakerEdge("load-feed", "ats-a", "fcw-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT
      })
    ];
    const {
      powerStateByNodeId,
      sourceIdsByNodeId,
      edgePowerStateByEdgeId,
      faultedEdgeIds
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["gen-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ats-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["fcw-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["ats-a"]).toEqual(["gen-a"]);
    expect(sourceIdsByNodeId["fcw-a"]).toEqual(["gen-a"]);
    expect(edgePowerStateByEdgeId["primary-feed"]).toBe(
      EDGE_POWER_STATE.DE_ENERGIZED
    );
    expect(edgePowerStateByEdgeId["emergency-feed"]).toBe(
      EDGE_POWER_STATE.ENERGIZED
    );
    expect(edgePowerStateByEdgeId["load-feed"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("prevents phase conflict when unsynchronized sources land on opposite ATS inputs", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "GRID-A" }),
      generatorNode("gen-a", { syncGroup: "GRID-B" }),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
      }),
      mechanicalNode("fcw-a")
    ];
    const edges = [
      breakerEdge("primary-feed", "utility-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      }),
      breakerEdge("emergency-feed", "gen-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
      }),
      breakerEdge("load-feed", "ats-a", "fcw-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT
      })
    ];
    const { powerStateByNodeId, faultedEdgeIds } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["gen-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ats-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["fcw-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("flags phase conflict when utility and generator are cross-tied", () => {
    const nodes = [
      utilityNode("utility-a"),
      generatorNode("gen-a"),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", "closed"),
      breakerEdge("e2", "gen-a", "mvsg-b", "closed"),
      breakerEdge("tie", "mvsg-a", "mvsg-b", "closed")
    ];
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["gen-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
  });

  it("allows a utility and generator with the same sync group to parallel safely", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "GRID-A" }),
      generatorNode("gen-a", { syncGroup: " grid-a " }),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "gen-a", "mvsg-b", BREAKER_STATE.CLOSED),
      breakerEdge("tie", "mvsg-a", "mvsg-b", BREAKER_STATE.CLOSED)
    ];
    const {
      powerStateByNodeId,
      edgePowerStateByEdgeId,
      faultedEdgeIds
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["gen-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(edgePowerStateByEdgeId["tie"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(faultedEdgeIds).toEqual([]);
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

  it("changes when generator source online flag changes", () => {
    const nodesOnline = [generatorNode("gen-a", { isSourceOnline: true }), mvsgNode("mvsg-a")];
    const nodesOffline = [generatorNode("gen-a", { isSourceOnline: false }), mvsgNode("mvsg-a")];
    const edges = [breakerEdge("e1", "gen-a", "mvsg-a", "closed")];
    const keyOnline = createTopologyKey(nodesOnline, edges);
    const keyOffline = createTopologyKey(nodesOffline, edges);

    expect(keyOnline).not.toBe(keyOffline);
  });

  it("changes when a root sync group changes", () => {
    const nodesGridA = [utilityNode("utility-a", { syncGroup: "GRID-A" }), mvsgNode("mvsg-a")];
    const nodesGridB = [utilityNode("utility-a", { syncGroup: "GRID-B" }), mvsgNode("mvsg-a")];
    const edges = [breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED)];
    const keyGridA = createTopologyKey(nodesGridA, edges);
    const keyGridB = createTopologyKey(nodesGridB, edges);

    expect(keyGridA).not.toBe(keyGridB);
  });

  it("ignores label-only node changes so renames do not invalidate the key", () => {
    const nodesLabelA = [utilityNode("utility-a", { syncGroup: "GRID-A" }), mvsgNode("mvsg-a")];
    const renamedUtilityNode = utilityNode("utility-a", { syncGroup: "GRID-A" });
    const renamedMvsgNode = mvsgNode("mvsg-a");
    const nodesLabelB = [
      {
        ...renamedUtilityNode,
        data: {
          ...renamedUtilityNode.data,
          label: "UTIL-RENAMED"
        }
      },
      {
        ...renamedMvsgNode,
        data: {
          ...renamedMvsgNode.data,
          label: "MVSG-01"
        }
      }
    ];
    const edges = [breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED)];
    const keyLabelA = createTopologyKey(nodesLabelA, edges);
    const keyLabelB = createTopologyKey(nodesLabelB, edges);

    expect(keyLabelA).toBe(keyLabelB);
  });

  it("changes when a transfer switch active source changes", () => {
    const nodesPrimary = [
      utilityNode("utility-a"),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
      })
    ];
    const nodesEmergency = [
      utilityNode("utility-a"),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
      })
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      })
    ];
    const keyPrimary = createTopologyKey(nodesPrimary, edges);
    const keyEmergency = createTopologyKey(nodesEmergency, edges);

    expect(keyPrimary).not.toBe(keyEmergency);
  });

  it("changes when an edge handle changes", () => {
    const nodes = [
      utilityNode("utility-a"),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
      })
    ];
    const edgesPrimary = [
      breakerEdge("e1", "utility-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      })
    ];
    const edgesEmergency = [
      breakerEdge("e1", "utility-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
      })
    ];
    const keyPrimary = createTopologyKey(nodes, edgesPrimary);
    const keyEmergency = createTopologyKey(nodes, edgesEmergency);

    expect(keyPrimary).not.toBe(keyEmergency);
  });
});
