import { useEffect, useMemo, useRef } from "react";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import { normalizeNodeData } from "../nodes/nodeData";
import { normalizeVoltageValue } from "../electrical/voltage";
import { isTransferSwitchNodeType } from "../topology/transferSwitch";
import { deriveGeneratorAutoStartNodeIds } from "./generatorAutomation";

function useGeneratorAutomation({
  nodes,
  transferSwitchSenseByNodeId,
  transferSwitchSupplyByNodeId,
  onStartGenerators
}) {
  const onStartGeneratorsRef = useRef(onStartGenerators);
  const lastRequestSignatureRef = useRef("");

  useEffect(() => {
    onStartGeneratorsRef.current = onStartGenerators;
  }, [onStartGenerators]);

  const generatorControlById = useMemo(
    () =>
      Object.fromEntries(
        nodes
          .filter((node) => node.type === "generator")
          .map((node) => {
            const nodeData = normalizeNodeData(node);
            return [
              node.id,
              {
                controlMode: nodeData.controlMode,
                isSourceOnline: nodeData.isSourceOnline !== false
              }
            ];
          })
      ),
    [nodes]
  );

  const transferSwitchSnapshots = useMemo(
    () =>
      nodes
        .filter((node) => isTransferSwitchNodeType(node.type))
        .map((node) => {
          const nodeData = normalizeNodeData(node);
          const transferSwitchSense = transferSwitchSenseByNodeId[node.id] ?? {};
          const transferSwitchSupply = transferSwitchSupplyByNodeId[node.id] ?? {};

          return {
            nodeId: node.id,
            nominalVoltage: normalizeVoltageValue(nodeData.nominalVoltage, 0),
            activeSource: nodeData.activeSource,
            controlMode: nodeData.controlMode,
            primarySenseState:
              transferSwitchSense.primary?.powerState ?? NODE_POWER_STATE.DEAD,
            emergencySenseState:
              transferSwitchSense.emergency?.powerState ?? NODE_POWER_STATE.DEAD,
            emergencySupplyCandidates: (transferSwitchSupply.emergency ?? []).map(
              (candidate) => ({
                ...candidate,
                controlMode: generatorControlById[candidate.nodeId]?.controlMode,
                isSourceOnline: generatorControlById[candidate.nodeId]?.isSourceOnline
              })
            )
          };
        }),
    [nodes, transferSwitchSenseByNodeId, transferSwitchSupplyByNodeId, generatorControlById]
  );

  const generatorNodeIdsToStart = useMemo(
    () => deriveGeneratorAutoStartNodeIds(transferSwitchSnapshots),
    [transferSwitchSnapshots]
  );

  useEffect(() => {
    const nextRequestSignature = generatorNodeIdsToStart.join("|");

    if (nextRequestSignature === "") {
      lastRequestSignatureRef.current = "";
      return;
    }

    if (nextRequestSignature === lastRequestSignatureRef.current) {
      return;
    }

    lastRequestSignatureRef.current = nextRequestSignature;
    onStartGeneratorsRef.current?.(generatorNodeIdsToStart);
  }, [generatorNodeIdsToStart]);
}

export default useGeneratorAutomation;
