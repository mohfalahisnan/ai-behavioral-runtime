# AI Behavioral Runtime — Host-Native Product Boundary

**Status:** Architecture Direction  
**Purpose:** Freeze the product boundary before continuing beyond Phase 4  
**Date:** 2026-07-10

---

## 1. Why This Document Exists

The current behavioral engine is directionally correct, but the product shipping model has changed.

The system should **not** primarily ship as:

- a hosted service,
- a public SDK,
- a standalone API server,
- a direct model-provider wrapper,
- an infrastructure product requiring users to connect model credentials,
- a multi-agent framework.

The intended product direction is:

> **A self-contained local behavioral runtime delivered through host-native AI plugins. The plugin owns behavioral governance. The host owns model execution.**

This document defines that boundary so future implementation phases do not drift toward the wrong product architecture.

---

## 2. Product Invariant

The core product must work as:

```text
AI Host
    ↕
Self-Contained Local Plugin
├── Behavioral Runtime
├── Protocols
├── Categories
├── Constraint Registry
├── Reasoning Strategies
├── Workflow Engine
├── Validation
├── Local State
├── Execution Trace
└── Host Adapter

Host owns model execution.
Plugin governs behavior.
```

The user should not need to operate external infrastructure.

The user should not need to provide separate model API credentials to this product when the host already owns model execution.

The plugin should run fully locally unless a specific host integration requires otherwise.

---

## 3. What the Plugin Owns

The plugin owns:

- phase resolution,
- category resolution,
- base protocol application,
- category protocol application,
- behavioral modifiers,
- explicit user constraints,
- constraint registry,
- workflow state,
- active step,
- reasoning strategy selection,
- step contract compilation,
- validation contracts,
- completion criteria,
- retry policy,
- transition authorization,
- permissions,
- local persistence,
- execution traces,
- host capability detection,
- host integration lifecycle.

The core rule remains:

```text
The model reasons.
The runtime governs.
Validation decides whether execution may continue.
```

---

## 4. What the Host Owns

The host owns:

- model execution,
- provider authentication,
- provider billing,
- model availability,
- provider-specific reasoning modes,
- provider-specific tool capabilities,
- host-native tool execution,
- model context management where applicable.

The behavioral runtime must not require direct provider API access.

The runtime may use host-native capabilities when the host exposes them, but protocol semantics must remain portable.

---

## 5. Core Product Boundary

The runtime should not assume this:

```text
Behavioral Runtime
    ↓
ModelExecutor
    ↓
Model Provider API
```

The preferred host-native lifecycle is:

```text
User Turn
    ↓
Host Plugin Receives / Observes Turn
    ↓
Runtime Resolves Phase and Category
    ↓
Runtime Compiles Effective Step Contract
    ↓
Plugin Injects / Supplies Contract to Host
    ↓
Host Executes Model
    ↓
Plugin Observes Result
    ↓
Runtime Validates Result
    ↓
Runtime Controls Transition
    ↓
Local State and Trace Persisted
```

---

## 6. Required Core Refactor

The current model execution boundary should be split into two primitives.

### 6.1 Prepare Step

```ts
interface BehavioralRuntime {
  prepareCurrentStep(
    runId: RunId,
  ): Promise<PreparedStep>;
}
```

Responsibilities:

- resolve current phase,
- resolve category,
- resolve active step,
- compile effective protocol,
- select relevant constraints,
- resolve reasoning strategies,
- produce the minimal effective step contract.

### 6.2 Submit Result

```ts
interface BehavioralRuntime {
  submitStepResult(
    runId: RunId,
    result: ExecutionResult,
  ): Promise<RuntimeStepResult>;
}
```

Responsibilities:

- validate result,
- validate constraint compliance,
- validate completion criteria,
- record evidence,
- resolve legal transition,
- update runtime state,
- persist trace.

### 6.3 Optional Convenience Execution

A direct executor may remain only as an optional adapter or testing helper.

```ts
interface ModelExecutor {
  execute(
    input: ModelExecutionInput,
  ): Promise<ModelExecutionResult>;
}
```

This must not be the required architectural center of the product.

A convenience helper may exist:

```ts
async executeCurrentStep(
  runId: RunId,
  executor: ModelExecutor,
): Promise<RuntimeStepResult>;
```

But the host-neutral core must work without direct model invocation.

---

## 7. Host Adapter Contract

The runtime should define a host adapter boundary.

```ts
interface HostAdapter {
  readonly capabilities: HostCapabilities;

  injectInstructions?(
    input: HostInstructionInput,
  ): Promise<void>;

  observeModelOutput?(
    input: HostObservationInput,
  ): Promise<HostModelOutput>;

  observeToolCall?(
    input: HostToolCallInput,
  ): Promise<HostToolCallObservation>;

  blockToolCall?(
    input: HostToolCallInput,
  ): Promise<HostToolCallDecision>;
}
```

The exact interface may evolve after implementing the first real host integration.

The important requirement is architectural separation:

```text
Behavioral Runtime
    ≠
Host Adapter
    ≠
Model Provider API
```

---

## 8. Host Capabilities

Different hosts expose different levels of control.

The runtime should model that explicitly.

```ts
interface HostCapabilities {
  canInjectInstructions: boolean;
  canObserveModelOutput: boolean;

  canObserveToolCalls: boolean;
  canBlockToolCalls: boolean;

  canTriggerAdditionalTurns: boolean;
  canPersistLocalState: boolean;

  canSelectModel?: boolean;
  supportsStructuredOutput?: boolean;
}
```

The runtime must not pretend to enforce behavior that the host cannot technically enforce.

---

## 9. Enforcement Levels

Define explicit enforcement levels.

```ts
type EnforcementLevel =
  | "prompt_only"
  | "observable"
  | "interceptable"
  | "fully_governed";
```

### prompt_only

The plugin can inject instructions but cannot observe or block behavior.

Guarantee level:

```text
Advisory only.
```

### observable

The plugin can inspect model output and validate after execution.

Guarantee level:

```text
Detect violations after they occur.
```

### interceptable

The plugin can observe and block some tool calls or transitions.

Guarantee level:

```text
Prevent selected invalid actions.
```

### fully_governed

The plugin controls the relevant lifecycle hooks required for hard enforcement.

Guarantee level:

```text
Runtime-enforced behavior boundaries.
```

This distinction must be visible in documentation and traces.

---

## 10. Permission Policy

Permissions must become first-class runtime state.

Initial model:

```ts
type ExecutionPermission =
  | "none"
  | "simulate"
  | "read_only"
  | "propose_changes"
  | "execute";
```

Optional capability-level permissions:

```ts
interface PermissionPolicy {
  execution: ExecutionPermission;

  capabilities?: {
    filesystemRead?: boolean;
    filesystemWrite?: boolean;
    shell?: boolean;
    network?: boolean;
  };
}
```

The runtime should never infer broader execution permission from ambiguous model behavior.

Where the host supports interception, illegal actions should be blocked before execution.

Where the host does not support interception, violations should be detected and traced.

---

## 11. Local-First State

The plugin should own local state.

Initial options may include:

```text
In-memory state
SQLite
Host-native persistent storage
Local files
```

The product should not require:

- hosted databases,
- cloud session storage,
- central orchestration servers,
- user accounts,
- external telemetry infrastructure.

Persistent storage is an implementation detail, but the product invariant is:

> **The plugin remains self-contained and local by default.**

---

## 12. Current Phases That Remain Valid

The existing work should be preserved.

### Phase 1 — Specification

Keep.

### Phase 2 — Minimal Runtime

Keep, but refactor the execution boundary.

### Phase 3 — Initial Categories

Keep.

Expected categories:

```text
discussion
task_execution
coding_task
```

### Phase 4 — Constraint Registry

Keep.

Expected capabilities:

- explicit constraint extraction,
- stable constraint IDs,
- relevance selection,
- step-level injection,
- compliance reporting.

These remain core to the product regardless of shipping surface.

---

## 13. New Next Phase

Before proceeding deeper into reasoning strategies or additional runtime features, implement:

# Phase 5 — Host-Native Product Boundary

## Deliverables

1. Separate `prepareCurrentStep()` from result submission.
2. Add `submitStepResult()`.
3. Make direct `ModelExecutor` optional.
4. Define `HostAdapter`.
5. Define `HostCapabilities`.
6. Define `EnforcementLevel`.
7. Add first-class `PermissionPolicy`.
8. Add plugin lifecycle documentation.
9. Define local persistence boundary.
10. Select one first host target.
11. Update README and plan to state:
    - plugin-first,
    - local-first,
    - no hosted backend required,
    - no public SDK requirement,
    - no direct provider API requirement,
    - no mandatory model routing,
    - no mandatory multi-agent execution.

---

## 14. Revised Build Order

Recommended continuation:

```text
Phase 1 — Specification                         ✅ Complete
Phase 2 — Minimal Runtime                       ✅ Complete
Phase 3 — Initial Categories                    ✅ Complete
Phase 4 — Constraint Registry                   ✅ Complete

Phase 5 — Host-Native Product Boundary          ← Next
Phase 6 — Reasoning Strategy Library
Phase 7 — Validation Expansion
Phase 8 — Automatic Phase / Category Resolution
Phase 9 — Traceability and Debugging
Phase 10 — Evaluation
Phase 11 — First Real Host Plugin
```

The exact numbering may change, but the host-native boundary must be introduced before the architecture becomes more deeply coupled to direct model invocation.

---

## 15. First Host Strategy

Do not design abstractions for many hosts before implementing one real integration.

Recommended approach:

```text
Core Engine
    ↓
Host Adapter Contract
    ↓
One Real Plugin
    ↓
Measure Gaps
    ↓
Refine Host Adapter
    ↓
Add Second Host
```

The first host should be selected based on:

- plugin lifecycle hooks,
- output observation capability,
- tool interception capability,
- local state support,
- ease of installation,
- active user base,
- fit with coding and general task use cases.

Avoid building a universal host abstraction from theory alone.

---

## 16. MVP Shipping Definition

The MVP should contain:

```text
1 Self-Contained Local Plugin

1 Behavioral Runtime

1 Host Adapter

1 Host Capability Model

1 Permission Policy

3 Categories:
- discussion
- task_execution
- coding_task

1 Constraint Registry

5 Initial Reasoning Strategies:
- constraint_analysis
- evidence_gathering
- root_cause_analysis
- tradeoff_analysis
- verification

3 Validators:
- schema
- constraints
- completion criteria

1 Local State Store

1 Trace System
```

Explicitly excluded from MVP:

```text
Hosted backend
Public SDK requirement
Direct provider API requirement
Mandatory model routing
Mandatory multi-agent execution
Plugin marketplace
Third-party plugin ecosystem
Distributed execution
```

---

## 17. Product Definition

The product should be described as:

> **A self-contained local behavioral runtime delivered through host-native AI plugins. It standardizes how AI interactions are categorized, reasoned through, constrained, validated, and transitioned while leaving model execution to the host.**

Not:

> AI SDK

Not:

> Hosted AI runtime platform

Not:

> Model-provider wrapper

Not:

> Multi-agent framework

---

## 18. Architectural Guardrails

Future implementation must preserve these invariants:

1. The product is plugin-first.
2. The product is local-first.
3. The host owns model execution.
4. The plugin owns behavioral governance.
5. The core does not require provider credentials.
6. The core does not require a hosted backend.
7. The core does not require multi-agent execution.
8. The core does not require model routing.
9. The runtime owns state, transitions, constraints, permissions, and validation.
10. The model receives only the minimal effective step contract.
11. Validation is first-class.
12. Coding remains a dedicated category.
13. Categories stay broad.
14. Modifiers are preferred over deep inheritance.
15. Deterministic software should replace model judgment wherever practical.
16. Enforcement guarantees must match actual host capabilities.
17. Host-specific features must not leak into protocol semantics.

---

## 19. Main Risk to Avoid

The biggest architectural risk is accidentally building:

```text
Application
→ Behavioral Runtime
→ Model Executor
→ Provider API
```

while the intended product is:

```text
AI Host
    ↕
Self-Contained Local Plugin
├── Runtime
├── Protocols
├── Constraints
├── Workflow
├── Validation
├── Permissions
├── State
└── Host Adapter

Host executes the model.
Plugin governs behavior.
```

The engine is already useful.

The next priority is making sure the product boundary matches how the system will actually ship.

---

## 20. Decision Summary

### Keep

- current protocol model,
- broad categories,
- dedicated coding category,
- constraint registry,
- workflow engine,
- step contracts,
- reasoning strategies,
- validation,
- runtime-owned transitions,
- traceability,
- optional model routing,
- optional multi-agent execution.

### Change

- direct model execution must not be mandatory,
- `ModelExecutor` must become optional,
- step preparation and result submission must be separate,
- host adapters must become first-class,
- host capabilities must be explicit,
- enforcement levels must be explicit,
- permissions must become first-class runtime state,
- plugin-first and local-first must become product invariants.

### Next

> Implement the host-native product boundary before continuing deeper into the remaining roadmap.
