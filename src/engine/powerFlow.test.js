import { describe, expect, it } from "vitest";
import {
  EDGE_POWER_STATE,
  NODE_POWER_STATE,
  createTopologyKey,
  evaluatePowerFlow,
  evaluateTransferSwitchSense
} from "./powerFlow";
import { evaluateProtectionState } from "./protection";
import { BREAKER_STATE } from "./protectionModel";
import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_HANDLE_ID
} from "../topology/transferSwitch";
import { TRANSFORMER_HANDLE_ID } from "../topology/transformer";
import {
  UPS_HANDLE_ID,
  UPS_OPERATING_MODE
} from "../topology/ups";
import { EDGE_TYPE as CANVAS_EDGE_TYPE } from "../topology/edgeTypes";
import {
  DEFAULT_LOW_VOLTAGE,
  DEFAULT_MEDIUM_VOLTAGE
} from "../electrical/voltage";
import { normalizeGraphState } from "../nodes/nodeData";
import exampleTopology from "../../ExampleTopology/EXAMPLE-TOPOLOGY.json";

function utilityNode(id, options = {}) {
  return {
    id,
    type: "utility",
    data: {
      label: id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_MEDIUM_VOLTAGE,
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
      nominalVoltage: options.nominalVoltage ?? DEFAULT_MEDIUM_VOLTAGE,
      syncGroup: options.syncGroup ?? "",
      isSourceOnline:
        options.isSourceOnline === undefined ? true : options.isSourceOnline
    },
    position: { x: 0, y: 0 }
  };
}

function mvsgNode(id, options = {}) {
  return {
    id,
    type: "mvsg",
    data: {
      label: id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_MEDIUM_VOLTAGE
    },
    position: { x: 0, y: 0 }
  };
}

function ptxNode(id, options = {}) {
  return {
    id,
    type: "ptx",
    data: {
      label: id,
      primaryVoltage: options.primaryVoltage ?? DEFAULT_MEDIUM_VOLTAGE,
      secondaryVoltage: options.secondaryVoltage ?? DEFAULT_LOW_VOLTAGE
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
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE
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
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE
    },
    position: { x: 0, y: 0 }
  };
}

function transferSwitchNode(id, options = {}) {
  return {
    id,
    type: "transferSwitch",
    data: {
      label: id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE,
      activeSource:
        options.activeSource ?? TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
    },
    position: { x: 0, y: 0 }
  };
}

function upsNode(id, options = {}) {
  return {
    id,
    type: "ups",
    data: {
      label: id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE,
      batteryAvailable:
        options.batteryAvailable === undefined ? true : options.batteryAvailable,
      operatingMode: options.operatingMode ?? UPS_OPERATING_MODE.NORMAL,
      syncGroup: options.syncGroup ?? ""
    },
    position: { x: 0, y: 0 }
  };
}

function mechanicalNode(id, options = {}) {
  return {
    id,
    type: "mechanical",
    data: {
      label: id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE
    },
    position: { x: 0, y: 0 }
  };
}

function breakerEdge(id, source, target, breakerState, handleOptions = {}) {
  return {
    id,
    type: CANVAS_EDGE_TYPE.BREAKER,
    source,
    target,
    ...handleOptions,
    data: { breakerState }
  };
}

function standardEdge(id, source, target, handleOptions = {}) {
  return {
    id,
    type: CANVAS_EDGE_TYPE.STANDARD,
    source,
    target,
    ...handleOptions,
    data: {}
  };
}

function evaluateSystemState(nodes, edges) {
  const powerFlowResult = evaluatePowerFlow(nodes, edges);

  return {
    ...powerFlowResult,
    ...evaluateProtectionState(nodes, edges, powerFlowResult)
  };
}

function getNodeByLabel(nodes, label) {
  const matchingNode = nodes.find((node) => node.data?.label === label);

  if (!matchingNode) {
    throw new Error(`Missing node with label "${label}"`);
  }

  return matchingNode;
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

  it("conducts a standard wire and energizes downstream gear", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a")];
    const edges = [standardEdge("wire-1", "utility-a", "mvsg-a")];
    const { powerStateByNodeId, edgePowerStateByEdgeId, sourceIdsByNodeId } =
      evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["mvsg-a"]).toEqual(["utility-a"]);
    expect(edgePowerStateByEdgeId["wire-1"]).toBe(EDGE_POWER_STATE.ENERGIZED);
  });

  it("uses the nearest upstream breaker boundary as the display source through downstream wires", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a"), switchboardNode("swbd-a")];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      standardEdge("wire-1", "mvsg-a", "swbd-a")
    ];
    const { displaySourceNodeIdsByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(displaySourceNodeIdsByNodeId["mvsg-a"]).toEqual(["utility-a"]);
    expect(displaySourceNodeIdsByNodeId["swbd-a"]).toEqual(["utility-a"]);
  });

  it("resets the display source boundary when a downstream breaker is crossed", () => {
    const nodes = [
      utilityNode("utility-a"),
      mvsgNode("mvsg-a"),
      ptxNode("ptx-a"),
      switchboardNode("swbd-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      standardEdge("wire-1", "mvsg-a", "ptx-a", {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e2", "ptx-a", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY
      })
    ];
    const { displaySourceNodeIdsByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(displaySourceNodeIdsByNodeId["swbd-a"]).toEqual(["ptx-a"]);
  });

  it("leaves display sources empty when a live path never crosses a breaker", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a")];
    const edges = [standardEdge("wire-1", "utility-a", "mvsg-a")];
    const { displaySourceNodeIdsByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(displaySourceNodeIdsByNodeId["utility-a"]).toEqual([]);
    expect(displaySourceNodeIdsByNodeId["mvsg-a"]).toEqual([]);
  });

  it("uses the PTX node as the display source for downstream secondary gear after a breaker", () => {
    const nodes = [
      utilityNode("utility-a"),
      ptxNode("ptx-a"),
      switchboardNode("swbd-a"),
      loadNode("load-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e2", "ptx-a", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY
      }),
      standardEdge("wire-1", "swbd-a", "load-a")
    ];
    const { displaySourceNodeIdsByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(displaySourceNodeIdsByNodeId["swbd-a"]).toEqual(["ptx-a"]);
    expect(displaySourceNodeIdsByNodeId["load-a"]).toEqual(["ptx-a"]);
  });

  it("tracks multiple breaker-fed display sources when synchronized feeds parallel downstream", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "GRID-A" }),
      utilityNode("utility-b", { syncGroup: "GRID-A" }),
      ptxNode("ptx-a"),
      ptxNode("ptx-b"),
      switchboardNode("swbd-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e2", "utility-b", "ptx-b", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e3", "ptx-a", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY,
        targetHandle: "switchboard-bus-in"
      }),
      breakerEdge("e4", "ptx-b", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY,
        targetHandle: "switchboard-bus-bottom-in"
      })
    ];
    const { displaySourceNodeIdsByNodeId, powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(displaySourceNodeIdsByNodeId["swbd-a"]).toEqual(["ptx-a", "ptx-b"]);
  });

  it("uses the nearest upstream breaker boundary as the Fed From value through downstream wires", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a"), switchboardNode("swbd-a")];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      standardEdge("wire-1", "mvsg-a", "swbd-a")
    ];
    const { fedFromNodeIdByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(fedFromNodeIdByNodeId["mvsg-a"]).toBe("utility-a");
    expect(fedFromNodeIdByNodeId["swbd-a"]).toBe("utility-a");
  });

  it("uses the nearest upstream node as Fed From across a wire-only chain", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a"), switchboardNode("swbd-a")];
    const edges = [
      standardEdge("wire-1", "utility-a", "mvsg-a"),
      standardEdge("wire-2", "mvsg-a", "swbd-a")
    ];
    const { fedFromNodeIdByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(fedFromNodeIdByNodeId["mvsg-a"]).toBe("utility-a");
    expect(fedFromNodeIdByNodeId["swbd-a"]).toBe("mvsg-a");
  });

  it("preserves the active Fed From candidate through PTX, ATS, and UPS pass-through", () => {
    const nodes = [
      utilityNode("utility-a", { nominalVoltage: DEFAULT_MEDIUM_VOLTAGE }),
      ptxNode("ptx-a"),
      transferSwitchNode("ats-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      upsNode("ups-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      switchboardNode("swbd-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE })
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      standardEdge("e2", "ptx-a", "ats-a", {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY,
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      }),
      standardEdge("e3", "ats-a", "ups-a", {
        sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT,
        targetHandle: UPS_HANDLE_ID.INPUT
      }),
      standardEdge("e4", "ups-a", "swbd-a", {
        sourceHandle: UPS_HANDLE_ID.OUTPUT
      })
    ];
    const { fedFromNodeIdByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(fedFromNodeIdByNodeId["ats-a"]).toBe("utility-a");
    expect(fedFromNodeIdByNodeId["ups-a"]).toBe("utility-a");
    expect(fedFromNodeIdByNodeId["swbd-a"]).toBe("utility-a");
  });

  it("collapses multiple live feeders to the nearest Fed From candidate", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "GRID-A" }),
      utilityNode("utility-b", { syncGroup: "GRID-A" }),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "utility-b", "mvsg-b", BREAKER_STATE.CLOSED),
      standardEdge("tie", "mvsg-b", "mvsg-a")
    ];
    const { fedFromNodeIdByNodeId, powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(fedFromNodeIdByNodeId["mvsg-a"]).toBe("utility-a");
  });

  it("resolves equal-distance Fed From ties by lexical node id", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "GRID-A" }),
      utilityNode("utility-b", { syncGroup: "GRID-A" }),
      mvsgNode("mvsg-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "utility-b", "mvsg-a", BREAKER_STATE.CLOSED)
    ];
    const { fedFromNodeIdByNodeId, powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(fedFromNodeIdByNodeId["mvsg-a"]).toBe("utility-a");
  });

  it("reports the correct Fed From value on a backfed root source", () => {
    const nodes = [
      utilityNode("utility-a", { isSourceOnline: false }),
      generatorNode("gen-a"),
      mvsgNode("mvsg-a")
    ];
    const edges = [
      breakerEdge("gen-feed", "gen-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("utility-feed", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED)
    ];
    const { fedFromNodeIdByNodeId, powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.BACKFEED);
    expect(fedFromNodeIdByNodeId["utility-a"]).toBe("mvsg-a");
  });

  it("prefers a switchboard main input over downstream return corridors", () => {
    const nodes = [
      utilityNode("utility-a"),
      ptxNode("ptx-a"),
      switchboardNode("swbd-a"),
      upsNode("ups-a"),
      mechanicalNode("mech-a")
    ];
    const edges = [
      breakerEdge("utility-feed", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("main-feed", "ptx-a", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY,
        targetHandle: "switchboard-bus-in"
      }),
      breakerEdge("ups-line", "swbd-a", "ups-a", BREAKER_STATE.CLOSED, {
        sourceHandle: "switchboard-bus-out",
        targetHandle: UPS_HANDLE_ID.INPUT
      }),
      breakerEdge("ups-return", "ups-a", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "switchboard-bus-bottom-in"
      }),
      breakerEdge("mechanical-feed", "swbd-a", "mech-a", BREAKER_STATE.CLOSED, {
        sourceHandle: "switchboard-bus-out",
        targetHandle: "mechanical-bus-in"
      })
    ];
    const { fedFromNodeIdByNodeId, powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ups-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mech-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(fedFromNodeIdByNodeId["swbd-a"]).toBe("ptx-a");
  });

  it("resolves the 301D and 301E switchboards to their PTX feeders in the example topology", () => {
    const graph = normalizeGraphState(exampleTopology);
    const { fedFromNodeIdByNodeId, powerStateByNodeId } = evaluatePowerFlow(
      graph.nodes,
      graph.edges
    );
    const labelById = new Map(graph.nodes.map((node) => [node.id, node.data.label]));

    for (const [switchboardLabel, expectedFedFromLabel] of [
      ["MSB-301D", "PTX-301D"],
      ["MSB-301E", "PTX-301E"]
    ]) {
      const switchboard = getNodeByLabel(graph.nodes, switchboardLabel);

      expect(powerStateByNodeId[switchboard.id]).toBe(NODE_POWER_STATE.LIVE);
      expect(labelById.get(fedFromNodeIdByNodeId[switchboard.id])).toBe(
        expectedFedFromLabel
      );
    }
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
    } = evaluateSystemState(nodes, edges);

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
    const { powerStateByNodeId, faultedEdgeIds } = evaluateSystemState(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(faultedEdgeIds).toEqual(["tie"]);
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
    const { powerStateByNodeId, faultedEdgeIds } = evaluateSystemState(nodes, edges);

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
      evaluateSystemState(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(edgePowerStateByEdgeId["trip-edge"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("emits faulted edge ids only for the nearest selective clearing device", () => {
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
    const { faultedEdgeIds, powerStateByNodeId } = evaluateSystemState(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(faultedEdgeIds).toEqual(["tie"]);
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
    const { powerStateByNodeId, faultedEdgeIds } = evaluateSystemState(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("emits no faulted edge ids on single-source energized paths", () => {
    const nodes = [
      utilityNode("utility-a"),
      mvsgNode("mvsg-a"),
      loadNode("load-a", { nominalVoltage: DEFAULT_MEDIUM_VOLTAGE })
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "mvsg-a", "load-a", BREAKER_STATE.CLOSED)
    ];
    const { faultedEdgeIds, powerStateByNodeId } = evaluateSystemState(nodes, edges);

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

  it("lets standard wires and breaker edges coexist without changing breaker semantics", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a"), loadNode("load-a")];
    const edges = [
      standardEdge("wire-1", "utility-a", "mvsg-a"),
      breakerEdge("breaker-1", "mvsg-a", "load-a", BREAKER_STATE.OPEN)
    ];
    const { powerStateByNodeId, edgePowerStateByEdgeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["load-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(edgePowerStateByEdgeId["wire-1"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(edgePowerStateByEdgeId["breaker-1"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
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

  it("flags a voltage fault when medium voltage feeds low-voltage gear directly", () => {
    const nodes = [generatorNode("gen-a"), switchboardNode("swbd-a")];
    const edges = [breakerEdge("e1", "gen-a", "swbd-a", BREAKER_STATE.CLOSED)];
    const {
      powerFlagsByNodeId,
      powerStateByNodeId,
      propagatingVoltagesByNodeId,
      faultedEdgeIds
    } = evaluateSystemState(nodes, edges);

    expect(powerStateByNodeId["gen-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.VOLTAGE_FAULT);
    expect(powerFlagsByNodeId["swbd-a"]).toMatchObject({
      isLive: true,
      hasPhaseConflict: false,
      hasVoltageFault: true
    });
    expect(propagatingVoltagesByNodeId["swbd-a"]).toEqual([
      DEFAULT_MEDIUM_VOLTAGE
    ]);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("steps transformer voltage down before energizing low-voltage gear", () => {
    const nodes = [
      utilityNode("utility-a"),
      mvsgNode("mvsg-a"),
      ptxNode("ptx-a"),
      switchboardNode("swbd-a"),
      loadNode("load-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "mvsg-a", "ptx-a", BREAKER_STATE.CLOSED),
      breakerEdge("e3", "ptx-a", "swbd-a", BREAKER_STATE.CLOSED),
      breakerEdge("e4", "swbd-a", "load-a", BREAKER_STATE.CLOSED)
    ];
    const {
      powerFlagsByNodeId,
      powerStateByNodeId,
      propagatingVoltagesByNodeId
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["load-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerFlagsByNodeId["swbd-a"].hasVoltageFault).toBe(false);
    expect(propagatingVoltagesByNodeId["ptx-a"]).toEqual([
      DEFAULT_LOW_VOLTAGE,
      DEFAULT_MEDIUM_VOLTAGE
    ]);
    expect(propagatingVoltagesByNodeId["swbd-a"]).toEqual([DEFAULT_LOW_VOLTAGE]);
    expect(propagatingVoltagesByNodeId["load-a"]).toEqual([DEFAULT_LOW_VOLTAGE]);
  });

  it("carries medium voltage across chained PTX primary buses", () => {
    const nodes = [utilityNode("utility-a"), ptxNode("ptx-a"), ptxNode("ptx-b")];
    const edges = [
      breakerEdge("e1", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e2", "ptx-a", "ptx-b", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP,
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      })
    ];
    const {
      edgePowerStateByEdgeId,
      powerFlagsByNodeId,
      powerStateByNodeId,
      propagatingVoltagesByNodeId
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerFlagsByNodeId["ptx-b"].hasVoltageFault).toBe(false);
    expect(propagatingVoltagesByNodeId["ptx-a"]).toEqual([DEFAULT_MEDIUM_VOLTAGE]);
    expect(propagatingVoltagesByNodeId["ptx-b"]).toEqual([DEFAULT_MEDIUM_VOLTAGE]);
    expect(edgePowerStateByEdgeId["e2"]).toBe(EDGE_POWER_STATE.ENERGIZED);
  });

  it("accepts a source feeder on the PTX B-side primary target", () => {
    const nodes = [utilityNode("utility-a"), ptxNode("ptx-a"), switchboardNode("swbd-a")];
    const edges = [
      breakerEdge("e1", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET
      }),
      breakerEdge("e2", "ptx-a", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY
      })
    ];
    const {
      powerFlagsByNodeId,
      powerStateByNodeId,
      propagatingVoltagesByNodeId
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerFlagsByNodeId["ptx-a"].hasVoltageFault).toBe(false);
    expect(powerFlagsByNodeId["swbd-a"].hasVoltageFault).toBe(false);
    expect(propagatingVoltagesByNodeId["ptx-a"]).toEqual([
      DEFAULT_LOW_VOLTAGE,
      DEFAULT_MEDIUM_VOLTAGE
    ]);
    expect(propagatingVoltagesByNodeId["swbd-a"]).toEqual([DEFAULT_LOW_VOLTAGE]);
  });

  it("chains PTXs when the downstream landing point uses the new right-side primary target", () => {
    const nodes = [
      utilityNode("utility-a"),
      ptxNode("ptx-a"),
      ptxNode("ptx-b"),
      switchboardNode("swbd-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e2", "ptx-a", "ptx-b", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN_SOURCE,
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET
      }),
      breakerEdge("e3", "ptx-b", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY
      })
    ];
    const {
      powerFlagsByNodeId,
      powerStateByNodeId,
      propagatingVoltagesByNodeId
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerFlagsByNodeId["ptx-b"].hasVoltageFault).toBe(false);
    expect(powerFlagsByNodeId["swbd-a"].hasVoltageFault).toBe(false);
    expect(propagatingVoltagesByNodeId["ptx-b"]).toEqual([
      DEFAULT_LOW_VOLTAGE,
      DEFAULT_MEDIUM_VOLTAGE
    ]);
    expect(propagatingVoltagesByNodeId["swbd-a"]).toEqual([DEFAULT_LOW_VOLTAGE]);
  });

  it("keeps mixed legacy and new PTX handle corridors backward compatible", () => {
    const nodes = [
      utilityNode("utility-a"),
      ptxNode("ptx-a"),
      ptxNode("ptx-b"),
      switchboardNode("swbd-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e2", "ptx-a", "ptx-b", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP,
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET
      }),
      breakerEdge("e3", "ptx-b", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY
      })
    ];
    const { edgePowerStateByEdgeId, powerStateByNodeId } = evaluatePowerFlow(
      nodes,
      edges
    );

    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(edgePowerStateByEdgeId["e2"]).toBe(EDGE_POWER_STATE.ENERGIZED);
  });

  it("steps a chained PTX corridor down on the downstream transformer secondary", () => {
    const nodes = [
      utilityNode("utility-a"),
      ptxNode("ptx-a"),
      ptxNode("ptx-b"),
      switchboardNode("swbd-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e2", "ptx-a", "ptx-b", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP,
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e3", "ptx-b", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY
      })
    ];
    const {
      powerFlagsByNodeId,
      powerStateByNodeId,
      propagatingVoltagesByNodeId
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerFlagsByNodeId["swbd-a"].hasVoltageFault).toBe(false);
    expect(propagatingVoltagesByNodeId["ptx-b"]).toEqual([
      DEFAULT_LOW_VOLTAGE,
      DEFAULT_MEDIUM_VOLTAGE
    ]);
    expect(propagatingVoltagesByNodeId["swbd-a"]).toEqual([DEFAULT_LOW_VOLTAGE]);
  });

  it("firewalls PTX output when the primary side sees the wrong voltage", () => {
    const nodes = [
      utilityNode("utility-a", { nominalVoltage: 12470 }),
      ptxNode("ptx-a"),
      loadNode("load-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "ptx-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "ptx-a", "load-a", BREAKER_STATE.CLOSED)
    ];
    const { edgePowerStateByEdgeId, powerStateByNodeId } = evaluatePowerFlow(
      nodes,
      edges
    );

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.VOLTAGE_FAULT);
    expect(powerStateByNodeId["load-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(edgePowerStateByEdgeId["e1"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(edgePowerStateByEdgeId["e2"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
  });

  it("blocks PTX primary-loop continuation when the chained primary voltage is wrong", () => {
    const nodes = [
      utilityNode("utility-a", { nominalVoltage: 12470 }),
      ptxNode("ptx-a"),
      ptxNode("ptx-b"),
      switchboardNode("swbd-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e2", "ptx-a", "ptx-b", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP,
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e3", "ptx-b", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY
      })
    ];
    const { edgePowerStateByEdgeId, powerStateByNodeId } = evaluatePowerFlow(
      nodes,
      edges
    );

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.VOLTAGE_FAULT);
    expect(powerStateByNodeId["ptx-b"]).toBe(NODE_POWER_STATE.DEAD);
    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(edgePowerStateByEdgeId["e1"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(edgePowerStateByEdgeId["e2"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
    expect(edgePowerStateByEdgeId["e3"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
  });

  it("supports reverse PTX backfeed when the secondary voltage matches", () => {
    const nodes = [
      generatorNode("gen-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      switchboardNode("swbd-a"),
      ptxNode("ptx-a"),
      mvsgNode("mvsg-a")
    ];
    const edges = [
      breakerEdge("e1", "gen-a", "swbd-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "ptx-a", "swbd-a", BREAKER_STATE.CLOSED),
      breakerEdge("e3", "mvsg-a", "ptx-a", BREAKER_STATE.CLOSED)
    ];
    const {
      powerFlagsByNodeId,
      powerStateByNodeId,
      propagatingVoltagesByNodeId
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerFlagsByNodeId["ptx-a"].hasVoltageFault).toBe(false);
    expect(propagatingVoltagesByNodeId["swbd-a"]).toEqual([DEFAULT_LOW_VOLTAGE]);
    expect(propagatingVoltagesByNodeId["mvsg-a"]).toEqual([
      DEFAULT_MEDIUM_VOLTAGE
    ]);
  });

  it("propagates reverse PTX backfeed across the primary daisy-chain", () => {
    const nodes = [
      generatorNode("gen-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      switchboardNode("swbd-a"),
      ptxNode("ptx-b"),
      ptxNode("ptx-a"),
      mvsgNode("mvsg-a")
    ];
    const edges = [
      breakerEdge("e1", "gen-a", "swbd-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "ptx-b", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY
      }),
      breakerEdge("e3", "mvsg-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("e4", "ptx-a", "ptx-b", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP,
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      })
    ];
    const {
      powerFlagsByNodeId,
      powerStateByNodeId,
      propagatingVoltagesByNodeId
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerFlagsByNodeId["ptx-a"].hasVoltageFault).toBe(false);
    expect(powerFlagsByNodeId["ptx-b"].hasVoltageFault).toBe(false);
    expect(propagatingVoltagesByNodeId["swbd-a"]).toEqual([DEFAULT_LOW_VOLTAGE]);
    expect(propagatingVoltagesByNodeId["mvsg-a"]).toEqual([
      DEFAULT_MEDIUM_VOLTAGE
    ]);
  });

  it("propagates reverse PTX backfeed across the new dual-terminal primary bus", () => {
    const nodes = [
      generatorNode("gen-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      switchboardNode("swbd-a"),
      ptxNode("ptx-b"),
      ptxNode("ptx-a"),
      mvsgNode("mvsg-a")
    ];
    const edges = [
      breakerEdge("e1", "gen-a", "swbd-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "ptx-b", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY
      }),
      breakerEdge("e3", "ptx-b", "ptx-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN_SOURCE,
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET
      }),
      breakerEdge("e4", "ptx-a", "mvsg-a", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP
      })
    ];
    const {
      powerFlagsByNodeId,
      powerStateByNodeId,
      propagatingVoltagesByNodeId
    } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerFlagsByNodeId["ptx-a"].hasVoltageFault).toBe(false);
    expect(powerFlagsByNodeId["ptx-b"].hasVoltageFault).toBe(false);
    expect(propagatingVoltagesByNodeId["mvsg-a"]).toEqual([
      DEFAULT_MEDIUM_VOLTAGE
    ]);
  });

  it("keeps opposite-end PTX feeders isolated when the middle breaker is open", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "GRID-A" }),
      ptxNode("ptx-a"),
      ptxNode("ptx-b"),
      generatorNode("gen-a", { syncGroup: "GRID-B" })
    ];
    const edges = [
      breakerEdge("left-feed", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("middle-open", "ptx-a", "ptx-b", BREAKER_STATE.OPEN, {
        sourceHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP,
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET
      }),
      breakerEdge("right-feed", "gen-a", "ptx-b", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET
      })
    ];
    const {
      edgePowerStateByEdgeId,
      faultedEdgeIds,
      powerFlagsByNodeId,
      powerStateByNodeId
    } = evaluateSystemState(nodes, edges);

    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ptx-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerFlagsByNodeId["ptx-a"].hasPhaseConflict).toBe(false);
    expect(powerFlagsByNodeId["ptx-b"].hasPhaseConflict).toBe(false);
    expect(edgePowerStateByEdgeId["left-feed"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(edgePowerStateByEdgeId["middle-open"]).toBe(
      EDGE_POWER_STATE.DE_ENERGIZED
    );
    expect(edgePowerStateByEdgeId["right-feed"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("preserves phase conflict behavior when opposite-end PTX feeders are tied through a closed middle breaker", () => {
    const nodes = [
      utilityNode("utility-a", { syncGroup: "GRID-A" }),
      ptxNode("ptx-a"),
      ptxNode("ptx-b"),
      generatorNode("gen-a", { syncGroup: "GRID-B" })
    ];
    const edges = [
      breakerEdge("left-feed", "utility-a", "ptx-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("middle-closed", "ptx-a", "ptx-b", BREAKER_STATE.CLOSED, {
        sourceHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP,
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET
      }),
      breakerEdge("right-feed", "gen-a", "ptx-b", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET
      })
    ];
    const {
      edgePowerStateByEdgeId,
      faultedEdgeIds,
      powerFlagsByNodeId,
      powerStateByNodeId
    } = evaluateSystemState(nodes, edges);

    expect(powerStateByNodeId["ptx-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["ptx-b"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerFlagsByNodeId["ptx-a"].hasPhaseConflict).toBe(true);
    expect(powerFlagsByNodeId["ptx-b"].hasPhaseConflict).toBe(true);
    expect(edgePowerStateByEdgeId["left-feed"]).toBe(
      EDGE_POWER_STATE.PHASE_CONFLICT
    );
    expect(edgePowerStateByEdgeId["middle-closed"]).toBe(
      EDGE_POWER_STATE.PHASE_CONFLICT
    );
    expect(edgePowerStateByEdgeId["right-feed"]).toBe(
      EDGE_POWER_STATE.PHASE_CONFLICT
    );
    expect(faultedEdgeIds).toEqual(["middle-closed"]);
  });

  it("treats generator as a root source and energizes downstream nodes", () => {
    const nodes = [
      generatorNode("gen-a"),
      mvsgNode("mvsg-a"),
      loadNode("load-a", { nominalVoltage: DEFAULT_MEDIUM_VOLTAGE })
    ];
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
      generatorNode("gen-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
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
      utilityNode("utility-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      generatorNode("gen-a", {
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        syncGroup: "GEN-BUS"
      }),
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
    } = evaluateSystemState(nodes, edges);

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
      utilityNode("utility-a", {
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        syncGroup: "GRID-A"
      }),
      generatorNode("gen-a", {
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        syncGroup: "GEN-BUS"
      }),
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
    } = evaluateSystemState(nodes, edges);

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
      utilityNode("utility-a", {
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        syncGroup: "GRID-A"
      }),
      generatorNode("gen-a", {
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        syncGroup: "GRID-B"
      }),
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
    const { powerStateByNodeId, faultedEdgeIds } = evaluateSystemState(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["gen-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["ats-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["fcw-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("still blocks the inactive ATS feeder when it is a standard wire", () => {
    const nodes = [
      utilityNode("utility-a", {
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        syncGroup: "GRID-A"
      }),
      generatorNode("gen-a", {
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        syncGroup: "GRID-B"
      }),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
      }),
      mechanicalNode("fcw-a")
    ];
    const edges = [
      standardEdge("primary-wire", "utility-a", "ats-a", {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      }),
      breakerEdge("emergency-breaker", "gen-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
      }),
      standardEdge("load-wire", "ats-a", "fcw-a", {
        sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT
      })
    ];
    const {
      powerStateByNodeId,
      edgePowerStateByEdgeId,
      sourceIdsByNodeId,
      faultedEdgeIds
    } = evaluateSystemState(nodes, edges);

    expect(powerStateByNodeId["ats-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["fcw-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["fcw-a"]).toEqual(["gen-a"]);
    expect(edgePowerStateByEdgeId["primary-wire"]).toBe(
      EDGE_POWER_STATE.DE_ENERGIZED
    );
    expect(edgePowerStateByEdgeId["emergency-breaker"]).toBe(
      EDGE_POWER_STATE.ENERGIZED
    );
    expect(faultedEdgeIds).toEqual([]);
  });

  it("energizes a downstream switchboard when UPS output lands on the top bus handle", () => {
    const nodes = [
      generatorNode("gen-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      switchboardNode("swbd-upstream"),
      upsNode("ups-a"),
      switchboardNode("swbd-downstream")
    ];
    const edges = [
      breakerEdge("gen-feed", "gen-a", "swbd-upstream", BREAKER_STATE.CLOSED),
      breakerEdge("ups-input", "swbd-upstream", "ups-a", BREAKER_STATE.CLOSED, {
        sourceHandle: "switchboard-bus-out",
        targetHandle: UPS_HANDLE_ID.INPUT
      }),
      breakerEdge("ups-output", "ups-a", "swbd-downstream", BREAKER_STATE.CLOSED, {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "switchboard-bus-in"
      })
    ];
    const { powerStateByNodeId, sourceIdsByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["ups-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["swbd-downstream"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["swbd-downstream"]).toEqual(["gen-a"]);
  });

  it("energizes a downstream switchboard when UPS output lands on the bottom bus handle", () => {
    const nodes = [
      generatorNode("gen-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      switchboardNode("swbd-upstream"),
      upsNode("ups-a"),
      switchboardNode("swbd-downstream")
    ];
    const edges = [
      breakerEdge("gen-feed", "gen-a", "swbd-upstream", BREAKER_STATE.CLOSED),
      breakerEdge("ups-input", "swbd-upstream", "ups-a", BREAKER_STATE.CLOSED, {
        sourceHandle: "switchboard-bus-out",
        targetHandle: UPS_HANDLE_ID.INPUT
      }),
      breakerEdge("ups-output", "ups-a", "swbd-downstream", BREAKER_STATE.CLOSED, {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "switchboard-bus-bottom-in"
      })
    ];
    const { powerStateByNodeId, sourceIdsByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["ups-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["swbd-downstream"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["swbd-downstream"]).toEqual(["gen-a"]);
  });

  it("lets a battery-mode UPS energize downstream gear with a dead upstream feeder", () => {
    const nodes = [
      generatorNode("gen-a", {
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        isSourceOnline: false
      }),
      switchboardNode("swbd-upstream"),
      upsNode("ups-a", {
        operatingMode: UPS_OPERATING_MODE.BATTERY,
        batteryAvailable: true
      }),
      switchboardNode("swbd-downstream")
    ];
    const edges = [
      breakerEdge("gen-feed", "gen-a", "swbd-upstream", BREAKER_STATE.CLOSED),
      breakerEdge("ups-input", "swbd-upstream", "ups-a", BREAKER_STATE.CLOSED, {
        sourceHandle: "switchboard-bus-out",
        targetHandle: UPS_HANDLE_ID.INPUT
      }),
      breakerEdge("ups-output", "ups-a", "swbd-downstream", BREAKER_STATE.CLOSED, {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "switchboard-bus-in"
      })
    ];
    const { powerStateByNodeId, sourceIdsByNodeId, edgePowerStateByEdgeId } =
      evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["gen-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(powerStateByNodeId["swbd-upstream"]).toBe(NODE_POWER_STATE.DEAD);
    expect(powerStateByNodeId["ups-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["swbd-downstream"]).toBe(NODE_POWER_STATE.LIVE);
    expect(sourceIdsByNodeId["swbd-downstream"]).toEqual(["ups-a"]);
    expect(edgePowerStateByEdgeId["ups-output"]).toBe(EDGE_POWER_STATE.ENERGIZED);
  });

  it("does not backfeed the UPS input side while the UPS is on battery", () => {
    const nodes = [
      generatorNode("gen-a", {
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        isSourceOnline: false
      }),
      switchboardNode("swbd-upstream"),
      upsNode("ups-a", {
        operatingMode: UPS_OPERATING_MODE.BATTERY,
        batteryAvailable: true
      }),
      switchboardNode("swbd-downstream")
    ];
    const edges = [
      breakerEdge("gen-feed", "gen-a", "swbd-upstream", BREAKER_STATE.CLOSED),
      breakerEdge("ups-input", "swbd-upstream", "ups-a", BREAKER_STATE.CLOSED, {
        sourceHandle: "switchboard-bus-out",
        targetHandle: UPS_HANDLE_ID.INPUT
      }),
      breakerEdge("ups-output", "ups-a", "swbd-downstream", BREAKER_STATE.CLOSED, {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "switchboard-bus-in"
      })
    ];
    const { powerStateByNodeId, edgePowerStateByEdgeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["swbd-upstream"]).toBe(NODE_POWER_STATE.DEAD);
    expect(edgePowerStateByEdgeId["ups-input"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
    expect(edgePowerStateByEdgeId["ups-output"]).toBe(EDGE_POWER_STATE.ENERGIZED);
  });

  it("passes upstream source ids through a UPS in normal mode and preserves phase conflict", () => {
    const nodes = [
      generatorNode("gen-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      generatorNode("gen-b", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      switchboardNode("swbd-upstream"),
      upsNode("ups-a", { operatingMode: UPS_OPERATING_MODE.NORMAL }),
      switchboardNode("swbd-downstream")
    ];
    const edges = [
      breakerEdge("left-feed", "gen-a", "swbd-upstream", BREAKER_STATE.CLOSED),
      breakerEdge("right-feed", "gen-b", "swbd-upstream", BREAKER_STATE.CLOSED),
      breakerEdge("ups-input", "swbd-upstream", "ups-a", BREAKER_STATE.CLOSED, {
        sourceHandle: "switchboard-bus-out",
        targetHandle: UPS_HANDLE_ID.INPUT
      }),
      breakerEdge("ups-output", "ups-a", "swbd-downstream", BREAKER_STATE.CLOSED, {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "switchboard-bus-in"
      })
    ];
    const {
      powerStateByNodeId,
      sourceIdsByNodeId,
      edgePowerStateByEdgeId
    } = evaluatePowerFlow(nodes, edges);

    expect(sourceIdsByNodeId["ups-a"]).toEqual(["gen-a", "gen-b"]);
    expect(sourceIdsByNodeId["swbd-downstream"]).toEqual(["gen-a", "gen-b"]);
    expect(powerStateByNodeId["ups-a"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(powerStateByNodeId["swbd-downstream"]).toBe(NODE_POWER_STATE.PHASE_CONFLICT);
    expect(edgePowerStateByEdgeId["ups-output"]).toBe(EDGE_POWER_STATE.PHASE_CONFLICT);
  });

  it("uses UPS ids as battery-mode source ids and allows synchronized UPS paralleling", () => {
    const nodes = [
      upsNode("ups-a", {
        operatingMode: UPS_OPERATING_MODE.BATTERY,
        syncGroup: "UPS-BUS"
      }),
      upsNode("ups-b", {
        operatingMode: UPS_OPERATING_MODE.BATTERY,
        syncGroup: " ups-bus "
      }),
      switchboardNode("swbd-a")
    ];
    const edges = [
      breakerEdge("ups-a-feed", "ups-a", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "switchboard-bus-in"
      }),
      breakerEdge("ups-b-feed", "ups-b", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "switchboard-bus-bottom-in"
      })
    ];
    const { powerStateByNodeId, sourceIdsByNodeId, faultedEdgeIds } = evaluateSystemState(
      nodes,
      edges
    );

    expect(sourceIdsByNodeId["ups-a"]).toEqual(["ups-a", "ups-b"]);
    expect(sourceIdsByNodeId["ups-b"]).toEqual(["ups-a", "ups-b"]);
    expect(sourceIdsByNodeId["swbd-a"]).toEqual(["ups-a", "ups-b"]);
    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(faultedEdgeIds).toEqual([]);
  });

  it("flags a voltage fault on wrong-voltage UPS input and blocks the output", () => {
    const nodes = [
      generatorNode("gen-a"),
      upsNode("ups-a"),
      switchboardNode("swbd-a")
    ];
    const edges = [
      breakerEdge("ups-input", "gen-a", "ups-a", BREAKER_STATE.CLOSED, {
        targetHandle: UPS_HANDLE_ID.INPUT
      }),
      breakerEdge("ups-output", "ups-a", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "switchboard-bus-in"
      })
    ];
    const { powerStateByNodeId, edgePowerStateByEdgeId, sourceIdsByNodeId } =
      evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["ups-a"]).toBe(NODE_POWER_STATE.VOLTAGE_FAULT);
    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.DEAD);
    expect(sourceIdsByNodeId["swbd-a"]).toEqual([]);
    expect(edgePowerStateByEdgeId["ups-input"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(edgePowerStateByEdgeId["ups-output"]).toBe(EDGE_POWER_STATE.DE_ENERGIZED);
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

  it("tracks simultaneous phase conflict and voltage fault while rendering voltage fault dominant", () => {
    const nodes = [
      utilityNode("utility-a"),
      utilityNode("utility-b"),
      switchboardNode("swbd-a")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "swbd-a", BREAKER_STATE.CLOSED),
      breakerEdge("e2", "utility-b", "swbd-a", BREAKER_STATE.CLOSED)
    ];
    const { faultedEdgeIds, powerFlagsByNodeId, powerStateByNodeId } =
      evaluateSystemState(nodes, edges);

    expect(powerStateByNodeId["swbd-a"]).toBe(NODE_POWER_STATE.VOLTAGE_FAULT);
    expect(powerFlagsByNodeId["swbd-a"]).toMatchObject({
      isLive: true,
      hasPhaseConflict: true,
      hasVoltageFault: true
    });
    expect(faultedEdgeIds).toEqual(["e1"]);
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
    } = evaluateSystemState(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["gen-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-a"]).toBe(NODE_POWER_STATE.LIVE);
    expect(powerStateByNodeId["mvsg-b"]).toBe(NODE_POWER_STATE.LIVE);
    expect(edgePowerStateByEdgeId["tie"]).toBe(EDGE_POWER_STATE.ENERGIZED);
    expect(faultedEdgeIds).toEqual([]);
  });
});

describe("evaluateTransferSwitchSense", () => {
  it("senses a live primary feeder even while the ATS is thrown to emergency", () => {
    const nodes = [
      utilityNode("utility-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      generatorNode("gen-a", {
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        isSourceOnline: false
      }),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
      }),
      loadNode("load-a")
    ];
    const edges = [
      breakerEdge("primary-feed", "utility-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      }),
      breakerEdge("emergency-feed", "gen-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
      }),
      standardEdge("ats-output", "ats-a", "load-a", {
        sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT
      })
    ];
    const transferSwitchSenseByNodeId = evaluateTransferSwitchSense(nodes, edges);
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(transferSwitchSenseByNodeId["ats-a"]).toMatchObject({
      primary: { powerState: NODE_POWER_STATE.LIVE, sourceIds: ["utility-a"] },
      emergency: { powerState: NODE_POWER_STATE.DEAD, sourceIds: [] }
    });
    expect(powerStateByNodeId["load-a"]).toBe(NODE_POWER_STATE.DEAD);
  });

  it("senses a live emergency feeder while the primary source is dead", () => {
    const nodes = [
      utilityNode("utility-a", {
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        isSourceOnline: false
      }),
      generatorNode("gen-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
      })
    ];
    const edges = [
      breakerEdge("primary-feed", "utility-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      }),
      breakerEdge("emergency-feed", "gen-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
      })
    ];
    const transferSwitchSenseByNodeId = evaluateTransferSwitchSense(nodes, edges);

    expect(transferSwitchSenseByNodeId["ats-a"]).toMatchObject({
      primary: { powerState: NODE_POWER_STATE.DEAD, sourceIds: [] },
      emergency: { powerState: NODE_POWER_STATE.LIVE, sourceIds: ["gen-a"] }
    });
  });

  it("flags a voltage fault when an ATS input receives the wrong nominal voltage", () => {
    const nodes = [
      utilityNode("utility-a"),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
      }),
      loadNode("load-a")
    ];
    const edges = [
      breakerEdge("primary-feed", "utility-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      }),
      standardEdge("ats-output", "ats-a", "load-a", {
        sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT
      })
    ];
    const transferSwitchSenseByNodeId = evaluateTransferSwitchSense(nodes, edges);
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(transferSwitchSenseByNodeId["ats-a"].primary.powerState).toBe(
      NODE_POWER_STATE.VOLTAGE_FAULT
    );
    expect(powerStateByNodeId["load-a"]).toBe(NODE_POWER_STATE.DEAD);
  });

  it("flags phase conflict when unsynchronized sources land on the same ATS handle corridor", () => {
    const nodes = [
      utilityNode("utility-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      generatorNode("gen-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      switchboardNode("swbd-a"),
      transferSwitchNode("ats-a")
    ];
    const edges = [
      breakerEdge("utility-feed", "utility-a", "swbd-a", BREAKER_STATE.CLOSED),
      breakerEdge("generator-feed", "gen-a", "swbd-a", BREAKER_STATE.CLOSED, {
        targetHandle: "switchboard-bus-bottom-in"
      }),
      breakerEdge("ats-primary", "swbd-a", "ats-a", BREAKER_STATE.CLOSED, {
        sourceHandle: "switchboard-bus-out",
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      })
    ];
    const transferSwitchSenseByNodeId = evaluateTransferSwitchSense(nodes, edges);

    expect(transferSwitchSenseByNodeId["ats-a"].primary.powerState).toBe(
      NODE_POWER_STATE.PHASE_CONFLICT
    );
    expect(transferSwitchSenseByNodeId["ats-a"].emergency.powerState).toBe(
      NODE_POWER_STATE.DEAD
    );
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

  it("ignores layout-only edge routing changes so midpoint drags do not invalidate the key", () => {
    const nodesAtLayoutA = [utilityNode("utility-a"), mvsgNode("mvsg-a")];
    const nodesAtLayoutB = [
      { ...utilityNode("utility-a"), position: { x: 240, y: 96 } },
      { ...mvsgNode("mvsg-a"), position: { x: 624, y: 336 } }
    ];
    const edgesAtRouteA = [breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED)];
    const edgesAtRouteB = [
      {
        ...breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED),
        pathOptions: {
          centerX: 456,
          centerY: 216
        }
      }
    ];
    const keyA = createTopologyKey(nodesAtLayoutA, edgesAtRouteA);
    const keyB = createTopologyKey(nodesAtLayoutB, edgesAtRouteB);

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

  it("changes when a node voltage changes", () => {
    const nodesMediumVoltage = [utilityNode("utility-a"), mvsgNode("mvsg-a")];
    const nodesLowVoltage = [
      utilityNode("utility-a"),
      mvsgNode("mvsg-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE })
    ];
    const edges = [breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED)];
    const mediumVoltageKey = createTopologyKey(nodesMediumVoltage, edges);
    const lowVoltageKey = createTopologyKey(nodesLowVoltage, edges);

    expect(mediumVoltageKey).not.toBe(lowVoltageKey);
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

  it("ignores ATS automation settings that do not change conductive topology", () => {
    const nodesManual = [
      utilityNode("utility-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
        controlMode: "manual",
        retransferPolicy: "manual-return",
        transferDelaySeconds: 0,
        retransferDelaySeconds: 0
      })
    ];
    const nodesAuto = [
      utilityNode("utility-a", { nominalVoltage: DEFAULT_LOW_VOLTAGE }),
      transferSwitchNode("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
        controlMode: "auto",
        retransferPolicy: "auto-return",
        transferDelaySeconds: 7,
        retransferDelaySeconds: 11
      })
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "ats-a", BREAKER_STATE.CLOSED, {
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      })
    ];
    const keyManual = createTopologyKey(nodesManual, edges);
    const keyAuto = createTopologyKey(nodesAuto, edges);

    expect(keyManual).toBe(keyAuto);
  });

  it("changes when a UPS operating mode changes", () => {
    const nodesNormal = [upsNode("ups-a", { operatingMode: UPS_OPERATING_MODE.NORMAL })];
    const nodesBattery = [upsNode("ups-a", { operatingMode: UPS_OPERATING_MODE.BATTERY })];
    const keyNormal = createTopologyKey(nodesNormal, []);
    const keyBattery = createTopologyKey(nodesBattery, []);

    expect(keyNormal).not.toBe(keyBattery);
  });

  it("changes when UPS battery availability changes", () => {
    const nodesBatteryReady = [upsNode("ups-a", { batteryAvailable: true })];
    const nodesBatteryDown = [upsNode("ups-a", { batteryAvailable: false })];
    const keyBatteryReady = createTopologyKey(nodesBatteryReady, []);
    const keyBatteryDown = createTopologyKey(nodesBatteryDown, []);

    expect(keyBatteryReady).not.toBe(keyBatteryDown);
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

  it("changes when UPS output lands on a different switchboard bus handle", () => {
    const nodes = [upsNode("ups-a"), switchboardNode("swbd-a")];
    const topLandingEdges = [
      breakerEdge("e1", "ups-a", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "switchboard-bus-in"
      })
    ];
    const bottomLandingEdges = [
      breakerEdge("e1", "ups-a", "swbd-a", BREAKER_STATE.CLOSED, {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "switchboard-bus-bottom-in"
      })
    ];
    const topLandingKey = createTopologyKey(nodes, topLandingEdges);
    const bottomLandingKey = createTopologyKey(nodes, bottomLandingEdges);

    expect(topLandingKey).not.toBe(bottomLandingKey);
  });

  it("changes when an edge type changes from breaker to standard", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a")];
    const breakerEdges = [
      breakerEdge("e1", "utility-a", "mvsg-a", BREAKER_STATE.CLOSED)
    ];
    const standardEdges = [standardEdge("e1", "utility-a", "mvsg-a")];
    const breakerKey = createTopologyKey(nodes, breakerEdges);
    const standardKey = createTopologyKey(nodes, standardEdges);

    expect(breakerKey).not.toBe(standardKey);
  });
});

describe("normalizeGraphState voltage metadata", () => {
  it("preserves numeric voltage metadata and parses legacy display strings", () => {
    const normalizedGraph = normalizeGraphState({
      nodes: [
        {
          id: "utility-a",
          type: "utility",
          data: {
            label: "utility-a",
            voltage: "34.5 kV",
            syncGroup: "GRID-A"
          },
          position: { x: 0, y: 0 }
        },
        {
          id: "ptx-a",
          type: "ptx",
          data: {
            label: "ptx-a",
            ratio: "12.47 kV / 480 V"
          },
          position: { x: 0, y: 0 }
        },
        {
          id: "load-a",
          type: "load",
          data: {
            label: "load-a",
            nominalVoltage: 120
          },
          position: { x: 0, y: 0 }
        }
      ],
      edges: []
    });
    const normalizedUtilityNode = normalizedGraph.nodes.find(
      (node) => node.id === "utility-a"
    );
    const normalizedPtxNode = normalizedGraph.nodes.find(
      (node) => node.id === "ptx-a"
    );
    const normalizedLoadNode = normalizedGraph.nodes.find(
      (node) => node.id === "load-a"
    );

    expect(normalizedUtilityNode.data.nominalVoltage).toBe(DEFAULT_MEDIUM_VOLTAGE);
    expect(normalizedUtilityNode.data.voltage).toBeUndefined();
    expect(normalizedPtxNode.data.primaryVoltage).toBe(12470);
    expect(normalizedPtxNode.data.secondaryVoltage).toBe(DEFAULT_LOW_VOLTAGE);
    expect(normalizedPtxNode.data.ratio).toBeUndefined();
    expect(normalizedLoadNode.data.nominalVoltage).toBe(120);
  });
});
