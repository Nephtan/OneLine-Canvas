import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_CONTROL_MODE
} from "../topology/transferSwitch";
import { AUTOMATION_CONTROL_MODE } from "../topology/automationControl";
import {
  createTransferSwitchAutomationController,
  TRANSFER_SWITCH_AUTOMATION_KIND
} from "./transferSwitchAutomation";
import { deriveGeneratorAutoStartNodeIds } from "./generatorAutomation";

function createTransferSwitchSnapshot(overrides = {}) {
  return {
    nodeId: "ats-a",
    nominalVoltage: 480,
    activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
    controlMode: TRANSFER_SWITCH_CONTROL_MODE.AUTO,
    primarySenseState: NODE_POWER_STATE.DEAD,
    emergencySenseState: NODE_POWER_STATE.DEAD,
    emergencySupplyCandidates: [
      {
        nodeId: "gen-a",
        kind: "generator",
        nominalVoltage: 480,
        controlMode: AUTOMATION_CONTROL_MODE.AUTO,
        isSourceOnline: false
      }
    ],
    ...overrides
  };
}

describe("deriveGeneratorAutoStartNodeIds", () => {
  it("starts offline auto generators for ATS-driven preferred-source loss", () => {
    expect(deriveGeneratorAutoStartNodeIds([createTransferSwitchSnapshot()])).toEqual([
      "gen-a"
    ]);
  });

  it("does not start generators for manual ATSes, utility-backed emergency feeds, or already-live emergency inputs", () => {
    expect(
      deriveGeneratorAutoStartNodeIds([
        createTransferSwitchSnapshot({
          controlMode: TRANSFER_SWITCH_CONTROL_MODE.MANUAL
        })
      ])
    ).toEqual([]);

    expect(
      deriveGeneratorAutoStartNodeIds([
        createTransferSwitchSnapshot({
          emergencySupplyCandidates: [
            {
              nodeId: "utility-b",
              kind: "utility",
              nominalVoltage: 480,
              controlMode: AUTOMATION_CONTROL_MODE.AUTO,
              isSourceOnline: false
            }
          ]
        })
      ])
    ).toEqual([]);

    expect(
      deriveGeneratorAutoStartNodeIds([
        createTransferSwitchSnapshot({
          emergencySenseState: NODE_POWER_STATE.LIVE
        })
      ])
    ).toEqual([]);
  });
});

describe("generator automation with ATS transfer timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets generator autostart happen before ATS transfer timing begins", async () => {
    const onThrow = vi.fn();
    const controller = createTransferSwitchAutomationController({ onThrow });
    const initialSnapshot = {
      nodeId: "ats-a",
      activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
      controlMode: TRANSFER_SWITCH_CONTROL_MODE.AUTO,
      transferDelaySeconds: 3,
      retransferDelaySeconds: 10,
      primarySenseState: NODE_POWER_STATE.DEAD,
      emergencySenseState: NODE_POWER_STATE.DEAD
    };

    expect(deriveGeneratorAutoStartNodeIds([createTransferSwitchSnapshot()])).toEqual([
      "gen-a"
    ]);

    controller.sync([initialSnapshot]);
    await vi.advanceTimersByTimeAsync(5000);

    expect(onThrow).not.toHaveBeenCalled();

    controller.sync([
      {
        ...initialSnapshot,
        emergencySenseState: NODE_POWER_STATE.LIVE
      }
    ]);
    await vi.advanceTimersByTimeAsync(2999);

    expect(onThrow).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(onThrow).toHaveBeenCalledWith(
      "ats-a",
      TRANSFER_SWITCH_ACTIVE_SOURCE.EMERGENCY
    );
    expect(TRANSFER_SWITCH_AUTOMATION_KIND.TRANSFER).toBe("transfer");
  });
});
