import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  SelectionMode,
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
import StandardEdge from "./edges/StandardEdge";
import usePowerFlow from "./hooks/usePowerFlow";
import { BREAKER_STATE, EDGE_POWER_STATE } from "./engine/powerFlow";
import EquipmentPalette, { DRAG_MIME_TYPE } from "./components/EquipmentPalette";
import ScadaPanel from "./components/ScadaPanel";
import NodePropertiesModal from "./components/NodePropertiesModal";
import {
  getDefaultNodeData,
  isSourceNodeType,
  isTransferSwitchNodeType,
  normalizeGraphState,
  normalizeNodeData
} from "./nodes/nodeData";
import {
  formatTransferSwitchActiveSource,
  normalizeTransferSwitchActiveSource
} from "./topology/transferSwitch";
import {
  EDGE_TYPE,
  normalizeCanvasEdgeType
} from "./topology/edgeTypes";
import {
  CANVAS_GRID_SIZE,
  CANVAS_SNAP_GRID,
  createEdgeWaypointId,
  getEdgeWaypoints,
  normalizeCanvasEdgeData,
  normalizeEdgeLayout,
  snapCanvasPoint,
  translateEdgeWaypoints
} from "./canvas/edgeLayout";

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
  breaker: BreakerEdge,
  standard: StandardEdge
};

const STORAGE_KEY = "oneline-canvas-state";
const MOP_ACTION_TYPE = {
  TOGGLE_SOURCE: "TOGGLE_SOURCE",
  TOGGLE_BREAKER: "TOGGLE_BREAKER",
  THROW_TRANSFER_SWITCH: "THROW_TRANSFER_SWITCH",
  DELETE_NODE: "DELETE_NODE",
  DELETE_EDGE: "DELETE_EDGE"
};

function getDefaultEdgeData(edgeType) {
  const normalizedEdgeType = normalizeCanvasEdgeType(edgeType);

  return normalizedEdgeType === EDGE_TYPE.BREAKER
    ? {
        breakerState: BREAKER_STATE.OPEN,
        layout: { waypoints: [] }
      }
    : {
        layout: { waypoints: [] }
      };
}

function createMovingNodeSessionKey(nodes) {
  return nodes
    .map((node) => node.id)
    .sort()
    .join("|");
}

function deriveSharedMovementDelta(initialPositionsByNodeId, movingNodes) {
  let sharedDelta = null;

  for (const node of movingNodes) {
    const initialPosition = initialPositionsByNodeId[node.id];

    if (!initialPosition) {
      continue;
    }

    const nextDelta = {
      x: node.position.x - initialPosition.x,
      y: node.position.y - initialPosition.y
    };

    if (sharedDelta === null) {
      sharedDelta = nextDelta;
      continue;
    }

    if (sharedDelta.x !== nextDelta.x || sharedDelta.y !== nextDelta.y) {
      return null;
    }
  }

  return sharedDelta ?? { x: 0, y: 0 };
}

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

  if (actionType === MOP_ACTION_TYPE.THROW_TRANSFER_SWITCH) {
    return normalizeTransferSwitchActiveSource(targetState);
  }

  if (
    actionType === MOP_ACTION_TYPE.DELETE_NODE ||
    actionType === MOP_ACTION_TYPE.DELETE_EDGE
  ) {
    return "deleted";
  }

  return targetState === BREAKER_STATE.CLOSED
    ? BREAKER_STATE.CLOSED
    : BREAKER_STATE.OPEN;
}

function getDefaultMopActionText(actionType, targetId, targetState) {
  if (actionType === MOP_ACTION_TYPE.TOGGLE_SOURCE) {
    return targetState ? `Restored ${targetId}` : `Killed ${targetId}`;
  }

  if (actionType === MOP_ACTION_TYPE.THROW_TRANSFER_SWITCH) {
    return `Transfer ${targetId} to ${formatTransferSwitchActiveSource(targetState)}`;
  }

  if (
    actionType === MOP_ACTION_TYPE.DELETE_NODE ||
    actionType === MOP_ACTION_TYPE.DELETE_EDGE
  ) {
    return `Deleted ${targetId}`;
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
          step.actionType !== MOP_ACTION_TYPE.TOGGLE_BREAKER &&
          step.actionType !== MOP_ACTION_TYPE.THROW_TRANSFER_SWITCH &&
          step.actionType !== MOP_ACTION_TYPE.DELETE_NODE &&
          step.actionType !== MOP_ACTION_TYPE.DELETE_EDGE) ||
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
  const [edgeDrawMode, setEdgeDrawMode] = useState(EDGE_TYPE.BREAKER);
  const [mopPlaybackIndex, setMopPlaybackIndex] = useState(() =>
    deriveMopPlaybackIndex(
      initialGraph.nodes,
      initialGraph.edges,
      initialGraph.mopBaseSnapshot,
      initialGraph.mopSteps
    )
  );
  const [pendingMopAction, setPendingMopAction] = useState(null);
  const [activePropertiesNodeId, setActivePropertiesNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const reactFlowInstanceRef = useRef(null);
  const importInputRef = useRef(null);
  const skipNextAutosaveRef = useRef(false);
  const movingEdgeLayoutRef = useRef(null);
  const {
    powerStateByNodeId,
    powerFlagsByNodeId,
    sourceIdsByNodeId,
    propagatingVoltagesByNodeId,
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
    if (!activePropertiesNodeId) {
      return;
    }

    const activeNodeStillExists = nodes.some((node) => node.id === activePropertiesNodeId);

    if (!activeNodeStillExists) {
      setActivePropertiesNodeId(null);
    }
  }, [nodes, activePropertiesNodeId]);

  useEffect(() => {
    if (!selectedEdgeId) {
      return;
    }

    const selectedEdgeStillExists = edges.some((edge) => edge.id === selectedEdgeId);

    if (!selectedEdgeStillExists) {
      setSelectedEdgeId(null);
    }
  }, [edges, selectedEdgeId]);

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

  const applyTransferSwitchActiveSource = useCallback(
    (nodeId, nextActiveSource) => {
      const normalizedNextActiveSource = normalizeTransferSwitchActiveSource(
        nextActiveSource
      );

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId || !isTransferSwitchNodeType(node.type)) {
            return node;
          }

          const nodeData = normalizeNodeData(node);

          if (nodeData.activeSource === normalizedNextActiveSource) {
            return node;
          }

          return {
            ...node,
            data: {
              ...nodeData,
              activeSource: normalizedNextActiveSource
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

  const openNodeProperties = useCallback((nodeId) => {
    setActivePropertiesNodeId(nodeId);
  }, []);

  const closeNodeProperties = useCallback(() => {
    setActivePropertiesNodeId(null);
  }, []);

  const applyNodeProperties = useCallback(
    (nodeId, nextProperties) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          return {
            ...node,
            data: {
              ...normalizeNodeData(node),
              ...nextProperties
            }
          };
        })
      );
      setActivePropertiesNodeId(null);
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

  const handleTransferSwitchThrowRequest = useCallback(
    (nodeId, nextActiveSource) => {
      const transferSwitchNode = nodes.find((node) => node.id === nodeId);

      if (!transferSwitchNode || !isTransferSwitchNodeType(transferSwitchNode.type)) {
        return;
      }

      const transferSwitchData = normalizeNodeData(transferSwitchNode);
      const normalizedNextActiveSource = normalizeTransferSwitchActiveSource(
        nextActiveSource
      );

      if (transferSwitchData.activeSource === normalizedNextActiveSource) {
        return;
      }

      if (isRecordingMop) {
        setPendingMopAction({
          targetId: nodeId,
          actionType: MOP_ACTION_TYPE.THROW_TRANSFER_SWITCH,
          targetState: normalizedNextActiveSource,
          actionText: `Transfer ${transferSwitchData.label} to ${formatTransferSwitchActiveSource(
            normalizedNextActiveSource
          )}`
        });
      }

      applyTransferSwitchActiveSource(nodeId, normalizedNextActiveSource);
    },
    [nodes, isRecordingMop, applyTransferSwitchActiveSource]
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
      setSelectedEdgeId(null);
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

  const handleDeleteNodeRequest = useCallback(
    async (nodeId) => {
      const reactFlowInstance = reactFlowInstanceRef.current;
      const nodeToDelete = nodes.find((node) => node.id === nodeId);

      if (!reactFlowInstance?.deleteElements || !nodeToDelete) {
        return;
      }

      const nodeData = normalizeNodeData(nodeToDelete);
      const { deletedNodes = [] } = await reactFlowInstance.deleteElements({
        nodes: [nodeToDelete],
        edges: []
      });

      if (deletedNodes.length === 0) {
        return;
      }

      if (isRecordingMop) {
        setPendingMopAction({
          targetId: nodeId,
          actionType: MOP_ACTION_TYPE.DELETE_NODE,
          targetState: "deleted",
          actionText: `Deleted ${nodeData.label}`
        });
      }
    },
    [nodes, isRecordingMop]
  );

  const handleDeleteEdgeRequest = useCallback(
    async (edgeId) => {
      const reactFlowInstance = reactFlowInstanceRef.current;
      const edgeToDelete = edges.find((edge) => edge.id === edgeId);

      if (!reactFlowInstance?.deleteElements || !edgeToDelete) {
        return;
      }

      const edgeType = normalizeCanvasEdgeType(edgeToDelete.type);
      const { deletedEdges = [] } = await reactFlowInstance.deleteElements({
        nodes: [],
        edges: [edgeToDelete]
      });

      if (deletedEdges.length === 0) {
        return;
      }

      if (isRecordingMop) {
        setPendingMopAction({
          targetId: edgeId,
          actionType: MOP_ACTION_TYPE.DELETE_EDGE,
          targetState: "deleted",
          actionText:
            edgeType === EDGE_TYPE.STANDARD
              ? `Deleted Wire ${edgeId}`
              : `Deleted Breaker ${edgeId}`
        });
      }
    },
    [edges, isRecordingMop]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !selectedEdgeId) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      const eventTarget = event.target;
      const isTextInputTarget =
        eventTarget instanceof HTMLElement &&
        (eventTarget.tagName === "INPUT" ||
          eventTarget.tagName === "TEXTAREA" ||
          eventTarget.tagName === "SELECT" ||
          eventTarget.isContentEditable);

      if (
        isTextInputTarget ||
        (event.key !== "Delete" && event.key !== "Backspace")
      ) {
        return;
      }

      event.preventDefault();
      void handleDeleteEdgeRequest(selectedEdgeId);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedEdgeId, handleDeleteEdgeRequest]);

  const addEdgeWaypoint = useCallback(
    (edgeId, insertIndex, position) => {
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          if (edge.id !== edgeId) {
            return edge;
          }

          const normalizedData = normalizeCanvasEdgeData(edge.data);
          const nextWaypoints = normalizedData.layout.waypoints.slice();

          nextWaypoints.splice(Math.max(0, insertIndex), 0, {
            id: createEdgeWaypointId(),
            ...snapCanvasPoint(position)
          });

          return {
            ...edge,
            data: {
              ...normalizedData,
              layout: normalizeEdgeLayout({ waypoints: nextWaypoints })
            }
          };
        })
      );
    },
    [setEdges]
  );

  const moveEdgeWaypoint = useCallback(
    (edgeId, waypointId, nextPosition) => {
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          if (edge.id !== edgeId) {
            return edge;
          }

          const normalizedData = normalizeCanvasEdgeData(edge.data);
          let didMoveWaypoint = false;
          const snappedPosition = snapCanvasPoint(nextPosition);
          const nextWaypoints = normalizedData.layout.waypoints.map((waypoint) => {
            if (waypoint.id !== waypointId) {
              return waypoint;
            }

            didMoveWaypoint = true;

            return {
              ...waypoint,
              x: snappedPosition.x,
              y: snappedPosition.y
            };
          });

          if (!didMoveWaypoint) {
            return edge;
          }

          return {
            ...edge,
            data: {
              ...normalizedData,
              layout: normalizeEdgeLayout({ waypoints: nextWaypoints })
            }
          };
        })
      );
    },
    [setEdges]
  );

  const removeEdgeWaypoint = useCallback(
    (edgeId, waypointId) => {
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          if (edge.id !== edgeId) {
            return edge;
          }

          const normalizedData = normalizeCanvasEdgeData(edge.data);
          const nextWaypoints = normalizedData.layout.waypoints.filter(
            (waypoint) => waypoint.id !== waypointId
          );

          if (nextWaypoints.length === normalizedData.layout.waypoints.length) {
            return edge;
          }

          return {
            ...edge,
            data: {
              ...normalizedData,
              layout: normalizeEdgeLayout({ waypoints: nextWaypoints })
            }
          };
        })
      );
    },
    [setEdges]
  );

  const beginMovingRoutedEdges = useCallback(
    (movingNodes) => {
      if (!Array.isArray(movingNodes) || movingNodes.length === 0) {
        return;
      }

      const movingNodeIdSet = new Set(movingNodes.map((node) => node.id));
      const baseWaypointsByEdgeId = {};

      edges.forEach((edge) => {
        if (
          movingNodeIdSet.has(edge.source) &&
          movingNodeIdSet.has(edge.target)
        ) {
          const waypoints = getEdgeWaypoints(edge);

          if (waypoints.length > 0) {
            baseWaypointsByEdgeId[edge.id] = waypoints;
          }
        }
      });

      movingEdgeLayoutRef.current = {
        sessionKey: createMovingNodeSessionKey(movingNodes),
        initialPositionsByNodeId: Object.fromEntries(
          movingNodes.map((node) => [
            node.id,
            { x: node.position.x, y: node.position.y }
          ])
        ),
        baseWaypointsByEdgeId,
        lastDelta: { x: 0, y: 0 }
      };
    },
    [edges]
  );

  const updateMovingRoutedEdges = useCallback(
    (movingNodes) => {
      if (!Array.isArray(movingNodes) || movingNodes.length === 0) {
        return;
      }

      const sessionKey = createMovingNodeSessionKey(movingNodes);

      if (movingEdgeLayoutRef.current?.sessionKey !== sessionKey) {
        beginMovingRoutedEdges(movingNodes);
      }

      const movingLayoutSession = movingEdgeLayoutRef.current;

      if (!movingLayoutSession) {
        return;
      }

      const nextDelta = deriveSharedMovementDelta(
        movingLayoutSession.initialPositionsByNodeId,
        movingNodes
      );

      if (
        nextDelta === null ||
        (movingLayoutSession.lastDelta.x === nextDelta.x &&
          movingLayoutSession.lastDelta.y === nextDelta.y)
      ) {
        return;
      }

      if (Object.keys(movingLayoutSession.baseWaypointsByEdgeId).length > 0) {
        setEdges((currentEdges) =>
          currentEdges.map((edge) => {
            const baseWaypoints = movingLayoutSession.baseWaypointsByEdgeId[edge.id];

            if (!baseWaypoints) {
              return edge;
            }

            const normalizedData = normalizeCanvasEdgeData(edge.data);

            return {
              ...edge,
              data: {
                ...normalizedData,
                layout: normalizeEdgeLayout({
                  waypoints: translateEdgeWaypoints(baseWaypoints, nextDelta)
                })
              }
            };
          })
        );
      }

      movingLayoutSession.lastDelta = nextDelta;
    },
    [beginMovingRoutedEdges, setEdges]
  );

  const finishMovingRoutedEdges = useCallback(
    (movingNodes) => {
      updateMovingRoutedEdges(movingNodes);
      movingEdgeLayoutRef.current = null;
    },
    [updateMovingRoutedEdges]
  );

  const handleNodeDragStart = useCallback(
    (_event, _node, movingNodes) => {
      beginMovingRoutedEdges(movingNodes);
    },
    [beginMovingRoutedEdges]
  );

  const handleNodeDrag = useCallback(
    (_event, _node, movingNodes) => {
      updateMovingRoutedEdges(movingNodes);
    },
    [updateMovingRoutedEdges]
  );

  const handleNodeDragStop = useCallback(
    (_event, _node, movingNodes) => {
      finishMovingRoutedEdges(movingNodes);
    },
    [finishMovingRoutedEdges]
  );

  const handleSelectionDragStart = useCallback(
    (_event, movingNodes) => {
      beginMovingRoutedEdges(movingNodes);
    },
    [beginMovingRoutedEdges]
  );

  const handleSelectionDrag = useCallback(
    (_event, movingNodes) => {
      updateMovingRoutedEdges(movingNodes);
    },
    [updateMovingRoutedEdges]
  );

  const handleSelectionDragStop = useCallback(
    (_event, movingNodes) => {
      finishMovingRoutedEdges(movingNodes);
    },
    [finishMovingRoutedEdges]
  );

  const renderNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...normalizeNodeData(node),
          powerState: powerStateByNodeId[node.id] ?? "Dead",
          powerFlags: powerFlagsByNodeId[node.id],
          sourceIds: sourceIdsByNodeId[node.id] ?? [],
          propagatingVoltages: propagatingVoltagesByNodeId[node.id] ?? [],
          onRenameLabel: (nextLabel) => renameNodeLabel(node.id, nextLabel),
          onToggleSourceOnline:
            isSourceNodeType(node.type)
              ? () => handleSourceToggleRequest(node.id)
              : undefined,
          onChangeSyncGroup: isSourceNodeType(node.type)
            ? (nextSyncGroup) => changeNodeSyncGroup(node.id, nextSyncGroup)
            : undefined,
          onChangeActiveSource: isTransferSwitchNodeType(node.type)
            ? (nextActiveSource) =>
                handleTransferSwitchThrowRequest(node.id, nextActiveSource)
            : undefined,
          onOpenProperties: () => openNodeProperties(node.id),
          onDeleteNode: () => {
            void handleDeleteNodeRequest(node.id);
          }
        }
      })),
    [
      nodes,
      powerStateByNodeId,
      powerFlagsByNodeId,
      sourceIdsByNodeId,
      propagatingVoltagesByNodeId,
      renameNodeLabel,
      handleSourceToggleRequest,
      changeNodeSyncGroup,
      handleTransferSwitchThrowRequest,
      openNodeProperties,
      handleDeleteNodeRequest
    ]
  );

  const renderEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        selectable: false,
        selected: edge.id === selectedEdgeId,
        data: {
          ...normalizeCanvasEdgeData(edge.data),
          powerState:
            edgePowerStateByEdgeId[edge.id] ?? EDGE_POWER_STATE.DE_ENERGIZED,
          onAddWaypoint: (insertIndex, position) => {
            addEdgeWaypoint(edge.id, insertIndex, position);
          },
          onMoveWaypoint: (waypointId, position) => {
            moveEdgeWaypoint(edge.id, waypointId, position);
          },
          onRemoveWaypoint: (waypointId) => {
            removeEdgeWaypoint(edge.id, waypointId);
          },
          onToggleBreaker:
            normalizeCanvasEdgeType(edge.type) === EDGE_TYPE.BREAKER
              ? () => {
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
                }
              : undefined,
          onDeleteEdge: () => {
            void handleDeleteEdgeRequest(edge.id);
          }
        }
      })),
    [
      edges,
      selectedEdgeId,
      edgePowerStateByEdgeId,
      addEdgeWaypoint,
      moveEdgeWaypoint,
      removeEdgeWaypoint,
      isRecordingMop,
      applyBreakerState,
      handleDeleteEdgeRequest
    ]
  );

  const onConnect = useCallback(
    (connection) => {
      const nextEdgeType = edgeDrawMode;
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            type: nextEdgeType,
            data: getDefaultEdgeData(nextEdgeType)
          },
          currentEdges
        )
      );
    },
    [edgeDrawMode, setEdges]
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
        setActivePropertiesNodeId(null);
        setSelectedEdgeId(null);
        movingEdgeLayoutRef.current = null;
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
    setActivePropertiesNodeId(null);
    setSelectedEdgeId(null);
    movingEdgeLayoutRef.current = null;
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

      const position = snapCanvasPoint(
        reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY
        })
      );
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
    (_event, edge) => {
      setSelectedEdgeId(edge.id);
    },
    []
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: edgeDrawMode,
      selectable: false,
      data: getDefaultEdgeData(edgeDrawMode)
    }),
    [edgeDrawMode]
  );

  const activePropertiesNode = useMemo(
    () => nodes.find((node) => node.id === activePropertiesNodeId) ?? null,
    [nodes, activePropertiesNodeId]
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
          edgeDrawMode={edgeDrawMode}
          onChangeEdgeDrawMode={setEdgeDrawMode}
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
            onConnect={onConnect}
            onPaneClick={() => {
              setSelectedEdgeId(null);
            }}
            onNodeClick={() => {
              setSelectedEdgeId(null);
            }}
            onSelectionChange={({ nodes: selectedNodes }) => {
              if (selectedNodes.length > 0) {
                setSelectedEdgeId(null);
              }
            }}
            onEdgeClick={onEdgeClick}
            onNodeDragStart={handleNodeDragStart}
            onNodeDrag={handleNodeDrag}
            onNodeDragStop={handleNodeDragStop}
            onSelectionDragStart={handleSelectionDragStart}
            onSelectionDrag={handleSelectionDrag}
            onSelectionDragStop={handleSelectionDragStop}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            defaultEdgeOptions={defaultEdgeOptions}
            deleteKeyCode={["Delete", "Backspace"]}
            selectionOnDrag
            selectionMode={SelectionMode.Full}
            selectionKeyCode="Shift"
            multiSelectionKeyCode="Shift"
            panActivationKeyCode="Space"
            panOnDrag={[1]}
            snapToGrid
            snapGrid={CANVAS_SNAP_GRID}
            minZoom={0.2}
            maxZoom={1.8}
            className="bg-slate-950"
          >
            <Background gap={CANVAS_GRID_SIZE} size={1} color="#334155" />
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
            OneLine-Canvas Phase 15 Voltage Reality Check
          </div>
        </div>
      </div>

      {activePropertiesNode ? (
        <NodePropertiesModal
          node={activePropertiesNode}
          onApply={applyNodeProperties}
          onClose={closeNodeProperties}
        />
      ) : null}
    </div>
  );
}

export default App;
