# Phase 2 — Minimal Runtime

Phase 2 implements the smallest executable runtime around the Phase 1 contracts.

## Implemented flow

```text
Manual Category Selection
        ↓
Resolve Effective Protocol
        ↓
Initialize Run State
        ↓
Compile Current Step Contract
        ↓
Validate Step Input Contract
        ↓
ModelExecutor
        ↓
Validate Output + Completion Criteria
        ↓
Resolve Legal Transition
        ↓
Persist State + Trace
```

## Runtime ownership

The runtime now owns:

- selected category,
- active step,
- protocol and strategy resolution,
- relevant constraint selection,
- input-contract checks,
- output validation,
- retry limits,
- transition authorization,
- run state,
- execution traces.

The model receives only `ModelExecutionInput`, containing:

- run and phase identifiers,
- one compiled `EffectiveStepContract`,
- current JSON context.

It does not receive the entire protocol library.

## Main modules

```text
src/runtime/
├── behavioral-runtime.ts
├── errors.ts
├── protocol-registry.ts
├── state-store.ts
├── step-compiler.ts
├── transition-resolver.ts
├── types.ts
├── validation.ts
└── index.ts
```

## Effective step compilation

For the active step, the compiler resolves:

```text
Base rules
+ Category rules
+ Modifier rules
+ Universal reasoning
+ Category reasoning
+ Modifier reasoning
+ Full reasoning strategy definitions
+ Relevant constraints
+ Step contracts
+ Validation contract
+ Completion criteria
```

Only that minimal compiled contract crosses the model execution boundary.

## Validation behavior

Phase 2 includes deterministic checks for:

- required input fields before model execution,
- required output fields after model execution,
- required completion-criteria claims,
- declared schema rules through the built-in schema handler,
- constraint compliance when constraints are active.

Unknown required validator kinds fail closed as `inconclusive` instead of silently passing.

## Transition behavior

The runtime can authorize:

- `continue`,
- `retry`,
- `block`,
- `complete`.

`replan` remains represented in the specification but automatic replanning is intentionally not implemented in Phase 2. A replan request blocks the run instead of giving the model uncontrolled authority to rewrite the workflow.

## State persistence

Phase 2 ships with `InMemoryRuntimeStateStore` behind the `RuntimeStateStore` interface.

This satisfies the minimal runtime requirement while preserving a clean boundary for future durable stores.

## Smoke test

```bash
npm run smoke
```

The smoke test proves:

1. manual category selection,
2. entry-step initialization,
3. effective step compilation,
4. successful transition,
5. output validation failure,
6. bounded retry,
7. successful completion,
8. four execution traces,
9. invalid input blocks before model execution.

Expected core sequence:

```text
understand-position
  passed → continue

analyze-and-challenge
  failed → retry

analyze-and-challenge
  passed → continue

respond
  passed → complete
```

A second run intentionally omits a required input field and is blocked before `ModelExecutor.execute()` is called.

## Phase 2 scope exclusions

Still excluded:

- automatic category classification,
- automatic phase resolution,
- model routing,
- multi-agent execution,
- provider-specific model clients,
- durable database persistence,
- automatic replanning.
