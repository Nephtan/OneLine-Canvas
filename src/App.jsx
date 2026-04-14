import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import UtilityNode from "./nodes/UtilityNode";
import GeneratorNode from "./nodes/GeneratorNode";
import MVSGNode from "./nodes/MVSGNode";
import PTXNode from "./nodes/PTXNode";
import LoadNode from "./nodes/LoadNode";
import SwitchboardNode from "./nodes/SwitchboardNode";
import TransferSwitchNode from "./nodes/TransferSwitchNode";
import MechanicalNode from "./nodes/MechanicalNode";
import BreakerEdge from "./edges/BreakerEdge";
import usePowerFlow from "./hooks/usePowerFlow";
import { BREAKER_STATE, EDGE_POWER_STATE } from "./engine/powerFlow";
import EquipmentPalette, { DRAG_MIME_TYPE } from "./components/EquipmentPalette";
import ScadaPanel from "./components/ScadaPanel";
import {
  getDefaultNodeData,
  isSourceNodeType,
  normalizeGraphState,
  normalizeNodeData
} from "./nodes/nodeData";

const nodeTypes = {
  utility: UtilityNode,
  generator: GeneratorNode,
  mvsg: MVSGNode,
  ptx: PTXNode,
  load: LoadNode,
  switchboard: SwitchboardNode,
  transferSwitch: TransferSwitchNode,
  mechanical: MechanicalNode
};

const edgeTypes = {
  breaker: BreakerEdge
};

const STORAGE_KEY = "oneline-canvas-state";

function isGraphStateShape(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  );
}

function getBlankGraph() {
  return {
    nodes: [],
    edges: []
  };
}

function readGraphStateFromStorage() {
  if (typeof window === "undefined") {
    return getBlankGraph();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return getBlankGraph();
    }

    const parsed = JSON.parse(raw);

    if (!isGraphStateShape(parsed)) {
      console.error("Invalid persisted topology shape. Falling back to blank yard.");
      return getBlankGraph();
    }

    return normalizeGraphState(parsed);
  } catch (error) {
    console.error("Failed to parse persisted topology. Falling back to blank yard.", error);
    return getBlankGraph();
  }
}

function App() {
  const initialGraph = useMemo(() => readGraphStateFromStorage(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const reactFlowInstanceRef = useRef(null);
  const importInputRef = useRef(null);
  const skipNextAutosaveRef = useRef(false);
  const {
    powerStateByNodeId,
    sourceIdsByNodeId,
    edgePowerStateByEdgeId,
    faultedEdgeIds
  } =
    usePowerFlow(nodes, edges);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          nodes,
          edges
        })
      );
    } catch (error) {
      console.error("Failed to persist topology to localStorage.", error);
    }
  }, [nodes, edges]);

  useEffect(() => {
    if (!faultedEdgeIds || faultedEdgeIds.length === 0) {
      return;
    }

    const faultedEdgeIdSet = new Set(faultedEdgeIds);

    setEdges((currentEdges) => {
      let didTripAnyEdge = false;

      const nextEdges = currentEdges.map((edge) => {
        if (!faultedEdgeIdSet.has(edge.id)) {
          return edge;
        }

        if (edge.data?.breakerState !== BREAKER_STATE.CLOSED) {
          return edge;
        }

        didTripAnyEdge = true;

        return {
          ...edge,
          data: {
            ...edge.data,
            breakerState: BREAKER_STATE.TRIPPED
          }
        };
      });

      return didTripAnyEdge ? nextEdges : currentEdges;
    });
  }, [faultedEdgeIds, setEdges]);

  const toggleRootSourceOnline = useCallback(
    (nodeId) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId || !isSourceNodeType(node.type)) {
            return node;
          }

          const nodeData = normalizeNodeData(node);
          const isCurrentlyOnline = nodeData.isSourceOnline !== false;

          return {
            ...node,
            data: {
              ...nodeData,
              isSourceOnline: !isCurrentlyOnline
            }
          };
        })
      );
    },
    [setNodes]
  );

  const renameNodeLabel = useCallback(
    (nodeId, nextLabel) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          const nodeData = normalizeNodeData(node);

          if (nodeData.label === nextLabel) {
            return node;
          }

          return {
            ...node,
            data: {
              ...nodeData,
              label: nextLabel
            }
          };
        })
      );
    },
    [setNodes]
  );

  const changeNodeSyncGroup = useCallback(
    (nodeId, nextSyncGroup) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId || !isSourceNodeType(node.type)) {
            return node;
          }

          const nodeData = normalizeNodeData(node);

          if (nodeData.syncGroup === nextSyncGroup) {
            return node;
          }

          return {
            ...node,
            data: {
              ...nodeData,
              syncGroup: nextSyncGroup
            }
          };
        })
      );
    },
    [setNodes]
  );

  const resetAllTrippedBreakers = useCallback(() => {
    setEdges((currentEdges) => {
      let didResetAnyEdge = false;

      const nextEdges = currentEdges.map((edge) => {
        if (edge.data?.breakerState !== BREAKER_STATE.TRIPPED) {
          return edge;
        }

        didResetAnyEdge = true;

        return {
          ...edge,
          data: {
            ...edge.data,
            breakerState: BREAKER_STATE.OPEN
          }
        };
      });

      return didResetAnyEdge ? nextEdges : currentEdges;
    });
  }, [setEdges]);

  const renderNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...normalizeNodeData(node),
          powerState: powerStateByNodeId[node.id] ?? "Dead",
          sourceIds: sourceIdsByNodeId[node.id] ?? [],
          onRenameLabel: (nextLabel) => renameNodeLabel(node.id, nextLabel),
          onToggleSourceOnline:
            isSourceNodeType(node.type)
              ? () => toggleRootSourceOnline(node.id)
              : undefined,
          onChangeSyncGroup: isSourceNodeType(node.type)
            ? (nextSyncGroup) => changeNodeSyncGroup(node.id, nextSyncGroup)
            : undefined
        }
      })),
    [
      nodes,
      powerStateByNodeId,
      sourceIdsByNodeId,
      renameNodeLabel,
      toggleRootSourceOnline,
      changeNodeSyncGroup
    ]
  );

  const renderEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          powerState:
            edgePowerStateByEdgeId[edge.id] ?? EDGE_POWER_STATE.DE_ENERGIZED
        }
      })),
    [edges, edgePowerStateByEdgeId]
  );

  const onConnect = useCallback(
    (connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            type: "breaker",
            data: {
              breakerState: BREAKER_STATE.OPEN
            }
          },
          currentEdges
        )
      );
    },
    [setEdges]
  );

  const onDragStart = useCallback((event, nodeType) => {
    event.dataTransfer.setData(DRAG_MIME_TYPE, nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onSaveToFile = useCallback(() => {
    const topologyJson = JSON.stringify({ nodes, edges }, null, 2);
    const topologyBlob = new Blob([topologyJson], {
      type: "application/json"
    });
    const objectUrl = URL.createObjectURL(topologyBlob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = "topology.json";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  }, [nodes, edges]);

  const onLoadFromFile = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const onImportFileChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      try {
        const fileText = await file.text();
        const parsed = JSON.parse(fileText);

        if (!isGraphStateShape(parsed)) {
          throw new Error("Imported file does not contain { nodes: [], edges: [] }.");
        }

        const normalizedGraph = normalizeGraphState(parsed);
        setNodes(normalizedGraph.nodes);
        setEdges(normalizedGraph.edges);
      } catch (error) {
        console.error("Topology import failed.", error);
        window.alert("Invalid topology file. Import aborted.");
      }
    },
    [setNodes, setEdges]
  );

  const onClearYard = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    skipNextAutosaveRef.current = true;
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData(DRAG_MIME_TYPE);
      const reactFlowInstance = reactFlowInstanceRef.current;

      if (
        !reactFlowInstance ||
        (nodeType !== "utility" &&
          nodeType !== "generator" &&
          nodeType !== "mvsg" &&
          nodeType !== "ptx" &&
          nodeType !== "load" &&
          nodeType !== "switchboard" &&
          nodeType !== "transferSwitch" &&
          nodeType !== "mechanical")
      ) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });
      const nodeUuid = crypto.randomUUID();
      const nodeId = `${nodeType}-${nodeUuid}`;

      setNodes((currentNodes) =>
        currentNodes.concat({
          id: nodeId,
          type: nodeType,
          position,
          data: getDefaultNodeData(nodeType, nodeId)
        })
      );
    },
    [setNodes]
  );

  const onEdgeClick = useCallback(
    (event, edge) => {
      event.preventDefault();
      event.stopPropagation();

      if (edge.type !== "breaker") {
        return;
      }

      setEdges((currentEdges) =>
        currentEdges.map((currentEdge) => {
          if (currentEdge.id !== edge.id) {
            return currentEdge;
          }

          const nextState =
            currentEdge.data?.breakerState === BREAKER_STATE.TRIPPED
              ? BREAKER_STATE.OPEN
              : currentEdge.data?.breakerState === BREAKER_STATE.CLOSED
                ? BREAKER_STATE.OPEN
                : BREAKER_STATE.CLOSED;

          return {
            ...currentEdge,
            data: {
              ...currentEdge.data,
              breakerState: nextState
            }
          };
        })
      );
    },
    [setEdges]
  );

  const onNodesDelete = useCallback(
    (deletedNodes) => {
      const deletedNodeIdSet = new Set(deletedNodes.map((node) => node.id));

      setEdges((currentEdges) =>
        currentEdges.filter(
          (edge) =>
            !deletedNodeIdSet.has(edge.source) && !deletedNodeIdSet.has(edge.target)
        )
      );
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges) => {
      const deletedEdgeIdSet = new Set(deletedEdges.map((edge) => edge.id));

      setEdges((currentEdges) =>
        currentEdges.filter((edge) => !deletedEdgeIdSet.has(edge.id))
      );
    },
    [setEdges]
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "breaker"
    }),
    []
  );

  return (
    <div className="fixed inset-0 h-screen w-screen bg-slate-950 font-mono text-slate-100">
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onImportFileChange}
      />

      <div className="flex h-full w-full overflow-hidden">
        <EquipmentPalette
          onDragStart={onDragStart}
          onSaveToFile={onSaveToFile}
          onLoadFromFile={onLoadFromFile}
          onClearYard={onClearYard}
        />
        <ScadaPanel
          nodes={nodes}
          edges={edges}
          powerStateByNodeId={powerStateByNodeId}
          onToggleSourceOnline={toggleRootSourceOnline}
          onResetAllBreakers={resetAllTrippedBreakers}
        />

        <div className="relative h-full flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={renderNodes}
            edges={renderEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            defaultEdgeOptions={defaultEdgeOptions}
            deleteKeyCode={["Delete", "Backspace"]}
            minZoom={0.2}
            maxZoom={1.8}
            className="bg-slate-950"
          >
            <Background gap={24} size={1} color="#334155" />
            <MiniMap
              pannable
              zoomable
              className="!border !border-slate-700 !bg-slate-900"
              nodeColor="#0f172a"
            />
            <Controls
              className="!border !border-slate-700 !bg-slate-900 [&_button]:!bg-slate-800 [&_button]:!text-slate-200"
            />
          </ReactFlow>

          <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs tracking-wide text-slate-300">
            OneLine-Canvas Phase 11 SCADA Dashboard
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
