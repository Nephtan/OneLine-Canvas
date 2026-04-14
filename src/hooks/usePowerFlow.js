import { useMemo, useRef } from "react";
import { createTopologyKey, evaluatePowerFlow } from "../engine/powerFlow";

function usePowerFlow(nodes, edges) {
  const topologyKey = useMemo(() => createTopologyKey(nodes, edges), [nodes, edges]);
  const cacheRef = useRef({
    topologyKey: null,
    result: {
      powerStateByNodeId: {},
      sourceIdsByNodeId: {},
      edgePowerStateByEdgeId: {},
      adjacencyByNodeId: {}
    }
  });

  return useMemo(() => {
    if (cacheRef.current.topologyKey === topologyKey) {
      return cacheRef.current.result;
    }

    const nextResult = evaluatePowerFlow(nodes, edges);
    cacheRef.current = {
      topologyKey,
      result: nextResult
    };

    return nextResult;
  }, [topologyKey]);
}

export default usePowerFlow;
