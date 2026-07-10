import type {
  EnforcementLevel,
  HostCapabilities,
} from "../spec/index.js";

export const NO_HOST_CAPABILITIES: HostCapabilities = Object.freeze({
  canInjectInstructions: false,
  canObserveModelOutput: false,
  canObserveToolCalls: false,
  canBlockToolCalls: false,
  canTriggerAdditionalTurns: false,
  canPersistLocalState: false,
  toolCallInterceptionScope: "none",
});

export function resolveEnforcementLevel(
  capabilities: HostCapabilities,
): EnforcementLevel {
  const fullyGoverned =
    capabilities.canInjectInstructions &&
    capabilities.canObserveModelOutput &&
    capabilities.canBlockModelOutput === true &&
    capabilities.canObserveToolCalls &&
    capabilities.canBlockToolCalls &&
    capabilities.canTriggerAdditionalTurns &&
    capabilities.toolCallInterceptionScope === "complete";
  if (fullyGoverned) return "fully_governed";

  if (capabilities.canObserveToolCalls && capabilities.canBlockToolCalls) {
    return "interceptable";
  }
  if (capabilities.canObserveModelOutput || capabilities.canObserveToolCalls) {
    return "observable";
  }
  return "prompt_only";
}
