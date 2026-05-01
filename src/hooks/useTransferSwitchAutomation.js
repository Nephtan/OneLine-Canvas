import { useEffect, useMemo, useRef, useState } from "react";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import {
  isTransferSwitchNodeType,
  normalizeNodeData
} from "../nodes/nodeData";
import { createTransferSwitchAutomationController } from "./transferSwitchAutomation";

function hasPendingTransferSwitchAutomation(pendingSnapshotByNodeId) {
  return Object.keys(pendingSnapshotByNodeId).length > 0;
}

function createTransferSwitchAutomationState(pendingSnapshotByNodeId, nowMs) {
  return Object.fromEntries(
    Object.entries(pendingSnapshotByNodeId).map(([nodeId, pendingSnapshot]) => {
      const remainingMs = Math.max(0, pendingSnapshot.dueAtMs - nowMs);

      return [
        nodeId,
        {
          ...pendingSnapshot,
          remainingMs,
          remainingSeconds: Math.ceil(remainingMs / 1000)
        }
      ];
    })
  );
}

function useTransferSwitchAutomation({
  nodes,
  transferSwitchSenseByNodeId,
  onThrow
}) {
  const onThrowRef = useRef(onThrow);
  const controllerRef = useRef(null);
  const [pendingSnapshotByNodeId, setPendingSnapshotByNodeId] = useState({});
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    onThrowRef.current = onThrow;
  }, [onThrow]);

  if (controllerRef.current === null) {
    controllerRef.current = createTransferSwitchAutomationController({
      onThrow: (...args) => {
        onThrowRef.current?.(...args);
      },
      onPendingChange: setPendingSnapshotByNodeId
    });
  }

  const transferSwitchSnapshots = useMemo(
    () =>
      nodes
        .filter((node) => isTransferSwitchNodeType(node.type))
        .map((node) => {
          const nodeData = normalizeNodeData(node);
          const transferSwitchSense = transferSwitchSenseByNodeId[node.id] ?? {};

          return {
            nodeId: node.id,
            activeSource: nodeData.activeSource,
            controlMode: nodeData.controlMode,
            retransferPolicy: nodeData.retransferPolicy,
            transferDelaySeconds: nodeData.transferDelaySeconds,
            retransferDelaySeconds: nodeData.retransferDelaySeconds,
            primarySenseState:
              transferSwitchSense.primary?.powerState ?? NODE_POWER_STATE.DEAD,
            emergencySenseState:
              transferSwitchSense.emergency?.powerState ?? NODE_POWER_STATE.DEAD
          };
        }),
    [nodes, transferSwitchSenseByNodeId]
  );

  useEffect(() => {
    controllerRef.current?.sync(transferSwitchSnapshots);
  }, [transferSwitchSnapshots]);

  useEffect(
    () => () => {
      controllerRef.current?.dispose();
    },
    []
  );

  useEffect(() => {
    if (!hasPendingTransferSwitchAutomation(pendingSnapshotByNodeId)) {
      return undefined;
    }

    setNowMs(Date.now());

    const intervalId = globalThis.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [pendingSnapshotByNodeId]);

  const pendingByNodeId = useMemo(
    () => createTransferSwitchAutomationState(pendingSnapshotByNodeId, nowMs),
    [pendingSnapshotByNodeId, nowMs]
  );

  return {
    pendingByNodeId
  };
}

export default useTransferSwitchAutomation;
