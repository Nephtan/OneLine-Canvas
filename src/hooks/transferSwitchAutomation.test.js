import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_CONTROL_MODE,
  TRANSFER_SWITCH_RETRANSFER_POLICY
} from "../topology/transferSwitch";
import {
  createTransferSwitchAutomationController,
  deriveTransferSwitchAutomationDecision,
  TRANSFER_SWITCH_AUTOMATION_KIND
} from "./transferSwitchAutomation";

function createTransferSwitchSnapshot(nodeId, overrides = {}) {
  return {
    nodeId,
    activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
    controlMode: TRANSFER_SWITCH_CONTROL_MODE.AUTO,
    retransferPolicy: TRANSFER_SWITCH_RETRANSFER_POLICY.MANUAL_RETURN,
    transferDelaySeconds: 5,
    retransferDelaySeconds: 10,
    primarySenseState: NODE_POWER_STATE.DEAD,
    emergencySenseState: NODE_POWER_STATE.LIVE,
    ...overrides
  };
}

describe("deriveTransferSwitchAutomationDecision", () => {
  it("uses transfer delay for active-source failure and retransfer delay for preferred-source return", () => {
    expect(
      deriveTransferSwitchAutomationDecision(
        createTransferSwitchSnapshot("ats-a")
      )
    ).toMatchObject({
      kind: TRANSFER_SWITCH_AUTOMATION_KIND.TRANSFER,
      targetSource: TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY,
      delayMs: 5000
    });

    expect(
      deriveTransferSwitchAutomationDecision(
        createTransferSwitchSnapshot("ats-a", {
          activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY,
          retransferPolicy: TRANSFER_SWITCH_RETRANSFER_POLICY.AUTO_RETURN,
          primarySenseState: NODE_POWER_STATE.LIVE,
          emergencySenseState: NODE_POWER_STATE.LIVE
        })
      )
    ).toMatchObject({
      kind: TRANSFER_SWITCH_AUTOMATION_KIND.RETRANSFER,
      targetSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
      delayMs: 10000
    });
  });
});

describe("createTransferSwitchAutomationController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-transfers after the configured transfer delay", async () => {
    const onThrow = vi.fn();
    const controller = createTransferSwitchAutomationController({ onThrow });

    controller.sync([createTransferSwitchSnapshot("ats-a")]);
    await vi.advanceTimersByTimeAsync(4999);

    expect(onThrow).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(onThrow).toHaveBeenCalledWith(
      "ats-a",
      TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
    );
  });

  it("cancels a pending transfer when the active source recovers before expiry", async () => {
    const onThrow = vi.fn();
    const controller = createTransferSwitchAutomationController({ onThrow });

    controller.sync([createTransferSwitchSnapshot("ats-a")]);
    await vi.advanceTimersByTimeAsync(2000);
    controller.sync([
      createTransferSwitchSnapshot("ats-a", {
        primarySenseState: NODE_POWER_STATE.LIVE,
        emergencySenseState: NODE_POWER_STATE.LIVE
      })
    ]);
    await vi.advanceTimersByTimeAsync(10000);

    expect(onThrow).not.toHaveBeenCalled();
  });

  it("latches on emergency under manual-return even after primary recovers", async () => {
    const onThrow = vi.fn();
    const controller = createTransferSwitchAutomationController({ onThrow });

    controller.sync([
      createTransferSwitchSnapshot("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY,
        primarySenseState: NODE_POWER_STATE.LIVE,
        emergencySenseState: NODE_POWER_STATE.LIVE,
        retransferPolicy: TRANSFER_SWITCH_RETRANSFER_POLICY.MANUAL_RETURN
      })
    ]);
    await vi.advanceTimersByTimeAsync(20000);

    expect(onThrow).not.toHaveBeenCalled();
  });

  it("auto-retransfers to primary after the configured retransfer delay", async () => {
    const onThrow = vi.fn();
    const controller = createTransferSwitchAutomationController({ onThrow });

    controller.sync([
      createTransferSwitchSnapshot("ats-a", {
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY,
        primarySenseState: NODE_POWER_STATE.LIVE,
        emergencySenseState: NODE_POWER_STATE.LIVE,
        retransferPolicy: TRANSFER_SWITCH_RETRANSFER_POLICY.AUTO_RETURN,
        retransferDelaySeconds: 7
      })
    ]);
    await vi.advanceTimersByTimeAsync(6999);

    expect(onThrow).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(onThrow).toHaveBeenCalledWith(
      "ats-a",
      TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
    );
  });

  it("never auto-throws in manual mode", async () => {
    const onThrow = vi.fn();
    const controller = createTransferSwitchAutomationController({ onThrow });

    controller.sync([
      createTransferSwitchSnapshot("ats-a", {
        controlMode: TRANSFER_SWITCH_CONTROL_MODE.MANUAL
      })
    ]);
    await vi.advanceTimersByTimeAsync(10000);

    expect(onThrow).not.toHaveBeenCalled();
  });

  it("cleans up timers when an ATS is deleted or switched back to manual", async () => {
    const onThrow = vi.fn();
    const controller = createTransferSwitchAutomationController({ onThrow });

    controller.sync([createTransferSwitchSnapshot("ats-a")]);
    await vi.advanceTimersByTimeAsync(2000);
    controller.sync([]);
    await vi.advanceTimersByTimeAsync(10000);

    expect(onThrow).not.toHaveBeenCalled();

    controller.sync([createTransferSwitchSnapshot("ats-a")]);
    await vi.advanceTimersByTimeAsync(2000);
    controller.sync([
      createTransferSwitchSnapshot("ats-a", {
        controlMode: TRANSFER_SWITCH_CONTROL_MODE.MANUAL
      })
    ]);
    await vi.advanceTimersByTimeAsync(10000);

    expect(onThrow).not.toHaveBeenCalled();
  });
});
