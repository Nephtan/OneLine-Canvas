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
import { BREAKER_STATE, EDGE_POWER_STATE } from "./engine/powerFlow";

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
  const verticalCenter = Math.max(220, viewportHeight * 0.45);
  const utilityFeedAId = `utility-${crypto.randomUUID()}`;
  const utilityFeedBId = `utility-${crypto.randomUUID()}`;
  const mvsgA1Id = `mvsg-${crypto.randomUUID()}`;
  const mvsgA2Id = `mvsg-${crypto.randomUUID()}`;
  const mvsgB1Id = `mvsg-${crypto.randomUUID()}`;
  const mvsgB2Id = `mvsg-${crypto.randomUUID()}`;

  const leftUtilityX = Math.max(110, viewportWidth * 0.08);
  const firstGearX = Math.max(360, viewportWidth * 0.28);
  const secondGearX = Math.max(680, viewportWidth * 0.52);
  const topRowY = Math.max(110, verticalCenter - 190);
  const bottomRowY = Math.max(290, verticalCenter + 110);

  return {
    nodes: [
      {
        id: utilityFeedAId,
        type: "utility",
        position: {
          x: leftUtilityX,
          y: topRowY
        },
        data: {
          label: "Utility Feed A",
          voltage: "12.47 kV",
          isSourceOnline: true
        }
      },
      {
        id: mvsgA1Id,
        type: "mvsg",
        position: {
          x: firstGearX,
          y: topRowY - 30
        },
        data: {
          label: "MVSG-A1",
          nominalVoltage: "12.47 kV Bus"
        }
      },
      {
        id: mvsgA2Id,
        type: "mvsg",
        position: {
          x: secondGearX,
          y: topRowY - 30
        },
        data: {
          label: "MVSG-A2",
          nominalVoltage: "12.47 kV Tie Bus"
        }
      },
      {
        id: utilityFeedBId,
        type: "utility",
        position: {
          x: leftUtilityX,
          y: bottomRowY
        },
        data: {
          label: "Utility Feed B",
          voltage: "12.47 kV",
          isSourceOnline: true
        }
      },
      {
        id: mvsgB1Id,
        type: "mvsg",
        position: {
          x: firstGearX,
          y: bottomRowY - 30
        },
        data: {
          label: "MVSG-B1",
          nominalVoltage: "12.47 kV Bus"
        }
      },
      {
        id: mvsgB2Id,
        type: "mvsg",
        position: {
          x: secondGearX,
          y: bottomRowY - 30
        },
        data: {
          label: "MVSG-B2",
          nominalVoltage: "12.47 kV Tie Bus"
        }
      }
    ],
    edges: [
      {
        id: `breaker-${crypto.randomUUID()}`,
        type: "breaker",
        source: utilityFeedAId,
        target: mvsgA1Id,
        data: { breakerState: BREAKER_STATE.CLOSED }
      },
      {
        id: `breaker-${crypto.randomUUID()}`,
        type: "breaker",
        source: mvsgA1Id,
        target: mvsgA2Id,
        data: { breakerState: BREAKER_STATE.CLOSED }
      },
      {
        id: `breaker-${crypto.randomUUID()}`,
        type: "breaker",
        source: utilityFeedBId,
        target: mvsgB1Id,
        data: { breakerState: BREAKER_STATE.CLOSED }
      },
      {
        id: `breaker-${crypto.randomUUID()}`,
        type: "breaker",
        source: mvsgB1Id,
        target: mvsgB2Id,
        data: { breakerState: BREAKER_STATE.CLOSED }
      },
      {
        id: `breaker-${crypto.randomUUID()}`,
        type: "breaker",
        source: mvsgA2Id,
        target: mvsgB2Id,
        data: { breakerState: BREAKER_STATE.OPEN }
      }
    ]
  };
}

function App() {
  const initialGraph = useMemo(() => buildInitialSandboxGraph(), []);
  const [nodes, , onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
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
        edges={renderEdges}
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
        OneLine-Canvas Phase 3 Catastrophic Failure Detection
      </div>
    </div>
  );
}

export default App;
