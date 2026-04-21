import { describe, expect, it } from "vitest";
import { CANVAS_SNAP_GRID } from "../canvas/grid";
import {
  translateEdgePathOptions,
  translateEdgesForRigidNodeMove
} from "./edgePathOptions";

function buildEdge(id, source, target, pathOptions) {
  return {
    id,
    type: "standard",
    source,
    target,
    pathOptions
  };
}

describe("edge path option helpers", () => {
  it("translates a manual edge center when both endpoints move by the same delta", () => {
    const edges = [
      buildEdge("edge-a", "node-a", "node-b", {
        centerX: 96,
        centerY: 144
      })
    ];
    const movedNodeDeltasById = new Map([
      ["node-a", { x: 48, y: 24 }],
      ["node-b", { x: 48, y: 24 }]
    ]);

    const translatedEdges = translateEdgesForRigidNodeMove(
      edges,
      movedNodeDeltasById,
      CANVAS_SNAP_GRID
    );

    expect(translatedEdges[0].pathOptions).toEqual({
      centerX: 144,
      centerY: 168
    });
  });

  it("leaves a manual edge center unchanged when only one endpoint moved", () => {
    const edges = [
      buildEdge("edge-a", "node-a", "node-b", {
        centerX: 96,
        centerY: 144
      })
    ];
    const movedNodeDeltasById = new Map([["node-a", { x: 48, y: 24 }]]);

    const translatedEdges = translateEdgesForRigidNodeMove(
      edges,
      movedNodeDeltasById,
      CANVAS_SNAP_GRID
    );

    expect(translatedEdges).toBe(edges);
  });

  it("leaves a manual edge center unchanged when endpoint deltas differ", () => {
    const edges = [
      buildEdge("edge-a", "node-a", "node-b", {
        centerX: 96,
        centerY: 144
      })
    ];
    const movedNodeDeltasById = new Map([
      ["node-a", { x: 48, y: 24 }],
      ["node-b", { x: 24, y: 24 }]
    ]);

    const translatedEdges = translateEdgesForRigidNodeMove(
      edges,
      movedNodeDeltasById,
      CANVAS_SNAP_GRID
    );

    expect(translatedEdges).toBe(edges);
  });

  it("ignores edges without manual center coordinates", () => {
    const edges = [
      buildEdge("edge-a", "node-a", "node-b", undefined),
      buildEdge("edge-b", "node-a", "node-b", { controlMode: "auto" })
    ];
    const movedNodeDeltasById = new Map([
      ["node-a", { x: 48, y: 24 }],
      ["node-b", { x: 48, y: 24 }]
    ]);

    const translatedEdges = translateEdgesForRigidNodeMove(
      edges,
      movedNodeDeltasById,
      CANVAS_SNAP_GRID
    );

    expect(translatedEdges).toBe(edges);
  });

  it("snaps translated manual centers to the shared grid", () => {
    const translatedPathOptions = translateEdgePathOptions(
      {
        centerX: 40,
        centerY: 22,
        controlMode: "manual"
      },
      { x: 23, y: 23 },
      CANVAS_SNAP_GRID
    );

    expect(translatedPathOptions).toEqual({
      centerX: 72,
      centerY: 48,
      controlMode: "manual"
    });
  });
});
