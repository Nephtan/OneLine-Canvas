import { describe, expect, it } from "vitest";
import { createTopologyKey, evaluatePowerFlow } from "./powerFlow";

function utilityNode(id) {
  return {
    id,
    type: "utility",
    data: { label: id },
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
  it("keeps MVSG dead when the breaker is open", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a")];
    const edges = [breakerEdge("e1", "utility-a", "mvsg-a", "open")];
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe("Live");
    expect(powerStateByNodeId["mvsg-a"]).toBe("Dead");
  });

  it("energizes MVSG when the breaker is closed", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a")];
    const edges = [breakerEdge("e1", "utility-a", "mvsg-a", "closed")];
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe("Live");
    expect(powerStateByNodeId["mvsg-a"]).toBe("Live");
  });

  it("treats a closed breaker as bi-directional even with reversed source/target", () => {
    const nodes = [utilityNode("utility-a"), mvsgNode("mvsg-a")];
    const edges = [breakerEdge("e1", "mvsg-a", "utility-a", "closed")];
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["utility-a"]).toBe("Live");
    expect(powerStateByNodeId["mvsg-a"]).toBe("Live");
  });

  it("leaves disconnected gear dead", () => {
    const nodes = [
      utilityNode("utility-a"),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [breakerEdge("e1", "utility-a", "mvsg-a", "closed")];
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe("Live");
    expect(powerStateByNodeId["mvsg-b"]).toBe("Dead");
  });

  it("energizes multiple connected components from multiple utilities", () => {
    const nodes = [
      utilityNode("utility-a"),
      utilityNode("utility-b"),
      mvsgNode("mvsg-a"),
      mvsgNode("mvsg-b")
    ];
    const edges = [
      breakerEdge("e1", "utility-a", "mvsg-a", "closed"),
      breakerEdge("e2", "utility-b", "mvsg-b", "closed")
    ];
    const { powerStateByNodeId } = evaluatePowerFlow(nodes, edges);

    expect(powerStateByNodeId["mvsg-a"]).toBe("Live");
    expect(powerStateByNodeId["mvsg-b"]).toBe("Live");
  });
});

describe("createTopologyKey", () => {
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
