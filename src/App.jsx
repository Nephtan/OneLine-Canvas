import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const MOP_ACTION_TYPE = {
  TOGGLE_SOURCE: "TOGGLE_SOURCE",
  TOGGLE_BREAKER: "TOGGLE_BREAKER"
};

function isGraphStateShape(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  );
}

function getBlankAppState() {
  return {
    nodes: [],
    edges: [],
    mopSteps: [],
    mopBaseSnapshot: null
  };
}

function cloneGraphState(graphState) {
  return JSON.parse(
    JSON.stringify({
      nodes: graphState.nodes,
      edges: graphState.edges
    })
  );
}

function serializeGraphState(graphState) {
  return JSON.stringify({
    nodes: graphState.nodes,
    edges: graphState.edges
  });
}

function normalizeMopBaseSnapshot(value) {
  if (!isGraphStateShape(value)) {
    return null;
  }

  return cloneGraphState(normalizeGraphState(value));
}

function normalizeMopTargetState(actionType, targetState) {
  if (actionType === MOP_ACTION_TYPE.TOGGLE_SOURCE) {
    return targetState === true;
  }

  return targetState === BREAKER_STATE.CLOSED
    ? BREAKER_STATE.CLOSED
    : BREAKER_STATE.OPEN;
}

function getDefaultMopActionText(actionType, targetId, targetState) {
  if (actionType === MOP_ACTION_TYPE.TOGGLE_SOURCE) {
    return targetState ? `Restored ${targetId}` : `Killed ${targetId}`;
  }

  return targetState === BREAKER_STATE.CLOSED
    ? `Closed Breaker ${targetId}`
    : `Opened Breaker ${targetId}`;
}

function normalizeMopSteps(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((step) => {
      if (
        step === null ||
        typeof step !== "object" ||
        typeof step.targetId !== "string" ||
        (step.actionType !== MOP_ACTION_TYPE.TOGGLE_SOURCE &&
          step.actionType !== MOP_ACTION_TYPE.TOGGLE_BREAKER) ||
        !isGraphStateShape(step.snapshot)
      ) {
        return null;
      }

      const normalizedTargetState = normalizeMopTargetState(
        step.actionType,
        step.targetState
      );

      return {
        targetId: step.targetId,
        actionType: step.actionType,
        targetState: normalizedTargetState,
        actionText:
          typeof step.actionText === "string" && step.actionText.trim() !== ""
            ? step.actionText
            : getDefaultMopActionText(
                step.actionType,
                step.targetId,
                normalizedTargetState
              ),
        snapshot: cloneGraphState(normalizeGraphState(step.snapshot))
      };
    })
    .filter(Boolean);
}

function normalizePersistedAppState(value) {
  if (!isGraphStateShape(value)) {
    return getBlankAppState();
  }

  const normalizedGraph = normalizeGraphState(value);
  const mopBaseSnapshot = normalizeMopBaseSnapshot(value.mopBaseSnapshot);
  const mopSteps = mopBaseSnapshot ? normalizeMopSteps(value.mopSteps) : [];

  return {
    nodes: normalizedGraph.nodes,
    edges: normalizedGraph.edges,
    mopSteps,
    mopBaseSnapshot
  };
}

function deriveMopPlaybackIndex(nodes, edges, mopBaseSnapshot, mopSteps) {
  if (!mopBaseSnapshot) {
    return 0;
  }

  const currentGraphSignature = serializeGraphState({ nodes, edges });
  let matchedPlaybackIndex =
    serializeGraphState(mopBaseSnapshot) === currentGraphSignature ? 0 : -1;

  mopSteps.forEach((step, stepIndex) => {
    if (serializeGraphState(step.snapshot) === currentGraphSignature) {
      matchedPlaybackIndex = stepIndex + 1;
    }
  });

  return matchedPlaybackIndex >= 0 ? matchedPlaybackIndex : 0;
}

function getNextBreakerState(currentState) {
  if (currentState === BREAKER_STATE.TRIPPED) {
    return BREAKER_STATE.OPEN;
  }

  return currentState === BREAKER_STATE.CLOSED
    ? BREAKER_STATE.OPEN
    : BREAKER_STATE.CLOSED;
}

function readGraphStateFromStorage() {
  if (typeof window === "undefined") {
    return getBlankAppState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return getBlankAppState();
    }

    const parsed = JSON.parse(raw);

    if (!isGraphStateShape(parsed)) {
      console.error("Invalid persisted topology shape. Falling back to blank yard.");
      return getBlankAppState();
    }

    return normalizePersistedAppState(parsed);
  } catch (error) {
    console.error("Failed to parse persisted topology. Falling back to blank yard.", error);
    return getBlankAppState();
  }
}

function App() {
  const initialGraph = useMemo(() => readGraphStateFromStorage(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [mopSteps, setMopSteps] = useState(initialGraph.mopSteps);
  const [mopBaseSnapshot, setMopBaseSnapshot] = useState(initialGraph.mopBaseSnapshot);
  const [isRecordingMop, setIsRecordingMop] = useState(false);
  const [mopPlaybackIndex, setMopPlaybackIndex] = useState(() =>
    deriveMopPlaybackIndex(
      initialGraph.nodes,
      initialGraph.edges,
      initialGraph.mopBaseSnapshot,
      initialGraph.mopSteps
    )
  );
  const [pendingMopAction, setPendingMopAction] = useState(null);
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
          edges,
          mopSteps,
          mopBaseSnapshot
        })
      );
    } catch (error) {
      console.error("Failed to persist topology to localStorage.", error);
    }
  }, [nodes, edges, mopSteps, mopBaseSnapshot]);

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

  useEffect(() => {
    if (!pendingMopAction || !mopBaseSnapshot || faultedEdgeIds.length > 0) {
      return;
    }

    const nextMopStep = {
      ...pendingMopAction,
      snapshot: cloneGraphState({ nodes, edges })
    };

    setMopSteps((currentMopSteps) => currentMopSteps.concat(nextMopStep));
    setMopPlaybackIndex((currentPlaybackIndex) => currentPlaybackIndex + 1);
    setPendingMopAction(null);
  }, [
    pendingMopAction,
    mopBaseSnapshot,
    faultedEdgeIds,
    nodes,
    edges
  ]);

  const applySourceOnlineToggle = useCallback(
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

  const applyBreakerState = useCallback(
    (edgeId, nextState) => {
      setEdges((currentEdges) =>
        currentEdges.map((currentEdge) => {
          if (currentEdge.id !== edgeId) {
            return currentEdge;
          }

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

  const handleSourceToggleRequest = useCallback(
    (nodeId) => {
      const sourceNode = nodes.find((node) => node.id === nodeId);

      if (!sourceNode || !isSourceNodeType(sourceNode.type)) {
        return;
      }

      const sourceNodeData = normalizeNodeData(sourceNode);
      const nextIsSourceOnline = !(sourceNodeData.isSourceOnline !== false);

      if (isRecordingMop) {
        setPendingMopAction({
          targetId: nodeId,
          actionType: MOP_ACTION_TYPE.TOGGLE_SOURCE,
          targetState: nextIsSourceOnline,
          actionText: nextIsSourceOnline
            ? `Restored ${sourceNodeData.label}`
            : `Killed ${sourceNodeData.label}`
        });
      }

      applySourceOnlineToggle(nodeId);
    },
    [nodes, isRecordingMop, applySourceOnlineToggle]
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

  const toggleMopRecording = useCallback(() => {
    if (isRecordingMop) {
      setIsRecordingMop(false);
      return;
    }

    setPendingMopAction(null);
    setMopSteps([]);
    setMopBaseSnapshot(cloneGraphState({ nodes, edges }));
    setMopPlaybackIndex(0);
    setIsRecordingMop(true);
  }, [isRecordingMop, nodes, edges]);

  const applyMopSnapshot = useCallback(
    (snapshot, nextPlaybackIndex) => {
      const clonedSnapshot = cloneGraphState(snapshot);

      setIsRecordingMop(false);
      setPendingMopAction(null);
      setNodes(clonedSnapshot.nodes);
      setEdges(clonedSnapshot.edges);
      setMopPlaybackIndex(nextPlaybackIndex);
    },
    [setNodes, setEdges]
  );

  const resetMopPlayback = useCallback(() => {
    if (!mopBaseSnapshot) {
      return;
    }

    applyMopSnapshot(mopBaseSnapshot, 0);
  }, [mopBaseSnapshot, applyMopSnapshot]);

  const stepMopPlaybackForward = useCallback(() => {
    if (mopPlaybackIndex >= mopSteps.length) {
      return;
    }

    applyMopSnapshot(mopSteps[mopPlaybackIndex].snapshot, mopPlaybackIndex + 1);
  }, [mopPlaybackIndex, mopSteps, applyMopSnapshot]);

  const stepMopPlaybackBack = useCallback(() => {
    if (mopPlaybackIndex === 0) {
      return;
    }

    if (mopPlaybackIndex === 1) {
      if (mopBaseSnapshot) {
        applyMopSnapshot(mopBaseSnapshot, 0);
      }

      return;
    }

    applyMopSnapshot(mopSteps[mopPlaybackIndex - 2].snapshot, mopPlaybackIndex - 1);
  }, [mopPlaybackIndex, mopBaseSnapshot, mopSteps, applyMopSnapshot]);

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
              ? () => handleSourceToggleRequest(node.id)
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
      handleSourceToggleRequest,
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
    const topologyJson = JSON.stringify(
      { nodes, edges, mopSteps, mopBaseSnapshot },
      null,
      2
    );
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
  }, [nodes, edges, mopSteps, mopBaseSnapshot]);

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

        const normalizedAppState = normalizePersistedAppState(parsed);
        setIsRecordingMop(false);
        setPendingMopAction(null);
        setNodes(normalizedAppState.nodes);
        setEdges(normalizedAppState.edges);
        setMopSteps(normalizedAppState.mopSteps);
        setMopBaseSnapshot(normalizedAppState.mopBaseSnapshot);
        setMopPlaybackIndex(
          deriveMopPlaybackIndex(
            normalizedAppState.nodes,
            normalizedAppState.edges,
            normalizedAppState.mopBaseSnapshot,
            normalizedAppState.mopSteps
          )
        );
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
    setIsRecordingMop(false);
    setPendingMopAction(null);
    setMopSteps([]);
    setMopBaseSnapshot(null);
    setMopPlaybackIndex(0);
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

      const nextState = getNextBreakerState(edge.data?.breakerState);

      if (isRecordingMop) {
        setPendingMopAction({
          targetId: edge.id,
          actionType: MOP_ACTION_TYPE.TOGGLE_BREAKER,
          targetState:
            nextState === BREAKER_STATE.CLOSED
              ? BREAKER_STATE.CLOSED
              : BREAKER_STATE.OPEN,
          actionText:
            nextState === BREAKER_STATE.CLOSED
              ? `Closed Breaker ${edge.id}`
              : `Opened Breaker ${edge.id}`
        });
      }

      applyBreakerState(edge.id, nextState);
    },
    [isRecordingMop, applyBreakerState]
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
          onToggleSourceOnline={handleSourceToggleRequest}
          onResetAllBreakers={resetAllTrippedBreakers}
          hasMopBaseSnapshot={Boolean(mopBaseSnapshot)}
          isRecordingMop={isRecordingMop}
          mopSteps={mopSteps}
          mopPlaybackIndex={mopPlaybackIndex}
          onToggleMopRecording={toggleMopRecording}
          onMopReset={resetMopPlayback}
          onMopStepBack={stepMopPlaybackBack}
          onMopStepForward={stepMopPlaybackForward}
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
            OneLine-Canvas Phase 12 MOP Recorder
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
