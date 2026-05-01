import { useEffect, useMemo, useRef } from "react";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import { isUpsNodeType, normalizeUpsOperatingMode } from "../topology/ups";
import { normalizeNodeData } from "../nodes/nodeData";
import { createUpsAutomationController } from "./upsAutomation";

function useUpsAutomation({ nodes, upsSenseByNodeId, onModeChange }) {
  const onModeChangeRef = useRef(onModeChange);
  const controllerRef = useRef(null);

  useEffect(() => {
    onModeChangeRef.current = onModeChange;
  }, [onModeChange]);

  if (controllerRef.current === null) {
    controllerRef.current = createUpsAutomationController({
      onModeChange: (...args) => {
        onModeChangeRef.current?.(...args);
      }
    });
  }

  const upsSnapshots = useMemo(
    () =>
      nodes
        .filter((node) => isUpsNodeType(node.type))
        .map((node) => {
          const nodeData = normalizeNodeData(node);

          return {
            nodeId: node.id,
            controlMode: nodeData.controlMode,
            operatingMode: normalizeUpsOperatingMode(nodeData.operatingMode),
            batteryAvailable: nodeData.batteryAvailable !== false,
            inputSenseState: upsSenseByNodeId[node.id]?.input ?? NODE_POWER_STATE.DEAD
          };
        }),
    [nodes, upsSenseByNodeId]
  );

  useEffect(() => {
    controllerRef.current?.sync(upsSnapshots);
  }, [upsSnapshots]);

  useEffect(
    () => () => {
      controllerRef.current?.dispose();
    },
    []
  );
}

export default useUpsAutomation;
