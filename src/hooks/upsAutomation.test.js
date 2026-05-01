import { describe, expect, it, vi } from "vitest";
import { NODE_POWER_STATE } from "../engine/powerFlow";
import { AUTOMATION_CONTROL_MODE } from "../topology/automationControl";
import { UPS_OPERATING_MODE } from "../topology/ups";
import {
  collectUpsSyncGroupTargetIds,
  createUpsAutomationController,
  deriveUpsAutomationDecision
} from "./upsAutomation";

function createUpsSnapshot(nodeId = "ups-a", overrides = {}) {
  return {
    nodeId,
    controlMode: AUTOMATION_CONTROL_MODE.AUTO,
    operatingMode: UPS_OPERATING_MODE.NORMAL,
    batteryAvailable: true,
    inputSenseState: NODE_POWER_STATE.LIVE,
    ...overrides
  };
}

describe("deriveUpsAutomationDecision", () => {
  it("switches to battery on sensed line loss and returns to normal on healthy input restore", () => {
    expect(
      deriveUpsAutomationDecision(
        createUpsSnapshot("ups-a", {
          operatingMode: UPS_OPERATING_MODE.NORMAL,
          inputSenseState: NODE_POWER_STATE.DEAD
        }),
        {
          controlMode: AUTOMATION_CONTROL_MODE.AUTO,
          inputSenseState: NODE_POWER_STATE.LIVE,
          batteryAvailable: true
        }
      )
    ).toEqual({
      targetOperatingMode: UPS_OPERATING_MODE.BATTERY
    });

    expect(
      deriveUpsAutomationDecision(
        createUpsSnapshot("ups-a", {
          operatingMode: UPS_OPERATING_MODE.BATTERY,
          inputSenseState: NODE_POWER_STATE.LIVE
        }),
        {
          controlMode: AUTOMATION_CONTROL_MODE.AUTO,
          inputSenseState: NODE_POWER_STATE.DEAD,
          batteryAvailable: true
        }
      )
    ).toEqual({
      targetOperatingMode: UPS_OPERATING_MODE.NORMAL
    });
  });

  it("ignores bypass mode and manual mode", () => {
    expect(
      deriveUpsAutomationDecision(
        createUpsSnapshot("ups-a", {
          operatingMode: UPS_OPERATING_MODE.BYPASS,
          inputSenseState: NODE_POWER_STATE.DEAD
        }),
        {
          controlMode: AUTOMATION_CONTROL_MODE.AUTO,
          inputSenseState: NODE_POWER_STATE.LIVE,
          batteryAvailable: true
        }
      )
    ).toBeNull();

    expect(
      deriveUpsAutomationDecision(
        createUpsSnapshot("ups-a", {
          controlMode: AUTOMATION_CONTROL_MODE.MANUAL,
          operatingMode: UPS_OPERATING_MODE.NORMAL,
          inputSenseState: NODE_POWER_STATE.DEAD
        }),
        {
          controlMode: AUTOMATION_CONTROL_MODE.MANUAL,
          inputSenseState: NODE_POWER_STATE.LIVE,
          batteryAvailable: true
        }
      )
    ).toBeNull();
  });
});

describe("createUpsAutomationController", () => {
  it("applies auto changes on line transitions and when re-entering auto mode", () => {
    const onModeChange = vi.fn();
    const controller = createUpsAutomationController({ onModeChange });

    controller.sync([createUpsSnapshot("ups-a")]);
    expect(onModeChange).not.toHaveBeenCalled();

    controller.sync([
      createUpsSnapshot("ups-a", {
        inputSenseState: NODE_POWER_STATE.DEAD
      })
    ]);
    expect(onModeChange).toHaveBeenCalledWith("ups-a", UPS_OPERATING_MODE.BATTERY);

    onModeChange.mockClear();
    controller.sync([
      createUpsSnapshot("ups-a", {
        operatingMode: UPS_OPERATING_MODE.BATTERY,
        inputSenseState: NODE_POWER_STATE.DEAD,
        controlMode: AUTOMATION_CONTROL_MODE.MANUAL
      })
    ]);
    controller.sync([
      createUpsSnapshot("ups-a", {
        operatingMode: UPS_OPERATING_MODE.NORMAL,
        inputSenseState: NODE_POWER_STATE.DEAD,
        controlMode: AUTOMATION_CONTROL_MODE.AUTO
      })
    ]);

    expect(onModeChange).toHaveBeenCalledWith("ups-a", UPS_OPERATING_MODE.BATTERY);
  });
});

describe("collectUpsSyncGroupTargetIds", () => {
  it("fans manual UPS control out across the sync group and leaves blank groups isolated", () => {
    const nodes = [
      {
        id: "ups-a",
        type: "ups",
        data: { syncGroup: "ups-bus-a" }
      },
      {
        id: "ups-b",
        type: "ups",
        data: { syncGroup: " UPS-BUS-A " }
      },
      {
        id: "ups-c",
        type: "ups",
        data: { syncGroup: "" }
      }
    ];
    const normalizeSyncGroup = (value) =>
      typeof value === "string" ? value.trim().toUpperCase() : "";

    expect(collectUpsSyncGroupTargetIds(nodes, "ups-a", normalizeSyncGroup)).toEqual([
      "ups-a",
      "ups-b"
    ]);
    expect(collectUpsSyncGroupTargetIds(nodes, "ups-c", normalizeSyncGroup)).toEqual([
      "ups-c"
    ]);
  });
});
