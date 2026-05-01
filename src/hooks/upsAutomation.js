import { NODE_POWER_STATE } from "../engine/powerFlow";
import {
  AUTOMATION_CONTROL_MODE,
  normalizeAutomationControlMode
} from "../topology/automationControl";
import {
  UPS_OPERATING_MODE,
  normalizeUpsOperatingMode
} from "../topology/ups";

function isInputLive(inputSenseState) {
  return inputSenseState === NODE_POWER_STATE.LIVE;
}

export function collectUpsSyncGroupTargetIds(nodes, targetNodeId, normalizeSyncGroup) {
  const targetNode = (Array.isArray(nodes) ? nodes : []).find((node) => node.id === targetNodeId);

  if (!targetNode || targetNode.type !== "ups") {
    return [];
  }

  const targetSyncGroup = normalizeSyncGroup(targetNode.data?.syncGroup);

  if (!targetSyncGroup) {
    return [targetNodeId];
  }

  return (Array.isArray(nodes) ? nodes : [])
    .filter(
      (node) =>
        node.type === "ups" && normalizeSyncGroup(node.data?.syncGroup) === targetSyncGroup
    )
    .map((node) => node.id)
    .sort();
}

export function deriveUpsAutomationDecision(upsSnapshot, previousState = null) {
  if (
    normalizeAutomationControlMode(upsSnapshot?.controlMode) !==
    AUTOMATION_CONTROL_MODE.AUTO
  ) {
    return null;
  }

  const operatingMode = normalizeUpsOperatingMode(upsSnapshot?.operatingMode);

  if (operatingMode === UPS_OPERATING_MODE.BYPASS) {
    return null;
  }

  const previousControlMode = normalizeAutomationControlMode(previousState?.controlMode);
  const inputLive = isInputLive(upsSnapshot?.inputSenseState);
  const previousInputLive = isInputLive(previousState?.inputSenseState);
  const enteringAuto = previousState === null || previousControlMode !== AUTOMATION_CONTROL_MODE.AUTO;
  const batteryAvailable = upsSnapshot?.batteryAvailable !== false;
  const batteryRecovered = previousState?.batteryAvailable === false && batteryAvailable;

  if (
    operatingMode === UPS_OPERATING_MODE.NORMAL &&
    !inputLive &&
    batteryAvailable &&
    (enteringAuto || previousInputLive || batteryRecovered)
  ) {
    return {
      targetOperatingMode: UPS_OPERATING_MODE.BATTERY
    };
  }

  if (
    operatingMode === UPS_OPERATING_MODE.BATTERY &&
    inputLive &&
    (enteringAuto || !previousInputLive)
  ) {
    return {
      targetOperatingMode: UPS_OPERATING_MODE.NORMAL
    };
  }

  return null;
}

export function createUpsAutomationController({ onModeChange }) {
  const previousStateByNodeId = new Map();

  return {
    sync(upsSnapshots) {
      const nextUpsSnapshotByNodeId = new Map(
        (Array.isArray(upsSnapshots) ? upsSnapshots : []).map((upsSnapshot) => [
          upsSnapshot.nodeId,
          upsSnapshot
        ])
      );

      for (const nodeId of Array.from(previousStateByNodeId.keys())) {
        if (!nextUpsSnapshotByNodeId.has(nodeId)) {
          previousStateByNodeId.delete(nodeId);
        }
      }

      nextUpsSnapshotByNodeId.forEach((upsSnapshot, nodeId) => {
        const previousState = previousStateByNodeId.get(nodeId) ?? null;
        const decision = deriveUpsAutomationDecision(upsSnapshot, previousState);

        previousStateByNodeId.set(nodeId, {
          controlMode: upsSnapshot.controlMode,
          inputSenseState: upsSnapshot.inputSenseState,
          batteryAvailable: upsSnapshot.batteryAvailable !== false
        });

        if (decision) {
          onModeChange?.(nodeId, decision.targetOperatingMode);
        }
      });
    },
    dispose() {
      previousStateByNodeId.clear();
    }
  };
}
