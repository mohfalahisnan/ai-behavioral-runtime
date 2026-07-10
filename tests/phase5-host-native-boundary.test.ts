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

import type {
  PermissionPolicy,
  RuntimeRunState,
} from "../src/index.js";
import {
  BehavioralRuntime,
  InMemoryRuntimeStateStore,
  initialRuntimeSpecification,
} from "../src/index.js";

const validContext = {
  userTurn: "Discuss the host-native runtime boundary.",
  conversationContext: [],
};

const explicitPermission: PermissionPolicy = {
  execution: "propose_changes",
  capabilities: {
    filesystemRead: true,
    filesystemWrite: false,
    shell: false,
    network: false,
  },
};

const executorFreeRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  hostAdapter: { capabilities: claudeLike },
  stateStore: new InMemoryRuntimeStateStore(),
  clock: { now: () => "2026-07-10T00:00:00.000Z" },
});
await executorFreeRuntime.startRun({
  runId: "phase5-prepare",
  phaseId: "phase5-prepare-phase",
  categoryId: "discussion",
  objective: "Prepare without invoking a model",
  permissionPolicy: explicitPermission,
  context: validContext,
});
const prepared = await executorFreeRuntime.prepareCurrentStep("phase5-prepare");
assert(prepared.readyForExecution, "valid input must be ready for host execution");
assertEqual(prepared.contract.step.id, "understand-position", "entry step must compile");
assertEqual(prepared.permissionPolicy, explicitPermission, "permission policy must persist");
assertEqual(prepared.enforcementLevel, "interceptable", "Claude-like hooks are interceptable");
assertEqual(prepared.hostCapabilities, claudeLike, "host capabilities must remain visible");
assertEqual(
  (await executorFreeRuntime.getState("phase5-prepare")).traces.length,
  0,
  "preparation alone must not claim execution",
);

await executorFreeRuntime.startRun({
  runId: "phase5-default-permission",
  phaseId: "phase5-default-permission-phase",
  categoryId: "discussion",
  objective: "Default safely",
  context: validContext,
});
assertEqual(
  (await executorFreeRuntime.getState("phase5-default-permission")).permissionPolicy.execution,
  "none",
  "missing permission must default to none",
);

await executorFreeRuntime.startRun({
  runId: "phase5-blocked-prepare",
  phaseId: "phase5-blocked-prepare-phase",
  categoryId: "discussion",
  objective: "Block before host execution",
  context: { userTurn: "Missing conversation context" },
});
const blockedPreparation = await executorFreeRuntime.prepareCurrentStep(
  "phase5-blocked-prepare",
);
assert(!blockedPreparation.readyForExecution, "invalid input must not reach the host model");
const blockedState = await executorFreeRuntime.getState("phase5-blocked-prepare");
assertEqual(blockedState.status, "blocked", "invalid preparation must block the run");
assertEqual(blockedState.traces.length, 1, "blocked preparation must be traced");
assertEqual(
  blockedState.traces[0]?.governance.enforcementLevel,
  "interceptable",
  "trace must disclose enforcement level",
);
assertEqual(
  blockedState.traces[0]?.governance.permissionPolicy.execution,
  "none",
  "trace must disclose permission policy",
);

console.log("Phase 5 host-native boundary tests passed");
