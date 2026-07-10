import type { HostCapabilities } from "../src/spec/index.js";
import {
  NO_HOST_CAPABILITIES,
  resolveEnforcementLevel,
} from "../src/runtime/index.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

assertEqual(
  resolveEnforcementLevel(NO_HOST_CAPABILITIES),
  "prompt_only",
  "a host with no observation or interception is advisory only",
);

const observable: HostCapabilities = {
  ...NO_HOST_CAPABILITIES,
  canInjectInstructions: true,
  canObserveModelOutput: true,
};
assertEqual(
  resolveEnforcementLevel(observable),
  "observable",
  "output observation enables post-execution detection",
);

const claudeLike: HostCapabilities = {
  canInjectInstructions: true,
  canObserveModelOutput: true,
  canObserveToolCalls: true,
  canBlockToolCalls: true,
  canTriggerAdditionalTurns: true,
  canPersistLocalState: true,
  toolCallInterceptionScope: "partial",
};
assertEqual(
  resolveEnforcementLevel(claudeLike),
  "interceptable",
  "partial tool interception must not claim full governance",
);

const fullyGoverned: HostCapabilities = {
  ...claudeLike,
  canBlockModelOutput: true,
  toolCallInterceptionScope: "complete",
};
assertEqual(
  resolveEnforcementLevel(fullyGoverned),
  "fully_governed",
  "complete lifecycle control enables full governance",
);

console.log("Phase 5 host-native boundary tests passed");
