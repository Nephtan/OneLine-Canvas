import { NODE_POWER_STATE } from "../engine/powerFlow";
import { normalizeVoltageValue } from "../electrical/voltage";
import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_CONTROL_MODE,
  normalizeTransferSwitchActiveSource,
  normalizeTransferSwitchControlMode
} from "../topology/transferSwitch";
import {
  AUTOMATION_CONTROL_MODE,
  normalizeAutomationControlMode
} from "../topology/automationControl";

function isSenseLive(powerState) {
  return powerState === NODE_POWER_STATE.LIVE;
}

function isSenseDead(powerState) {
  return powerState === NODE_POWER_STATE.DEAD;
}

export function deriveGeneratorAutoStartNodeIds(transferSwitchSnapshots) {
  const generatorNodeIds = new Set();

  (Array.isArray(transferSwitchSnapshots) ? transferSwitchSnapshots : []).forEach(
    (transferSwitchSnapshot) => {
      if (
        normalizeTransferSwitchControlMode(transferSwitchSnapshot?.controlMode) !==
          TRANSFER_SWITCH_CONTROL_MODE.AUTO ||
        normalizeTransferSwitchActiveSource(transferSwitchSnapshot?.activeSource) !==
          TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY ||
        isSenseLive(transferSwitchSnapshot?.primarySenseState) ||
        !isSenseDead(transferSwitchSnapshot?.emergencySenseState)
      ) {
        return;
      }

      const transferSwitchNominalVoltage = normalizeVoltageValue(
        transferSwitchSnapshot?.nominalVoltage,
        0
      );

      (Array.isArray(transferSwitchSnapshot?.emergencySupplyCandidates)
        ? transferSwitchSnapshot.emergencySupplyCandidates
        : []
      ).forEach((candidate) => {
        if (
          candidate?.kind !== "generator" ||
          candidate?.isSourceOnline === true ||
          normalizeAutomationControlMode(candidate?.controlMode) !==
            AUTOMATION_CONTROL_MODE.AUTO
        ) {
          return;
        }

        const candidateVoltage = normalizeVoltageValue(candidate?.nominalVoltage, 0);

        if (
          transferSwitchNominalVoltage > 0 &&
          candidateVoltage > 0 &&
          candidateVoltage !== transferSwitchNominalVoltage
        ) {
          return;
        }

        if (typeof candidate.nodeId === "string" && candidate.nodeId.trim() !== "") {
          generatorNodeIds.add(candidate.nodeId);
        }
      });
    }
  );

  return Array.from(generatorNodeIds).sort();
}
