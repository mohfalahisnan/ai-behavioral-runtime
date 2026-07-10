# Phase 5 Host-Native Product Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the runtime work without direct model invocation by separating step preparation from result submission and adding honest host capability, enforcement, permission, and local persistence boundaries.

**Architecture:** `BehavioralRuntime.prepareCurrentStep()` compiles a minimal host-neutral contract, then the host executes its own model and calls `submitStepResult()`. `executeCurrentStep()` remains a thin optional helper that composes the same two primitives through a configured `ModelExecutor`. Host capabilities determine an explicit enforcement level, permission policy is persisted per run, and both are recorded in preparation results and traces.

**Tech Stack:** TypeScript 5.8, Node.js ES modules, npm scripts, existing handwritten assertion tests.

## Global Constraints

- Product is plugin-first and local-first.
- Host owns model execution, provider authentication, provider billing, model availability, provider reasoning modes, host tools, and host context management.
- Runtime owns protocols, constraints, workflow state, validation, permissions, transitions, and traces.
- Runtime construction and host-native operation must not require `ModelExecutor`, provider credentials, hosted services, model routing, or multi-agent execution.
- The model receives only the minimal effective step contract.
- `PermissionPolicy.execution` defaults to `"none"`; absent capability permission is denied.
- Enforcement claims must match real host hooks. Partial tool coverage must never resolve to `"fully_governed"`.
- Claude Code is the first host target and is classified `"interceptable"`; Codex is the second compatibility target.
- Existing Phase 3 and Phase 4 behavior, persisted constraint normalization, state transitions, and direct-executor tests must remain green.
- Preserve the pre-existing user changes in `docs/superpowers/reports/2026-07-10-phase-4-implementation.md` and untracked `pnpm-lock.yaml`; do not stage either file.

---

## File Structure

- `src/spec/permissions.ts` — host-neutral permission types.
- `src/spec/host.ts` — host capabilities, enforcement levels, and adapter boundary.
- `src/spec/execution.ts` — host-neutral result name plus backward-compatible executor aliases.
- `src/spec/trace.ts` — governance facts recorded with each trace.
- `src/runtime/host-governance.ts` — deterministic enforcement-level resolution.
- `src/runtime/types.ts` — prepared-step shape and persisted permission state.
- `src/runtime/behavioral-runtime.ts` — prepare, submit, and optional convenience execution.
- `src/runtime/errors.ts` — explicit error for using convenience execution without an executor.
- `tests/phase5-host-native-boundary.test.ts` — end-to-end Phase 5 contract and migration coverage.
- `examples/host-native-runtime.ts` — executor-free lifecycle example.
- `docs/runtime/host-native-lifecycle.md` — plugin and local persistence lifecycle.
- `docs/hosts/first-host-target.md` — Claude Code decision and capability caveats.
- `README.md`, `PROGRESS.md`, `docs/PLAN.md`, `package.json` — product boundary, status, roadmap, and commands.

---

### Task 1: Define host, permission, and enforcement contracts

**Files:**
- Create: `src/spec/permissions.ts`
- Create: `src/spec/host.ts`
- Create: `src/runtime/host-governance.ts`
- Create: `tests/phase5-host-native-boundary.test.ts`
- Modify: `src/spec/execution.ts`
- Modify: `src/spec/index.ts`
- Modify: `src/runtime/index.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `RunId`, `PhaseId`, `StepId`, `JsonObject`, `EffectiveStepContract`, and execution result fields.
- Produces: `PermissionPolicy`, `HostCapabilities`, `HostAdapter`, `EnforcementLevel`, `ExecutionResult`, `NO_HOST_CAPABILITIES`, and `resolveEnforcementLevel()`.

- [ ] **Step 1: Add failing enforcement-level tests**

Create `tests/phase5-host-native-boundary.test.ts` with:

```ts
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
```

Modify `package.json` scripts:

```json
"test": "npm run test:phase3 && npm run test:phase4 && npm run test:phase5",
"test:phase5": "npm run typecheck && npm run build && node dist/tests/phase5-host-native-boundary.test.js"
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:phase5`

Expected: TypeScript fails because the host contracts and enforcement resolver do not exist.

- [ ] **Step 3: Add permission and host contracts**

Create `src/spec/permissions.ts`:

```ts
export type ExecutionPermission =
  | "none"
  | "simulate"
  | "read_only"
  | "propose_changes"
  | "execute";

export interface CapabilityPermissionPolicy {
  readonly filesystemRead?: boolean;
  readonly filesystemWrite?: boolean;
  readonly shell?: boolean;
  readonly network?: boolean;
}

export interface PermissionPolicy {
  readonly execution: ExecutionPermission;
  readonly capabilities?: CapabilityPermissionPolicy;
}
```

In `src/spec/execution.ts`, rename the primary result interface and retain compatibility:

```ts
export interface ExecutionResult {
  readonly output: JsonObject;
  readonly evidence?: readonly string[];
  readonly warnings?: readonly string[];
  readonly completedCriteria?: readonly string[];
  readonly constraintCompliance?: readonly ConstraintCompliance[];
}

/** @deprecated Use ExecutionResult at the host-neutral boundary. */
export type ModelExecutionResult = ExecutionResult;

export interface ModelExecutor {
  execute(input: ModelExecutionInput): Promise<ExecutionResult>;
}
```

Create `src/spec/host.ts`:

```ts
import type { EffectiveStepContract, ExecutionResult } from "./execution.js";
import type { PermissionPolicy } from "./permissions.js";
import type {
  JsonObject,
  PhaseId,
  RunId,
  StepId,
} from "./primitives.js";

export type EnforcementLevel =
  | "prompt_only"
  | "observable"
  | "interceptable"
  | "fully_governed";

export type ToolCallInterceptionScope = "none" | "partial" | "complete";

export interface HostCapabilities {
  readonly canInjectInstructions: boolean;
  readonly canObserveModelOutput: boolean;
  readonly canObserveToolCalls: boolean;
  readonly canBlockToolCalls: boolean;
  readonly canTriggerAdditionalTurns: boolean;
  readonly canPersistLocalState: boolean;
  readonly canSelectModel?: boolean;
  readonly supportsStructuredOutput?: boolean;
  readonly canBlockModelOutput?: boolean;
  readonly toolCallInterceptionScope?: ToolCallInterceptionScope;
  readonly capabilityNotes?: readonly string[];
}

export interface HostInstructionInput {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly contract: EffectiveStepContract;
  readonly context: JsonObject;
  readonly permissionPolicy: PermissionPolicy;
  readonly enforcementLevel: EnforcementLevel;
}

export interface HostObservationInput {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly stepId: StepId;
  readonly rawOutput: unknown;
}

export interface HostModelOutput {
  readonly result: ExecutionResult;
}

export interface HostToolCallInput {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly stepId: StepId;
  readonly toolName: string;
  readonly arguments: JsonObject;
}

export interface HostToolCallObservation {
  readonly observed: boolean;
  readonly metadata?: JsonObject;
}

export type HostToolCallDecision =
  | { readonly action: "allow" }
  | { readonly action: "block"; readonly reason: string };

export interface HostAdapter {
  readonly capabilities: HostCapabilities;
  injectInstructions?(input: HostInstructionInput): Promise<void>;
  observeModelOutput?(input: HostObservationInput): Promise<HostModelOutput>;
  observeToolCall?(input: HostToolCallInput): Promise<HostToolCallObservation>;
  blockToolCall?(input: HostToolCallInput): Promise<HostToolCallDecision>;
}
```

Create `src/runtime/host-governance.ts`:

```ts
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
```

Export the new modules from `src/spec/index.ts` and `src/runtime/index.ts`:

```ts
export * from "./host.js";
export * from "./permissions.js";
```

```ts
export * from "./host-governance.js";
```

- [ ] **Step 4: Run the Phase 5 test**

Run: `npm run test:phase5`

Expected: PASS with `Phase 5 host-native boundary tests passed`.

- [ ] **Step 5: Commit the contract slice**

```bash
git add package.json src/spec/execution.ts src/spec/host.ts src/spec/permissions.ts src/spec/index.ts src/runtime/host-governance.ts src/runtime/index.ts tests/phase5-host-native-boundary.test.ts
git commit -m "feat(runtime): define host-native governance contracts"
```

---

### Task 2: Add persisted permissions and step preparation

**Files:**
- Modify: `src/spec/trace.ts`
- Modify: `src/runtime/types.ts`
- Modify: `src/runtime/behavioral-runtime.ts`
- Modify: `tests/phase5-host-native-boundary.test.ts`

**Interfaces:**
- Consumes: `HostAdapter.capabilities`, `resolveEnforcementLevel()`, existing step compiler, validation pipeline, state store, and trace creation.
- Produces: `PreparedStep`, `BehavioralRuntime.prepareCurrentStep()`, persisted `RuntimeRunState.permissionPolicy`, and governance trace metadata.

- [ ] **Step 1: Add failing executor-free preparation tests**

Append to `tests/phase5-host-native-boundary.test.ts` before the final log:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:phase5`

Expected: TypeScript fails because runtime construction still requires `executor`, `PreparedStep` is absent, and state has no permission policy.

- [ ] **Step 3: Add prepared-step, state, and trace types**

Add to `src/runtime/types.ts` imports and interfaces:

```ts
import type {
  EnforcementLevel,
  HostCapabilities,
  PermissionPolicy,
} from "../spec/index.js";

export interface PreparedStep {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly contract: EffectiveStepContract;
  readonly context: JsonObject;
  readonly permissionPolicy: PermissionPolicy;
  readonly hostCapabilities: HostCapabilities;
  readonly enforcementLevel: EnforcementLevel;
  readonly readyForExecution: boolean;
  readonly inputValidation: ValidationResult;
}
```

Add `readonly permissionPolicy: PermissionPolicy;` to `RuntimeRunState`, and add `readonly permissionPolicy?: PermissionPolicy;` to both `StartRunInput` and `PhaseTransitionInput`.

Add to `src/spec/trace.ts`:

```ts
import type { HostCapabilities, EnforcementLevel } from "./host.js";
import type { PermissionPolicy } from "./permissions.js";

export interface HostGovernanceTrace {
  readonly hostCapabilities: HostCapabilities;
  readonly enforcementLevel: EnforcementLevel;
  readonly permissionPolicy: PermissionPolicy;
}
```

Add `readonly governance: HostGovernanceTrace;` to `ExecutionTrace`.

- [ ] **Step 4: Make executor optional and implement preparation**

In `src/runtime/behavioral-runtime.ts`:

```ts
export interface BehavioralRuntimeOptions {
  readonly specification: ProtocolRuntimeSpecification;
  readonly executor?: ModelExecutor;
  readonly hostAdapter?: HostAdapter;
  readonly stateStore?: RuntimeStateStore;
  readonly validators?: readonly ValidatorHandler[];
  readonly clock?: RuntimeClock;
}
```

Add runtime fields and constructor initialization:

```ts
readonly #executor: ModelExecutor | undefined;
readonly #hostCapabilities: HostCapabilities;
readonly #enforcementLevel: EnforcementLevel;

this.#executor = options.executor;
this.#hostCapabilities = options.hostAdapter?.capabilities ?? NO_HOST_CAPABILITIES;
this.#enforcementLevel = resolveEnforcementLevel(this.#hostCapabilities);
```

Use this safe default whenever a run or legacy state has no explicit policy:

```ts
const NO_EXECUTION_PERMISSION: PermissionPolicy = Object.freeze({
  execution: "none",
});
```

In `startRun()`, persist:

```ts
permissionPolicy: input.permissionPolicy ?? NO_EXECUTION_PERMISSION,
```

At the start of `getState()` after the missing-state guard, add:

```ts
const permissionPolicy = state.permissionPolicy ?? NO_EXECUTION_PERMISSION;
```

In the existing normalized-registry branch, replace the return/save block with:

```ts
const permissionMatches = state.permissionPolicy === permissionPolicy;
if (
  constraintRegistry === state.constraintRegistry &&
  persistentIdsMatch &&
  permissionMatches
) {
  return state;
}
const normalized: RuntimeRunState = {
  ...state,
  constraintRegistry,
  persistentConstraintIds,
  permissionPolicy,
};
await this.#store.save(normalized);
return normalized;
```

Add `permissionPolicy` to the legacy `hydrated` state literal. In `transitionPhase()`, add this exact property to `transitioned`:

```ts
permissionPolicy: input.permissionPolicy ?? state.permissionPolicy,
```

Omission must preserve current authority rather than broaden it.

Add `prepareCurrentStep()`:

```ts
async prepareCurrentStep(runId: RunId): Promise<PreparedStep> {
  const state = await this.getState(runId);
  if (state.status !== "active") {
    throw new InvalidRunStateError(
      `Cannot prepare run '${runId}' while status is '${state.status}'`,
    );
  }

  const { protocol, step } = this.#resolveCurrent(state);
  const contract = this.#compiler.compile(protocol, step, state.constraintRegistry);
  const inputValidation = this.#validateInput(step, state, contract);
  const prepared: PreparedStep = {
    runId: state.runId,
    phaseId: state.phaseId,
    contract,
    context: state.context,
    permissionPolicy: state.permissionPolicy,
    hostCapabilities: this.#hostCapabilities,
    enforcementLevel: this.#enforcementLevel,
    readyForExecution: inputValidation.status === "passed",
    inputValidation,
  };

  if (prepared.readyForExecution) return prepared;

  const transition: TransitionTrace = {
    action: "block",
    reason: "Current context does not satisfy the step input contract",
  };
  const blocked = this.#applyBlockedTransition(state, transition.reason);
  const trace = this.#createTrace(blocked, contract, inputValidation, transition);
  await this.#store.save({ ...blocked, traces: [...blocked.traces, trace] });
  return prepared;
}
```

Add governance to the base object in `#createTrace()`:

```ts
governance: {
  hostCapabilities: this.#hostCapabilities,
  enforcementLevel: this.#enforcementLevel,
  permissionPolicy: state.permissionPolicy,
},
```

- [ ] **Step 5: Run Phase 3, Phase 4, and Phase 5 tests**

Run: `npm test`

Expected: all three phase suites pass. Existing seeded Phase 4 snapshots must hydrate to permission `"none"`.

- [ ] **Step 6: Commit preparation**

```bash
git add src/spec/trace.ts src/runtime/types.ts src/runtime/behavioral-runtime.ts tests/phase5-host-native-boundary.test.ts
git commit -m "feat(runtime): prepare host-native workflow steps"
```

---

### Task 3: Split result submission from optional direct execution

**Files:**
- Modify: `src/runtime/errors.ts`
- Modify: `src/runtime/types.ts`
- Modify: `src/runtime/behavioral-runtime.ts`
- Modify: `tests/phase5-host-native-boundary.test.ts`

**Interfaces:**
- Consumes: `PreparedStep`, `ExecutionResult`, validation pipeline, transition resolver, and state store.
- Produces: `submitStepResult(runId, result)`, optional `executeCurrentStep(runId)`, and `ExecutorNotConfiguredError`.

- [ ] **Step 1: Add failing prepare/submit and helper tests**

Append before the final log in `tests/phase5-host-native-boundary.test.ts`:

```ts
import type {
  ModelExecutionInput,
  ModelExecutor,
} from "../src/index.js";

const firstStepResult = {
  output: {
    position: "The host executes models while the runtime governs transitions.",
    constraints: [],
    assumptions: [],
  },
  completedCriteria: ["position-understood"],
};

const submitted = await executorFreeRuntime.submitStepResult(
  "phase5-prepare",
  firstStepResult,
);
assertEqual(submitted.transition.action, "continue", "valid host result must continue");
assertEqual(
  submitted.state.currentStepId,
  "analyze-and-challenge",
  "submission must advance the runtime-owned step",
);
assertEqual(
  submitted.state.attemptsByStep["understand-position"],
  1,
  "submission, not preparation, counts the attempt",
);
assertEqual(submitted.state.traces.length, 1, "submission must persist one trace");
assertEqual(
  submitted.state.traces[0]?.execution,
  firstStepResult,
  "trace must contain the host-submitted result",
);

class OneStepExecutor implements ModelExecutor {
  calls = 0;
  async execute(input: ModelExecutionInput) {
    this.calls += 1;
    assertEqual(input.contract.step.id, "understand-position", "helper must use prepared step");
    return firstStepResult;
  }
}

const helperExecutor = new OneStepExecutor();
const helperRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: helperExecutor,
});
await helperRuntime.startRun({
  runId: "phase5-helper",
  phaseId: "phase5-helper-phase",
  categoryId: "discussion",
  objective: "Retain optional direct execution",
  context: validContext,
});
const helperResult = await helperRuntime.executeCurrentStep("phase5-helper");
assertEqual(helperExecutor.calls, 1, "configured helper must invoke one executor");
assertEqual(helperResult.transition.action, "continue", "helper must submit through core path");

let missingExecutorMessage = "";
try {
  await executorFreeRuntime.executeCurrentStep("phase5-default-permission");
} catch (error) {
  missingExecutorMessage = error instanceof Error ? error.message : String(error);
}
assert(
  missingExecutorMessage.includes("no ModelExecutor is configured"),
  "convenience execution must fail clearly when no executor is configured",
);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:phase5`

Expected: TypeScript fails because `submitStepResult()` and `ExecutorNotConfiguredError` do not exist.

- [ ] **Step 3: Add the missing-executor error**

Add to `src/runtime/errors.ts`:

```ts
export class ExecutorNotConfiguredError extends BehavioralRuntimeError {
  constructor() {
    super("Cannot execute current step because no ModelExecutor is configured");
    this.name = "ExecutorNotConfiguredError";
  }
}
```

Change `RuntimeStepResult.execution` in `src/runtime/types.ts` to the host-neutral `ExecutionResult` type while the alias keeps existing callers source-compatible.

- [ ] **Step 4: Extract submission from the old execution method**

Replace the post-executor portion of `executeCurrentStep()` with this public method:

```ts
async submitStepResult(
  runId: RunId,
  execution: ExecutionResult,
): Promise<RuntimeStepResult> {
  const state = await this.getState(runId);
  if (state.status !== "active") {
    throw new InvalidRunStateError(
      `Cannot submit a result for run '${runId}' while status is '${state.status}'`,
    );
  }

  const { protocol, step } = this.#resolveCurrent(state);
  const contract = this.#compiler.compile(protocol, step, state.constraintRegistry);
  const inputValidation = this.#validateInput(step, state, contract);
  if (inputValidation.status !== "passed") {
    const transition: TransitionTrace = {
      action: "block",
      reason: "Current context does not satisfy the step input contract",
    };
    const blocked = this.#applyBlockedTransition(state, transition.reason);
    const trace = this.#createTrace(blocked, contract, inputValidation, transition);
    const saved = { ...blocked, traces: [...blocked.traces, trace] };
    await this.#store.save(saved);
    return { state: saved, contract, validation: inputValidation, transition };
  }

  const attemptsByStep = {
    ...state.attemptsByStep,
    [step.id]: (state.attemptsByStep[step.id] ?? 0) + 1,
  };
  const executingState: RuntimeRunState = { ...state, attemptsByStep };
  const validation = await this.#validation.validate({
    step,
    constraints: contract.constraints,
    ignoredConstraints: contract.ignoredConstraints,
    constraintIdAliases: contract.constraintIdAliases,
    execution,
  });
  const transition = this.#transitions.resolve({
    step,
    execution,
    validation,
    retriesUsed: state.retriesByStep[step.id] ?? 0,
  });
  const transitioned = this.#applyTransition(
    executingState,
    step,
    execution,
    transition,
  );
  const trace = this.#createTrace(
    transitioned,
    contract,
    validation,
    transition,
    execution,
  );
  const saved = { ...transitioned, traces: [...transitioned.traces, trace] };
  await this.#store.save(saved);
  return { state: saved, contract, execution, validation, transition };
}
```

Replace `executeCurrentStep()` with:

```ts
async executeCurrentStep(runId: RunId): Promise<RuntimeStepResult> {
  if (!this.#executor) throw new ExecutorNotConfiguredError();

  const prepared = await this.prepareCurrentStep(runId);
  if (!prepared.readyForExecution) {
    const state = await this.getState(runId);
    const transition: TransitionTrace = {
      action: "block",
      reason: state.blockedReason ?? "Current step is not ready for execution",
    };
    return {
      state,
      contract: prepared.contract,
      validation: prepared.inputValidation,
      transition,
    };
  }

  const execution = await this.#executor.execute({
    runId: prepared.runId,
    phaseId: prepared.phaseId,
    contract: prepared.contract,
    context: prepared.context,
  });
  return this.submitStepResult(runId, execution);
}
```

- [ ] **Step 5: Verify every execution path**

Run: `npm test`

Expected: Phase 3, Phase 4, and Phase 5 pass. Existing convenience execution still retries, blocks, completes, and preserves constraint compliance behavior.

Run: `npm run smoke`

Expected: existing direct-executor smoke example completes with one validated retry and one blocked invalid-input case.

- [ ] **Step 6: Commit submission split**

```bash
git add src/runtime/errors.ts src/runtime/types.ts src/runtime/behavioral-runtime.ts tests/phase5-host-native-boundary.test.ts
git commit -m "feat(runtime): submit host model results separately"
```

---

### Task 4: Harden persistence and permission transitions

**Files:**
- Modify: `tests/phase5-host-native-boundary.test.ts`
- Modify: `src/runtime/behavioral-runtime.ts` only if the tests expose a migration defect.

**Interfaces:**
- Consumes: `RuntimeStateStore`, Phase 4 snapshot hydration, `PhaseTransitionInput.permissionPolicy`.
- Produces: deterministic legacy defaulting and explicit-only permission changes across phases.

- [ ] **Step 1: Add persisted-state migration tests**

Append before the final log in `tests/phase5-host-native-boundary.test.ts`:

```ts
class SeededStateStore extends InMemoryRuntimeStateStore {
  constructor(state: RuntimeRunState) {
    super();
    void this.save(state);
  }
}

const preparedState = await executorFreeRuntime.getState("phase5-default-permission");
const { permissionPolicy: _permissionPolicy, ...legacyStateBase } = preparedState;
const legacyState = {
  ...legacyStateBase,
  runId: "phase5-legacy-state",
  phaseId: "phase5-legacy-state-phase",
} as unknown as RuntimeRunState;

const legacyStore = new SeededStateStore(legacyState);
const migrationRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  stateStore: legacyStore,
});
const migrated = await migrationRuntime.getState("phase5-legacy-state");
assertEqual(migrated.permissionPolicy.execution, "none", "legacy state must deny by default");
assertEqual(
  (await legacyStore.get("phase5-legacy-state"))?.permissionPolicy.execution,
  "none",
  "permission migration must persist through the state store",
);

const transitionRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
});
let transitionState = await transitionRuntime.startRun({
  runId: "phase5-permission-transition",
  phaseId: "phase5-permission-one",
  categoryId: "discussion",
  objective: "Complete with read-only authority",
  permissionPolicy: { execution: "read_only", capabilities: { filesystemRead: true } },
  context: validContext,
});
const outputs = [
  firstStepResult,
  {
    output: { strengths: [], weaknesses: [], tradeoffs: [], refinements: [] },
    completedCriteria: ["tradeoffs-exposed"],
  },
  {
    output: { response: "Complete." },
    completedCriteria: ["response-delivered"],
  },
] as const;
for (const output of outputs) {
  await transitionRuntime.prepareCurrentStep(transitionState.runId);
  transitionState = (await transitionRuntime.submitStepResult(transitionState.runId, output)).state;
}
const preservedPermission = await transitionRuntime.transitionPhase(
  transitionState.runId,
  {
    phaseId: "phase5-permission-two",
    categoryId: "task_execution",
    objective: "Preserve permission when omitted",
  },
);
assertEqual(
  preservedPermission.permissionPolicy.execution,
  "read_only",
  "phase transition omission must preserve permission",
);
```

- [ ] **Step 2: Run the focused suite**

Run: `npm run test:phase5`

Expected: PASS. If migration fails, update the `getState()` normalization branch so missing policy is saved as `{ execution: "none" }`; do not change the expected denial default.

- [ ] **Step 3: Run full regression tests**

Run: `npm test`

Expected: all suites pass.

- [ ] **Step 4: Commit persistence hardening**

```bash
git add tests/phase5-host-native-boundary.test.ts src/runtime/behavioral-runtime.ts
git commit -m "test(runtime): harden permission state migration"
```

---

### Task 5: Add executor-free example and lifecycle documentation

**Files:**
- Create: `examples/host-native-runtime.ts`
- Create: `docs/runtime/host-native-lifecycle.md`
- Create: `docs/hosts/first-host-target.md`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: public `BehavioralRuntime`, `prepareCurrentStep()`, and `submitStepResult()` exports.
- Produces: runnable host-native lifecycle, local persistence contract, and evidence-backed first-host decision.

- [ ] **Step 1: Create the executor-free example**

Create `examples/host-native-runtime.ts`:

```ts
import type { ExecutionResult } from "../src/spec/index.js";
import { BehavioralRuntime } from "../src/runtime/index.js";
import { exampleRuntimeSpecification } from "./discussion.protocol.js";

const runtime = new BehavioralRuntime({
  specification: exampleRuntimeSpecification,
  hostAdapter: {
    capabilities: {
      canInjectInstructions: true,
      canObserveModelOutput: true,
      canObserveToolCalls: true,
      canBlockToolCalls: true,
      canTriggerAdditionalTurns: true,
      canPersistLocalState: true,
      canBlockModelOutput: false,
      toolCallInterceptionScope: "partial",
      capabilityNotes: ["Example host cannot suppress already-visible model text"],
    },
  },
});

let state = await runtime.startRun({
  runId: "host-native-demo",
  phaseId: "discussion-phase",
  categoryId: "discussion",
  objective: "Demonstrate host-owned model execution",
  permissionPolicy: { execution: "none" },
  context: {
    userTurn: "Explain the host-native runtime boundary.",
    conversationContext: [],
  },
});

const hostResults: Record<string, ExecutionResult> = {
  "understand-position": {
    output: {
      position: "The plugin governs behavior while the host executes the model.",
      constraints: ["No direct provider API"],
      assumptions: [],
    },
    completedCriteria: ["position-understood"],
  },
  "analyze-and-challenge": {
    output: {
      strengths: ["No duplicate provider credentials"],
      weaknesses: ["Enforcement depends on host hooks"],
      tradeoffs: ["Portability requires honest capability declarations"],
      refinements: ["Record enforcement level in each trace"],
    },
    completedCriteria: ["tradeoffs-exposed"],
  },
  respond: {
    output: { response: "The host executes; the local plugin governs and validates." },
    completedCriteria: ["response-delivered"],
  },
};

while (state.status === "active") {
  const prepared = await runtime.prepareCurrentStep(state.runId);
  if (!prepared.readyForExecution) break;

  // A real plugin injects `prepared.contract` into the host and observes its result.
  const hostResult = hostResults[prepared.contract.step.id];
  if (!hostResult) throw new Error(`Missing host result for ${prepared.contract.step.id}`);
  state = (await runtime.submitStepResult(state.runId, hostResult)).state;
}

if (state.status !== "completed") throw new Error(`Unexpected status: ${state.status}`);
console.log(`host-native run completed with ${state.traces.length} traces`);
```

Add to `package.json`:

```json
"smoke:host-native": "npm run build && node dist/examples/host-native-runtime.js"
```

- [ ] **Step 2: Document the plugin lifecycle and persistence boundary**

Create `docs/runtime/host-native-lifecycle.md` with these exact decisions:

```markdown
# Host-Native Runtime Lifecycle

The plugin owns behavioral governance. The host owns model execution.

## Turn lifecycle

1. Plugin receives or observes the user turn.
2. Plugin starts or resumes a local runtime run.
3. Plugin calls `prepareCurrentStep(runId)`.
4. If `readyForExecution` is false, the plugin does not invoke the host model.
5. Plugin injects only `PreparedStep.contract` plus required host context.
6. Host executes its configured model with host-owned credentials and tools.
7. Plugin converts observed output to `ExecutionResult`.
8. Plugin calls `submitStepResult(runId, result)`.
9. Runtime validates, authorizes the transition, and persists state and trace.
10. Plugin requests another host turn only when its declared capabilities allow it.

## Local persistence boundary

`RuntimeStateStore` is the persistence port. The core ships with `InMemoryRuntimeStateStore`; a host adapter may provide host-native storage, a local file store, or SQLite without changing protocol semantics.

Allowed by default:

- memory inside the plugin process,
- host-owned plugin data directories,
- local files,
- local SQLite.

Not required:

- hosted database,
- cloud session storage,
- user account,
- central orchestration service,
- external telemetry service.

Persisted state contains workflow state, explicit permissions, constraint registry, attempts, retries, and traces. Missing legacy permission state migrates to `execution: "none"`.

## Enforcement honesty

The trace records host capabilities and the derived enforcement level. Partial tool interception is `interceptable`; full governance additionally requires complete tool interception and the ability to suppress invalid model output before exposure.

## Optional direct execution

`executeCurrentStep()` is a convenience adapter and test helper. It requires an explicitly configured `ModelExecutor` and internally uses the same prepare/submit path. It is not the product's required architecture.
```

- [ ] **Step 3: Record the first-host decision**

Create `docs/hosts/first-host-target.md`:

```markdown
# First Host Target: Claude Code

**Decision:** Build Claude Code first. Use Codex as the second compatibility target.

Claude Code currently gives the strongest practical local-plugin lifecycle for the MVP:

| Need | Claude Code hook/storage | Runtime capability |
|---|---|---|
| Inject instructions | `SessionStart`, `UserPromptSubmit` | `canInjectInstructions: true` |
| Observe final model output | `Stop.last_assistant_message` | `canObserveModelOutput: true` |
| Observe and block tools | `PreToolUse` decisions | `canObserveToolCalls: true`, `canBlockToolCalls: true` |
| Continue the workflow | blocking `Stop` response | `canTriggerAdditionalTurns: true` |
| Persist local state | `${CLAUDE_PLUGIN_DATA}` | `canPersistLocalState: true` |

## Enforcement classification

Claude Code is `interceptable`, not automatically `fully_governed`.

- `@file` references bypass `PreToolUse(Read)` and require Read deny rules.
- Stop continuation is capped after eight consecutive blocks.
- Users or administrators may disable or restrict hooks.
- Final text observation does not imply the plugin can always suppress already-visible text.
- Tool-family coverage must remain visible instead of being collapsed into an unconditional hard-governance claim.

## Why Codex is second

Codex has instruction injection, final-output observation, stop continuation, plugin data storage, and local plugin packaging. Current official documentation describes partial interception for simple Bash, `apply_patch`, and MCP calls, while newer `unified_exec`, WebSearch, and other tool families are not completely covered. That makes Codex valuable for the second adapter compatibility check after the Claude Code contract is measured.

## Sources

- [Claude Code hooks](https://code.claude.com/docs/en/hooks)
- [Claude Code plugins](https://code.claude.com/docs/en/plugins)
- [Claude Code plugin discovery and installation](https://code.claude.com/docs/en/discover-plugins)
- [Codex hooks](https://learn.chatgpt.com/docs/hooks)
- [Codex plugin packaging](https://learn.chatgpt.com/docs/build-plugins)
- [Codex advanced hook configuration](https://learn.chatgpt.com/docs/config-file/config-advanced)
```

- [ ] **Step 4: Update README product wording**

Change the opening to:

```markdown
A self-contained local behavioral runtime delivered through host-native AI plugins. The plugin governs behavior; the host owns model execution.
```

Change the architecture diagram to:

```text
Protocol
→ Workflow
→ Prepare Step
→ Host Model Execution
→ Submit Result
→ Validation
→ Transition
```

Add these current capabilities:

```markdown
- executor-free `prepareCurrentStep()` / `submitStepResult()` lifecycle,
- optional direct `ModelExecutor` convenience execution,
- host capability and enforcement-level modeling,
- first-class persisted permission policy,
- governance facts in execution traces,
- local persistence behind `RuntimeStateStore`.
```

Replace the scope section with:

```markdown
## Scope boundary

The product is plugin-first and local-first. It does not require:

- a hosted backend,
- a public SDK,
- direct provider API credentials,
- mandatory model routing,
- mandatory multi-agent execution.

The host owns model execution. Host-specific capabilities must not leak into protocol semantics, and enforcement claims must match actual hooks.
```

Add these documentation links:

```markdown
- [Host-native product boundary](docs/HOST-NATIVE-PRODUCT-BOUNDARY.md)
- [Host-native runtime lifecycle](docs/runtime/host-native-lifecycle.md)
- [First host target](docs/hosts/first-host-target.md)
- [Phase 5 implementation plan](docs/superpowers/plans/2026-07-10-phase-5-host-native-product-boundary.md)
```

- [ ] **Step 5: Run both examples**

Run: `npm run smoke`

Expected: existing direct-executor example passes.

Run: `npm run smoke:host-native`

Expected: `host-native run completed with 3 traces`.

- [ ] **Step 6: Commit lifecycle docs and example**

```bash
git add examples/host-native-runtime.ts docs/runtime/host-native-lifecycle.md docs/hosts/first-host-target.md README.md package.json
git commit -m "docs(runtime): define local host-native lifecycle"
```

---

### Task 6: Final verification and Phase 6 handoff

**Files:**
- Modify: `PROGRESS.md`
- Modify: `docs/PLAN.md`
- Create: `docs/superpowers/reports/2026-07-10-phase-5-implementation.md`

**Interfaces:**
- Consumes: all Phase 5 code, tests, examples, and documentation.
- Produces: verified Phase 5 completion record and Phase 6 as the next work item.

- [ ] **Step 1: Run complete verification**

Run each command separately:

```bash
npm run typecheck
npm test
npm run smoke
npm run smoke:host-native
npm run build
git diff --check
```

Expected:

- typecheck exits 0,
- Phase 3, Phase 4, and Phase 5 tests pass,
- both smoke examples pass,
- build exits 0,
- diff check emits no errors.

- [ ] **Step 2: Review the final diff against the boundary**

Run:

```bash
git diff --stat
git diff -- src tests examples README.md PROGRESS.md docs/PLAN.md docs/runtime docs/hosts
```

Confirm all eleven Phase 5 deliverables from `docs/HOST-NATIVE-PRODUCT-BOUNDARY.md` are implemented or explicitly bounded: prepare, submit, optional executor, adapter, capabilities, enforcement, permissions, lifecycle docs, local persistence boundary, first host selection, and product documentation.

- [ ] **Step 3: Record implementation evidence**

Create `docs/superpowers/reports/2026-07-10-phase-5-implementation.md` containing:

```markdown
# Phase 5 Host-Native Product Boundary Implementation Report

## Outcome

The core runtime now prepares steps and accepts host-submitted results without requiring direct model invocation. Direct executor use remains an optional compatibility helper.

## Delivered

- executor-free prepare/submit lifecycle
- optional direct executor helper
- host adapter and capability contracts
- enforcement levels with complete-governance safeguards
- persisted permission policy with deny-by-default migration
- governance details in traces
- local persistence and plugin lifecycle documentation
- Claude Code first-host decision; Codex second
- executor-free example and regression coverage

## Verification

- `npm run typecheck` — passed
- `npm test` — passed
- `npm run smoke` — passed
- `npm run smoke:host-native` — passed
- `npm run build` — passed
- `git diff --check` — passed

## Next

Phase 6 — Reasoning Strategy Library.
```

In the `PROGRESS.md` status table, replace the Phase 5 and Phase 6 rows with:

```markdown
| Phase 5 — Host-Native Product Boundary | ✅ Completed | Added executor-free prepare/submit, optional direct execution, host governance contracts, persisted permissions, local lifecycle docs, and Claude Code as first host. |
| Phase 6 — Reasoning Strategy Library | ⏳ Next | Implement the first reusable strategies with observable checks, outputs, and evidence expectations. |
```

Change the Phase 5 section status to `✅ Completed`, change `Planned scope:` to `Delivered:`, and append the verification commands from this task. Change the Phase 6 section status to `⏳ Next` and change `Deferred scope:` to `Planned scope:`. `docs/PLAN.md` is already adjusted by the orchestrator; stage it unchanged so the roadmap and Claude Code decision ship with Phase 5.

- [ ] **Step 4: Commit Phase 5 completion**

```bash
git add PROGRESS.md docs/PLAN.md docs/superpowers/reports/2026-07-10-phase-5-implementation.md docs/superpowers/plans/2026-07-10-phase-5-host-native-product-boundary.md
git commit -m "docs: complete phase 5 host-native boundary"
```

- [ ] **Step 5: Show clean scoped status**

Run: `git status --short`

Expected: no Phase 5 files remain modified. The pre-existing user-owned report edit and `pnpm-lock.yaml` may remain and must not be staged or removed.
