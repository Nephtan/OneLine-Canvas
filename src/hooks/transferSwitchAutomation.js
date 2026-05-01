import { NODE_POWER_STATE } from "../engine/powerFlow";
import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_CONTROL_MODE,
  TRANSFER_SWITCH_RETRANSFER_POLICY,
  normalizeTransferSwitchActiveSource,
  normalizeTransferSwitchControlMode,
  normalizeTransferSwitchRetransferPolicy
} from "../topology/transferSwitch";

export const TRANSFER_SWITCH_AUTOMATION_KIND = {
  TRANSFER: "transfer",
  RETRANSFER: "retransfer"
};

export function isTransferSwitchSenseLive(senseState) {
  return senseState === NODE_POWER_STATE.LIVE;
}

export function deriveTransferSwitchAutomationDecision(transferSwitchSnapshot) {
  if (
    normalizeTransferSwitchControlMode(transferSwitchSnapshot?.controlMode) !==
    TRANSFER_SWITCH_CONTROL_MODE.AUTO
  ) {
    return null;
  }

  const activeSource = normalizeTransferSwitchActiveSource(
    transferSwitchSnapshot.activeSource
  );
  const retransferPolicy = normalizeTransferSwitchRetransferPolicy(
    transferSwitchSnapshot.retransferPolicy
  );
  const transferDelaySeconds = Number.isFinite(transferSwitchSnapshot.transferDelaySeconds)
    ? Math.max(0, Math.round(transferSwitchSnapshot.transferDelaySeconds))
    : 0;
  const retransferDelaySeconds = Number.isFinite(
    transferSwitchSnapshot.retransferDelaySeconds
  )
    ? Math.max(0, Math.round(transferSwitchSnapshot.retransferDelaySeconds))
    : 0;
  const primaryLive = isTransferSwitchSenseLive(
    transferSwitchSnapshot.primarySenseState
  );
  const emergencyLive = isTransferSwitchSenseLive(
    transferSwitchSnapshot.emergencySenseState
  );

  if (activeSource === TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY) {
    if (!primaryLive && emergencyLive) {
      return {
        kind: TRANSFER_SWITCH_AUTOMATION_KIND.TRANSFER,
        targetSource: TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY,
        delaySeconds: transferDelaySeconds,
        delayMs: transferDelaySeconds * 1000
      };
    }

    return null;
  }

  if (!emergencyLive && primaryLive) {
    return {
      kind: TRANSFER_SWITCH_AUTOMATION_KIND.TRANSFER,
      targetSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
      delaySeconds: transferDelaySeconds,
      delayMs: transferDelaySeconds * 1000
    };
  }

  if (
    retransferPolicy === TRANSFER_SWITCH_RETRANSFER_POLICY.AUTO_RETURN &&
    emergencyLive &&
    primaryLive
  ) {
    return {
      kind: TRANSFER_SWITCH_AUTOMATION_KIND.RETRANSFER,
      targetSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
      delaySeconds: retransferDelaySeconds,
      delayMs: retransferDelaySeconds * 1000
    };
  }

  return null;
}

function createPendingSnapshotEntry(timerEntry) {
  return {
    kind: timerEntry.kind,
    targetSource: timerEntry.targetSource,
    dueAtMs: timerEntry.dueAtMs
  };
}

export function createTransferSwitchAutomationController({
  onThrow,
  onPendingChange = () => {},
  getNow = () => Date.now(),
  setTimeoutFn = (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeoutFn = (timeoutId) => globalThis.clearTimeout(timeoutId)
}) {
  const timerEntryByNodeId = new Map();
  const snapshotByNodeId = new Map();

  function emitPendingChange() {
    onPendingChange(
      Object.fromEntries(
        Array.from(timerEntryByNodeId.entries()).map(([nodeId, timerEntry]) => [
          nodeId,
          createPendingSnapshotEntry(timerEntry)
        ])
      )
    );
  }

  function clearTimer(nodeId, shouldEmitPendingChange = true) {
    const timerEntry = timerEntryByNodeId.get(nodeId);

    if (!timerEntry) {
      return false;
    }

    clearTimeoutFn(timerEntry.timeoutId);
    timerEntryByNodeId.delete(nodeId);

    if (shouldEmitPendingChange) {
      emitPendingChange();
    }

    return true;
  }

  function handleTimer(nodeId, expectedKind, expectedTargetSource) {
    timerEntryByNodeId.delete(nodeId);
    emitPendingChange();

    const currentSnapshot = snapshotByNodeId.get(nodeId);

    if (!currentSnapshot) {
      return;
    }

    const currentDecision = deriveTransferSwitchAutomationDecision(currentSnapshot);

    if (
      !currentDecision ||
      currentDecision.kind !== expectedKind ||
      currentDecision.targetSource !== expectedTargetSource
    ) {
      return;
    }

    onThrow?.(nodeId, expectedTargetSource);
  }

  function scheduleTimer(transferSwitchSnapshot, decision, shouldEmitPendingChange = true) {
    const dueAtMs = getNow() + decision.delayMs;
    const timeoutId = setTimeoutFn(() => {
      handleTimer(
        transferSwitchSnapshot.nodeId,
        decision.kind,
        decision.targetSource
      );
    }, decision.delayMs);

    timerEntryByNodeId.set(transferSwitchSnapshot.nodeId, {
      timeoutId,
      dueAtMs,
      kind: decision.kind,
      targetSource: decision.targetSource,
      delayMs: decision.delayMs
    });

    if (shouldEmitPendingChange) {
      emitPendingChange();
    }
  }

  return {
    sync(transferSwitchSnapshots) {
      const nextSnapshotByNodeId = new Map(
        (Array.isArray(transferSwitchSnapshots) ? transferSwitchSnapshots : []).map(
          (transferSwitchSnapshot) => [transferSwitchSnapshot.nodeId, transferSwitchSnapshot]
        )
      );
      let didMutatePending = false;

      snapshotByNodeId.clear();

      nextSnapshotByNodeId.forEach((transferSwitchSnapshot, nodeId) => {
        snapshotByNodeId.set(nodeId, transferSwitchSnapshot);
      });

      for (const nodeId of Array.from(timerEntryByNodeId.keys())) {
        if (nextSnapshotByNodeId.has(nodeId)) {
          continue;
        }

        didMutatePending = clearTimer(nodeId, false) || didMutatePending;
      }

      nextSnapshotByNodeId.forEach((transferSwitchSnapshot, nodeId) => {
        const decision = deriveTransferSwitchAutomationDecision(transferSwitchSnapshot);
        const currentTimerEntry = timerEntryByNodeId.get(nodeId);

        if (!decision) {
          didMutatePending = clearTimer(nodeId, false) || didMutatePending;
          return;
        }

        if (
          currentTimerEntry &&
          currentTimerEntry.kind === decision.kind &&
          currentTimerEntry.targetSource === decision.targetSource &&
          currentTimerEntry.delayMs === decision.delayMs
        ) {
          return;
        }

        if (currentTimerEntry) {
          clearTimer(nodeId, false);
          didMutatePending = true;
        }

        scheduleTimer(transferSwitchSnapshot, decision, false);
        didMutatePending = true;
      });

      if (didMutatePending) {
        emitPendingChange();
      }
    },
    dispose() {
      let didMutatePending = false;

      for (const nodeId of Array.from(timerEntryByNodeId.keys())) {
        didMutatePending = clearTimer(nodeId, false) || didMutatePending;
      }

      snapshotByNodeId.clear();

      if (didMutatePending) {
        emitPendingChange();
      }
    }
  };
}
