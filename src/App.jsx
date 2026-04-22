import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  applyNodeChanges,
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
import UpsNode from "./nodes/UpsNode";
import MechanicalNode from "./nodes/MechanicalNode";
import BreakerEdge from "./edges/BreakerEdge";
import StandardEdge from "./edges/StandardEdge";
import { getDefaultEdgeData, normalizeEdgeData } from "./edges/edgeData";
import usePowerFlow from "./hooks/usePowerFlow";
import { EDGE_POWER_STATE } from "./engine/powerFlow";
import { BREAKER_STATE, EDGE_DEVICE_KIND, TRIP_REASON } from "./engine/protectionModel";
import EquipmentPalette, { DRAG_MIME_TYPE } from "./components/EquipmentPalette";
import ScadaPanel from "./components/ScadaPanel";
import EdgePropertiesModal from "./components/EdgePropertiesModal";
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
  formatUpsOperatingMode,
  isUpsNodeType,
  normalizeUpsOperatingMode
} from "./topology/ups";
import {
  EDGE_TYPE,
  normalizeCanvasEdgeType
} from "./topology/edgeTypes";
import { translateEdgesForRigidNodeMove } from "./topology/edgePathOptions";
import { CANVAS_GRID_SIZE, CANVAS_SNAP_GRID } from "./canvas/grid";
import { createPastedSubgraph, extractSelectedSubgraph } from "./canvas/clipboard";

const nodeTypes = {
  utility: UtilityNode,
  generator: GeneratorNode,
  mvsg: MVSGNode,
  ptx: PTXNode,
  load: LoadNode,
  switchboard: SwitchboardNode,
  transferSwitch: TransferSwitchNode,
  ups: UpsNode,
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
  SET_UPS_MODE: "SET_UPS_MODE",
  DELETE_NODE: "DELETE_NODE",
  DELETE_EDGE: "DELETE_EDGE"
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

  if (actionType === MOP_ACTION_TYPE.THROW_TRANSFER_SWITCH) {
    return normalizeTransferSwitchActiveSource(targetState);
  }

  if (actionType === MOP_ACTION_TYPE.SET_UPS_MODE) {
    return normalizeUpsOperatingMode(targetState);
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

  if (actionType === MOP_ACTION_TYPE.SET_UPS_MODE) {
    return `Set ${targetId} to ${formatUpsOperatingMode(targetState)}`;
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
          step.actionType !== MOP_ACTION_TYPE.SET_UPS_MODE &&
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

function isEditableEventTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.closest("[contenteditable='true']") !== null ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function getMovedNodeDeltasById(changes, currentNodes) {
  if (!Array.isArray(changes) || !Array.isArray(currentNodes) || currentNodes.length === 0) {
    return new Map();
  }

  const nodeById = new Map(currentNodes.map((node) => [node.id, node]));
  const movedNodeDeltasById = new Map();

  changes.forEach((change) => {
    if (change.type !== "position") {
      return;
    }

    const currentNode = nodeById.get(change.id);
    const nextPosition = change.position ?? change.positionAbsolute;

    if (!currentNode || !nextPosition) {
      return;
    }

    const delta = {
      x: nextPosition.x - currentNode.position.x,
      y: nextPosition.y - currentNode.position.y
    };

    if (
      !Number.isFinite(delta.x) ||
      !Number.isFinite(delta.y) ||
      (delta.x === 0 && delta.y === 0)
    ) {
      return;
    }

    movedNodeDeltasById.set(change.id, delta);
  });

  return movedNodeDeltasById;
}

function App() {
  const initialGraph = useMemo(() => readGraphStateFromStorage(), []);
  const [nodes, setNodes] = useNodesState(initialGraph.nodes);
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
  const [activePropertiesEdgeId, setActivePropertiesEdgeId] = useState(null);
  const reactFlowInstanceRef = useRef(null);
  const canvasPaneRef = useRef(null);
  const clipboardSnapshotRef = useRef(null);
  const importInputRef = useRef(null);
  const nodesRef = useRef(initialGraph.nodes);
  const lastCanvasPointerFlowPositionRef = useRef(null);
  const lastPasteAnchorKeyRef = useRef(null);
  const repeatedPasteCountRef = useRef(0);
  const skipNextAutosaveRef = useRef(false);
  const {
    powerStateByNodeId,
    powerFlagsByNodeId,
    sourceIdsByNodeId,
    fedFromNodeIdByNodeId,
    propagatingVoltagesByNodeId,
    edgePowerStateByEdgeId,
    faultSummaries,
    protectionTripEdgeIds,
    faultedEdgeIds
  } =
    usePowerFlow(nodes, edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

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
    if (!protectionTripEdgeIds || protectionTripEdgeIds.length === 0) {
      return;
    }

    const protectionTripEdgeIdSet = new Set(protectionTripEdgeIds);

    setEdges((currentEdges) => {
      let didTripAnyEdge = false;

      const nextEdges = currentEdges.map((edge) => {
        if (!protectionTripEdgeIdSet.has(edge.id)) {
          return edge;
        }

        const normalizedEdgeData = normalizeEdgeData(edge);

        if (normalizedEdgeData.breakerState !== BREAKER_STATE.CLOSED) {
          return edge;
        }

        didTripAnyEdge = true;

        return {
          ...edge,
          data: {
            ...normalizedEdgeData,
            breakerState: BREAKER_STATE.TRIPPED,
            tripReason: TRIP_REASON.PROTECTION
          }
        };
      });

      return didTripAnyEdge ? nextEdges : currentEdges;
    });
  }, [protectionTripEdgeIds, setEdges]);

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
    if (!activePropertiesEdgeId) {
      return;
    }

    const activeEdgeStillExists = edges.some((edge) => edge.id === activePropertiesEdgeId);

    if (!activeEdgeStillExists) {
      setActivePropertiesEdgeId(null);
    }
  }, [edges, activePropertiesEdgeId]);

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

  const applyUpsOperatingMode = useCallback(
    (nodeId, nextOperatingMode) => {
      const normalizedNextOperatingMode = normalizeUpsOperatingMode(nextOperatingMode);

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId || !isUpsNodeType(node.type)) {
            return node;
          }

          const nodeData = normalizeNodeData(node);

          if (nodeData.operatingMode === normalizedNextOperatingMode) {
            return node;
          }

          return {
            ...node,
            data: {
              ...nodeData,
              operatingMode: normalizedNextOperatingMode
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

  const openEdgeProperties = useCallback((edgeId) => {
    setActivePropertiesEdgeId(edgeId);
  }, []);

  const closeNodeProperties = useCallback(() => {
    setActivePropertiesNodeId(null);
  }, []);

  const closeEdgeProperties = useCallback(() => {
    setActivePropertiesEdgeId(null);
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

  const applyEdgeProperties = useCallback(
    (edgeId, nextProperties) => {
      setEdges((currentEdges) =>
        currentEdges.map((currentEdge) => {
          if (currentEdge.id !== edgeId) {
            return currentEdge;
          }

          return {
            ...currentEdge,
            data: {
              ...normalizeEdgeData(currentEdge),
              ...nextProperties
            }
          };
        })
      );
      setActivePropertiesEdgeId(null);
    },
    [setEdges]
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
    (edgeId, nextState, nextTripReason = TRIP_REASON.NONE) => {
      setEdges((currentEdges) =>
        currentEdges.map((currentEdge) => {
          if (currentEdge.id !== edgeId) {
            return currentEdge;
          }

          const normalizedEdgeData = normalizeEdgeData(currentEdge);

          return {
            ...currentEdge,
            data: {
              ...normalizedEdgeData,
              breakerState: nextState,
              tripReason:
                nextState === BREAKER_STATE.TRIPPED ? nextTripReason : TRIP_REASON.NONE
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

  const handleUpsOperatingModeRequest = useCallback(
    (nodeId, nextOperatingMode) => {
      const upsNode = nodes.find((node) => node.id === nodeId);

      if (!upsNode || !isUpsNodeType(upsNode.type)) {
        return;
      }

      const upsNodeData = normalizeNodeData(upsNode);
      const normalizedNextOperatingMode = normalizeUpsOperatingMode(nextOperatingMode);

      if (upsNodeData.operatingMode === normalizedNextOperatingMode) {
        return;
      }

      if (isRecordingMop) {
        setPendingMopAction({
          targetId: nodeId,
          actionType: MOP_ACTION_TYPE.SET_UPS_MODE,
          targetState: normalizedNextOperatingMode,
          actionText: `Set ${upsNodeData.label} to ${formatUpsOperatingMode(
            normalizedNextOperatingMode
          )}`
        });
      }

      applyUpsOperatingMode(nodeId, normalizedNextOperatingMode);
    },
    [nodes, isRecordingMop, applyUpsOperatingMode]
  );

  const resetAllTrippedBreakers = useCallback(() => {
    setEdges((currentEdges) => {
      let didResetAnyEdge = false;

      const nextEdges = currentEdges.map((edge) => {
        const normalizedEdgeData = normalizeEdgeData(edge);

        if (normalizedEdgeData.breakerState !== BREAKER_STATE.TRIPPED) {
          return edge;
        }

        didResetAnyEdge = true;

        return {
          ...edge,
          data: {
            ...normalizedEdgeData,
            breakerState: BREAKER_STATE.OPEN,
            tripReason: TRIP_REASON.NONE
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

  const captureCanvasPointerPosition = useCallback((clientX, clientY) => {
    const reactFlowInstance = reactFlowInstanceRef.current;

    if (!reactFlowInstance) {
      return;
    }

    lastCanvasPointerFlowPositionRef.current = reactFlowInstance.screenToFlowPosition(
      { x: clientX, y: clientY },
      {
        snapToGrid: true,
        snapGrid: CANVAS_SNAP_GRID
      }
    );
  }, []);

  const handleCanvasPointerActivity = useCallback(
    (event) => {
      captureCanvasPointerPosition(event.clientX, event.clientY);
    },
    [captureCanvasPointerPosition]
  );

  const resolvePasteAnchorPosition = useCallback(() => {
    if (lastCanvasPointerFlowPositionRef.current) {
      return lastCanvasPointerFlowPositionRef.current;
    }

    const reactFlowInstance = reactFlowInstanceRef.current;
    const canvasPane = canvasPaneRef.current;

    if (!reactFlowInstance || !canvasPane) {
      return null;
    }

    const canvasBounds = canvasPane.getBoundingClientRect();

    return reactFlowInstance.screenToFlowPosition(
      {
        x: canvasBounds.left + canvasBounds.width / 2,
        y: canvasBounds.top + canvasBounds.height / 2
      },
      {
        snapToGrid: true,
        snapGrid: CANVAS_SNAP_GRID
      }
    );
  }, []);

  const copySelectedSubgraph = useCallback(() => {
    const clipboardSnapshot = extractSelectedSubgraph(nodes, edges);

    if (!clipboardSnapshot) {
      return false;
    }

    clipboardSnapshotRef.current = clipboardSnapshot;
    lastPasteAnchorKeyRef.current = null;
    repeatedPasteCountRef.current = 0;
    return true;
  }, [nodes, edges]);

  const pasteClipboardSubgraph = useCallback(() => {
    const clipboardSnapshot = clipboardSnapshotRef.current;
    const pasteAnchorPosition = resolvePasteAnchorPosition();

    if (!clipboardSnapshot || !pasteAnchorPosition) {
      return false;
    }

    const pasteAnchorKey = `${pasteAnchorPosition.x}:${pasteAnchorPosition.y}`;

    if (lastPasteAnchorKeyRef.current === pasteAnchorKey) {
      repeatedPasteCountRef.current += 1;
    } else {
      lastPasteAnchorKeyRef.current = pasteAnchorKey;
      repeatedPasteCountRef.current = 0;
    }

    const pastedGraph = createPastedSubgraph(clipboardSnapshot, {
      anchorPosition: pasteAnchorPosition,
      pasteOffset: {
        x: repeatedPasteCountRef.current * CANVAS_GRID_SIZE,
        y: repeatedPasteCountRef.current * CANVAS_GRID_SIZE
      },
      snapGrid: CANVAS_SNAP_GRID,
      createNodeId: (node) => `${node.type}-${crypto.randomUUID()}`,
      createEdgeId: (edge) => `${edge.type ?? "edge"}-${crypto.randomUUID()}`
    });

    if (!pastedGraph) {
      return false;
    }

    const normalizedPastedGraph = normalizeGraphState(pastedGraph);

    setActivePropertiesNodeId(null);
    setNodes((currentNodes) =>
      currentNodes
        .map((node) => ({
          ...node,
          selected: false
        }))
        .concat(normalizedPastedGraph.nodes)
    );
    setEdges((currentEdges) =>
      currentEdges
        .map((edge) => ({
          ...edge,
          selected: false
        }))
        .concat(normalizedPastedGraph.edges)
    );

    return true;
  }, [resolvePasteAnchorPosition, setEdges, setNodes]);

  const handleNodesChange = useCallback(
    (changes) => {
      const currentNodes = nodesRef.current;
      const movedNodeDeltasById = getMovedNodeDeltasById(changes, currentNodes);
      const nextNodes = applyNodeChanges(changes, currentNodes);

      nodesRef.current = nextNodes;
      setNodes(nextNodes);

      if (movedNodeDeltasById.size === 0) {
        return;
      }

      setEdges((currentEdges) =>
        translateEdgesForRigidNodeMove(
          currentEdges,
          movedNodeDeltasById,
          CANVAS_SNAP_GRID
        )
      );
    },
    [setEdges, setNodes]
  );

  useEffect(() => {
    const handleWindowKeyDown = (event) => {
      if (event.altKey || isEditableEventTarget(event.target)) {
        return;
      }

      const normalizedKey = event.key.toLowerCase();
      const isPrimaryModifierPressed = event.ctrlKey || event.metaKey;

      if (!isPrimaryModifierPressed || (normalizedKey !== "c" && normalizedKey !== "v")) {
        return;
      }

      if (normalizedKey === "c") {
        if (copySelectedSubgraph()) {
          event.preventDefault();
        }

        return;
      }

      if (pasteClipboardSubgraph()) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [copySelectedSubgraph, pasteClipboardSubgraph]);

  const renderNodes = useMemo(() => {
    const normalizedNodeDataById = new Map(
      nodes.map((node) => [node.id, normalizeNodeData(node)])
    );

    return nodes.map((node) => {
      const normalizedNodeData = normalizedNodeDataById.get(node.id);
      const fedFromNodeId = fedFromNodeIdByNodeId[node.id];
      const fedFromLabel = normalizedNodeDataById.get(fedFromNodeId)?.label ?? null;

      return {
        ...node,
        data: {
          ...normalizedNodeData,
          powerState: powerStateByNodeId[node.id] ?? "Dead",
          powerFlags: powerFlagsByNodeId[node.id],
          sourceIds: sourceIdsByNodeId[node.id] ?? [],
          fedFromLabel:
            typeof fedFromLabel === "string" && fedFromLabel.trim() !== ""
              ? fedFromLabel
              : null,
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
          onChangeOperatingMode: isUpsNodeType(node.type)
            ? (nextOperatingMode) =>
                handleUpsOperatingModeRequest(node.id, nextOperatingMode)
            : undefined,
          onOpenProperties: () => openNodeProperties(node.id),
          onDeleteNode: () => {
            void handleDeleteNodeRequest(node.id);
          }
        }
      };
    });
  }, [
    nodes,
    powerStateByNodeId,
    powerFlagsByNodeId,
    sourceIdsByNodeId,
    fedFromNodeIdByNodeId,
    propagatingVoltagesByNodeId,
    renameNodeLabel,
    handleSourceToggleRequest,
    changeNodeSyncGroup,
    handleTransferSwitchThrowRequest,
    handleUpsOperatingModeRequest,
    openNodeProperties,
    handleDeleteNodeRequest
  ]);

  const renderEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        data: {
          ...normalizeEdgeData(edge),
          powerState:
            edgePowerStateByEdgeId[edge.id] ?? EDGE_POWER_STATE.DE_ENERGIZED,
          onOpenProperties: () => openEdgeProperties(edge.id),
          onDeleteEdge: () => {
            void handleDeleteEdgeRequest(edge.id);
          }
        }
      })),
    [edges, edgePowerStateByEdgeId, handleDeleteEdgeRequest, openEdgeProperties]
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
        setActivePropertiesEdgeId(null);
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
    setActivePropertiesEdgeId(null);
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
          nodeType !== "ups" &&
          nodeType !== "mechanical")
      ) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition(
        {
          x: event.clientX,
          y: event.clientY
        },
        {
          snapToGrid: true,
          snapGrid: CANVAS_SNAP_GRID
        }
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
    (event, edge) => {
      event.preventDefault();
      event.stopPropagation();

      if (edge.type !== "breaker") {
        return;
      }

      const normalizedEdgeData = normalizeEdgeData(edge);

      if (normalizedEdgeData.deviceKind !== EDGE_DEVICE_KIND.BREAKER) {
        return;
      }

      const nextState = getNextBreakerState(normalizedEdgeData.breakerState);

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

      applyBreakerState(edge.id, nextState, TRIP_REASON.NONE);
    },
    [isRecordingMop, applyBreakerState]
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: edgeDrawMode,
      data: getDefaultEdgeData(edgeDrawMode)
    }),
    [edgeDrawMode]
  );

  const activePropertiesNode = useMemo(
    () => nodes.find((node) => node.id === activePropertiesNodeId) ?? null,
    [nodes, activePropertiesNodeId]
  );
  const nodeLabelById = useMemo(
    () =>
      new Map(nodes.map((node) => [node.id, normalizeNodeData(node).label])),
    [nodes]
  );
  const activePropertiesEdge = useMemo(
    () => edges.find((edge) => edge.id === activePropertiesEdgeId) ?? null,
    [edges, activePropertiesEdgeId]
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
          faultSummaries={faultSummaries}
          protectionTripEdgeIds={protectionTripEdgeIds}
          onToggleSourceOnline={handleSourceToggleRequest}
          onChangeUpsOperatingMode={handleUpsOperatingModeRequest}
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

        <div
          ref={canvasPaneRef}
          className="relative h-full flex-1"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onPointerMove={handleCanvasPointerActivity}
          onPointerDown={handleCanvasPointerActivity}
        >
          <ReactFlow
            nodes={renderNodes}
            edges={renderEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            defaultEdgeOptions={defaultEdgeOptions}
            deleteKeyCode={["Delete", "Backspace"]}
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
      {activePropertiesEdge ? (
        <EdgePropertiesModal
          edge={activePropertiesEdge}
          sourceNodeLabel={nodeLabelById.get(activePropertiesEdge.source) ?? activePropertiesEdge.source}
          targetNodeLabel={nodeLabelById.get(activePropertiesEdge.target) ?? activePropertiesEdge.target}
          onApply={applyEdgeProperties}
          onClose={closeEdgeProperties}
        />
      ) : null}
    </div>
  );
}

export default App;
