import { CANVAS_SNAP_GRID } from "./grid";
import { normalizeEdgePathOptions } from "../topology/edgePathOptions";

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function snapCoordinate(value, step) {
  if (typeof value !== "number" || !Number.isFinite(value) || step <= 0) {
    return value;
  }

  return step * Math.round(value / step);
}

function snapPosition(position, snapGrid = CANVAS_SNAP_GRID) {
  const [stepX, stepY] = snapGrid;

  return {
    x: snapCoordinate(position.x, stepX),
    y: snapCoordinate(position.y, stepY)
  };
}

function translateEdgePathOptions(pathOptions, delta, snapGrid) {
  const normalizedPathOptions = normalizeEdgePathOptions(pathOptions);

  if (!normalizedPathOptions) {
    return undefined;
  }

  return normalizeEdgePathOptions({
    ...normalizedPathOptions,
    centerX: snapCoordinate(normalizedPathOptions.centerX + delta.x, snapGrid[0]),
    centerY: snapCoordinate(normalizedPathOptions.centerY + delta.y, snapGrid[1])
  });
}

export function extractSelectedSubgraph(nodes, edges) {
  const selectedNodes = nodes.filter((node) => node.selected);

  if (selectedNodes.length === 0) {
    return null;
  }

  const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
  const selectedEdges = edges.filter(
    (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
  );
  const anchor = selectedNodes.reduce(
    (currentAnchor, node) => ({
      x: Math.min(currentAnchor.x, node.position.x),
      y: Math.min(currentAnchor.y, node.position.y)
    }),
    { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY }
  );

  return {
    nodes: cloneSerializable(selectedNodes),
    edges: cloneSerializable(selectedEdges),
    anchor
  };
}

export function createPastedSubgraph(
  clipboardSnapshot,
  {
    anchorPosition,
    pasteOffset = { x: 0, y: 0 },
    snapGrid = CANVAS_SNAP_GRID,
    createNodeId,
    createEdgeId
  }
) {
  if (!clipboardSnapshot || clipboardSnapshot.nodes.length === 0) {
    return null;
  }

  const translation = {
    x: anchorPosition.x - clipboardSnapshot.anchor.x + pasteOffset.x,
    y: anchorPosition.y - clipboardSnapshot.anchor.y + pasteOffset.y
  };
  const idMap = new Map();

  const nodes = clipboardSnapshot.nodes.map((node) => {
    const nextNodeId = createNodeId(node);
    idMap.set(node.id, nextNodeId);

    return {
      ...cloneSerializable(node),
      id: nextNodeId,
      selected: true,
      position: snapPosition(
        {
          x: node.position.x + translation.x,
          y: node.position.y + translation.y
        },
        snapGrid
      )
    };
  });

  const edges = clipboardSnapshot.edges
    .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
    .map((edge) => ({
      ...cloneSerializable(edge),
      id: createEdgeId(edge),
      source: idMap.get(edge.source),
      target: idMap.get(edge.target),
      selected: true,
      pathOptions: translateEdgePathOptions(edge.pathOptions, translation, snapGrid)
    }));

  return {
    nodes,
    edges
  };
}
