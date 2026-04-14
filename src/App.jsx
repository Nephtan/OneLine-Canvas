import { useCallback, useMemo, useRef } from "react";
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
import MVSGNode from "./nodes/MVSGNode";
import BreakerEdge from "./edges/BreakerEdge";
import usePowerFlow from "./hooks/usePowerFlow";
import { BREAKER_STATE, EDGE_POWER_STATE } from "./engine/powerFlow";
import EquipmentPalette, { DRAG_MIME_TYPE } from "./components/EquipmentPalette";

const nodeTypes = {
  utility: UtilityNode,
  mvsg: MVSGNode
};

const edgeTypes = {
  breaker: BreakerEdge
};

function App() {
  const initialGraph = useMemo(
    () => ({
      nodes: [],
      edges: []
    }),
    []
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const reactFlowInstanceRef = useRef(null);
  const { powerStateByNodeId, sourceIdsByNodeId, edgePowerStateByEdgeId } =
    usePowerFlow(nodes, edges);

  const renderNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          powerState: powerStateByNodeId[node.id] ?? "Dead",
          sourceIds: sourceIdsByNodeId[node.id] ?? []
        }
      })),
    [nodes, powerStateByNodeId, sourceIdsByNodeId]
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

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData(DRAG_MIME_TYPE);
      const reactFlowInstance = reactFlowInstanceRef.current;

      if (!reactFlowInstance || (nodeType !== "utility" && nodeType !== "mvsg")) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });
      const nodeUuid = crypto.randomUUID();
      const nodeId = `${nodeType}-${nodeUuid}`;
      const nodeLabelSuffix = nodeUuid.slice(0, 4).toUpperCase();
      const nodeData =
        nodeType === "utility"
          ? {
              label: `Utility ${nodeLabelSuffix}`,
              voltage: "12.47 kV",
              isSourceOnline: true
            }
          : {
              label: `MVSG ${nodeLabelSuffix}`,
              nominalVoltage: "12.47 kV Bus"
            };

      setNodes((currentNodes) =>
        currentNodes.concat({
          id: nodeId,
          type: nodeType,
          position,
          data: nodeData
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
            currentEdge.data?.breakerState === BREAKER_STATE.CLOSED
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
      <div className="flex h-full w-full overflow-hidden">
        <EquipmentPalette onDragStart={onDragStart} />

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
            OneLine-Canvas Phase 4 Equipment Sandbox
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
