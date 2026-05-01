export const AUTOMATION_CONTROL_MODE = {
  MANUAL: "manual",
  AUTO: "auto"
};

export function normalizeAutomationControlMode(controlMode) {
  return controlMode === AUTOMATION_CONTROL_MODE.AUTO
    ? AUTOMATION_CONTROL_MODE.AUTO
    : AUTOMATION_CONTROL_MODE.MANUAL;
}

export function formatAutomationControlMode(controlMode) {
  return normalizeAutomationControlMode(controlMode) === AUTOMATION_CONTROL_MODE.AUTO
    ? "Auto"
    : "Manual";
}
