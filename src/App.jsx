import { useCallback, useMemo } from "react";
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
import { BREAKER_STATE } from "./engine/powerFlow";

const nodeTypes = {
  utility: UtilityNode,
  mvsg: MVSGNode
};

const edgeTypes = {
  breaker: BreakerEdge
};

function buildInitialSandboxGraph() {
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const viewportHeight =
    typeof window === "undefined" ? 720 : window.innerHeight;
  const verticalCenter = Math.max(140, viewportHeight * 0.45);
  const utilitySourceId = `utility-${crypto.randomUUID()}`;
  const mvsgNodeId = `mvsg-${crypto.randomUUID()}`;

  return {
    nodes: [
      {
        id: utilitySourceId,
        type: "utility",
        position: {
          x: Math.max(120, viewportWidth * 0.18),
          y: verticalCenter
        },
        data: {
          label: "Utility Feed A",
          voltage: "12.47 kV"
        }
      },
      {
        id: mvsgNodeId,
        type: "mvsg",
        position: {
          x: Math.max(420, viewportWidth * 0.48),
          y: verticalCenter
        },
        data: {
          label: "MVSG-01",
          nominalVoltage: "12.47 kV Bus"
        }
      }
    ],
    edges: []
  };
}

function App() {
  const initialGraph = useMemo(() => buildInitialSandboxGraph(), []);
  const [nodes, , onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const { powerStateByNodeId } = usePowerFlow(nodes, edges);

  const renderNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          powerState: powerStateByNodeId[node.id] ?? "Dead"
        }
      })),
    [nodes, powerStateByNodeId]
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

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "breaker"
    }),
    []
  );

  return (
    <div className="fixed inset-0 h-screen w-screen bg-slate-950 font-mono text-slate-100">
      <ReactFlow
        nodes={renderNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
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
        OneLine-Canvas Phase 2 Dynamic Continuity
      </div>
    </div>
  );
}

export default App;
