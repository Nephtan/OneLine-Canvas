import { describe, expect, it } from "vitest";
import { createPastedSubgraph, extractSelectedSubgraph } from "./clipboard";

function buildNode(id, x, y, options = {}) {
  return {
    id,
    type: options.type ?? "switchboard",
    position: { x, y },
    data: {
      label: options.label ?? id,
      nominalVoltage: options.nominalVoltage ?? 480
    },
    selected: options.selected === true
  };
}

function buildEdge(id, source, target, options = {}) {
  return {
    id,
    type: options.type ?? "standard",
    source,
    target,
    sourceHandle: options.sourceHandle,
    targetHandle: options.targetHandle,
    data: options.data ?? {},
    pathOptions: options.pathOptions,
    selected: options.selected === true
  };
}

describe("clipboard helpers", () => {
  it("extracts selected nodes and only edges whose endpoints are both selected", () => {
    const nodes = [
      buildNode("a", 0, 0, { selected: true }),
      buildNode("b", 120, 24, { selected: true }),
      buildNode("c", 240, 48, { selected: false })
    ];
    const edges = [
      buildEdge("ab", "a", "b"),
      buildEdge("bc", "b", "c"),
      buildEdge("ca", "c", "a")
    ];

    const snapshot = extractSelectedSubgraph(nodes, edges);

    expect(snapshot).not.toBeNull();
    expect(snapshot?.nodes.map((node) => node.id)).toEqual(["a", "b"]);
    expect(snapshot?.edges.map((edge) => edge.id)).toEqual(["ab"]);
    expect(snapshot?.anchor).toEqual({ x: 0, y: 0 });
  });

  it("creates pasted nodes and edges with fresh ids and remapped endpoints", () => {
    const snapshot = extractSelectedSubgraph(
      [
        buildNode("a", 24, 24, { selected: true }),
        buildNode("b", 120, 48, { selected: true })
      ],
      [
        buildEdge("edge-1", "a", "b", {
          type: "breaker",
          sourceHandle: "source-a",
          targetHandle: "target-b",
          data: { breakerState: "closed" }
        })
      ]
    );

    let nextNodeSequence = 0;
    let nextEdgeSequence = 0;
    const pasted = createPastedSubgraph(snapshot, {
      anchorPosition: { x: 240, y: 240 },
      createNodeId: (node) => `${node.type}-copy-${nextNodeSequence++}`,
      createEdgeId: () => `edge-copy-${nextEdgeSequence++}`
    });

    expect(pasted?.nodes.map((node) => node.id)).toEqual([
      "switchboard-copy-0",
      "switchboard-copy-1"
    ]);
    expect(pasted?.nodes.every((node) => node.selected)).toBe(true);
    expect(pasted?.edges).toEqual([
      expect.objectContaining({
        id: "edge-copy-0",
        type: "breaker",
        source: "switchboard-copy-0",
        target: "switchboard-copy-1",
        sourceHandle: "source-a",
        targetHandle: "target-b",
        data: { breakerState: "closed" },
        selected: true
      })
    ]);
  });

  it("translates edge midpoint routing and snaps pasted geometry to the grid", () => {
    const snapshot = extractSelectedSubgraph(
      [
        buildNode("a", 10, 10, { selected: true }),
        buildNode("b", 70, 10, { selected: true })
      ],
      [
        buildEdge("edge-1", "a", "b", {
          pathOptions: {
            centerX: 40,
            centerY: 22
          }
        })
      ]
    );

    const pasted = createPastedSubgraph(snapshot, {
      anchorPosition: { x: 101, y: 102 },
      createNodeId: (node) => `${node.id}-copy`,
      createEdgeId: (edge) => `${edge.id}-copy`
    });

    expect(pasted?.nodes.map((node) => node.position)).toEqual([
      { x: 96, y: 96 },
      { x: 168, y: 96 }
    ]);
    expect(pasted?.edges[0].pathOptions).toEqual({
      centerX: 120,
      centerY: 120
    });
  });

  it("supports repeated paste nudges via the provided paste offset", () => {
    const snapshot = extractSelectedSubgraph(
      [
        buildNode("a", 24, 24, { selected: true }),
        buildNode("b", 72, 24, { selected: true })
      ],
      [buildEdge("edge-1", "a", "b")]
    );

    const firstPaste = createPastedSubgraph(snapshot, {
      anchorPosition: { x: 240, y: 240 },
      pasteOffset: { x: 0, y: 0 },
      createNodeId: (node) => `${node.id}-first`,
      createEdgeId: (edge) => `${edge.id}-first`
    });
    const secondPaste = createPastedSubgraph(snapshot, {
      anchorPosition: { x: 240, y: 240 },
      pasteOffset: { x: 24, y: 24 },
      createNodeId: (node) => `${node.id}-second`,
      createEdgeId: (edge) => `${edge.id}-second`
    });

    expect(firstPaste?.nodes[0].position).toEqual({ x: 240, y: 240 });
    expect(secondPaste?.nodes[0].position).toEqual({ x: 264, y: 264 });
  });
});
