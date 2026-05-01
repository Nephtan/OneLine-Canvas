import { useMemo, useRef } from "react";
import {
  createTopologyKey,
  evaluatePowerFlow,
  evaluateTransferSwitchSense
} from "../engine/powerFlow";
import { evaluateProtectionState } from "../engine/protection";

function usePowerFlow(nodes, edges) {
  const topologyKey = useMemo(() => createTopologyKey(nodes, edges), [nodes, edges]);
  const cacheRef = useRef({
    topologyKey: null,
    result: {
      powerStateByNodeId: {},
      powerFlagsByNodeId: {},
      sourceIdsByNodeId: {},
      sourceIdsByEdgeId: {},
      displaySourceNodeIdsByNodeId: {},
      fedFromNodeIdByNodeId: {},
      propagatingVoltagesByNodeId: {},
      transferSwitchSenseByNodeId: {},
      edgePowerStateByEdgeId: {},
      faultSummaries: [],
      protectionTripEdgeIds: [],
      faultedEdgeIds: [],
      adjacencyByNodeId: {}
    }
  });

  return useMemo(() => {
    if (cacheRef.current.topologyKey === topologyKey) {
      return cacheRef.current.result;
    }

    const powerFlowResult = evaluatePowerFlow(nodes, edges);
    const transferSwitchSenseByNodeId = evaluateTransferSwitchSense(nodes, edges);
    const protectionResult = evaluateProtectionState(nodes, edges, powerFlowResult);
    const nextResult = {
      ...powerFlowResult,
      transferSwitchSenseByNodeId,
      ...protectionResult
    };
    cacheRef.current = {
      topologyKey,
      result: nextResult
    };

    return nextResult;
  }, [topologyKey]);
}

export default usePowerFlow;
