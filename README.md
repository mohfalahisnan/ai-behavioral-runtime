# AI Behavioral Runtime

A self-contained local behavioral runtime delivered through host-native AI plugins. The plugin governs behavior; the host owns model execution.

## Core architecture

```text
Protocol
→ Workflow
→ Prepare Step
→ Host Model Execution
→ Submit Result
→ Validation
→ Transition
```

Core rule:

> **The model reasons. The runtime governs. Validation decides whether execution may continue.**

## Current status

**Phase 4 — Constraint Registry** is implemented.

The repository currently contains:

- strict TypeScript contracts for the protocol vocabulary,
- a protocol registry with conflict and reference validation,
- manual category selection and workflow initialization,
- minimal effective step-contract compilation,
- resolved reasoning strategy definitions,
- relevant constraint selection,
- deterministic explicit constraint extraction with stable semantic IDs,
- immutable constraint snapshots with registration and reaffirmation history,
- ignored-constraint reasons and complete per-step compliance accounting,
- explicit completed-phase transitions that preserve registry history and traces,
- executor-free `prepareCurrentStep()` / `submitStepResult()` lifecycle,
- optional direct `ModelExecutor` convenience execution,
- host capability and enforcement-level modeling,
- first-class persisted permission policy,
- governance facts in execution traces,
- local persistence behind `RuntimeStateStore`,
- three declarative categories: `discussion`, `task_execution`, and `coding_task`,
- distinct validation-driven workflows on one generic runtime,
- manual category selection through `StartRunInput.categoryId`,
- an end-to-end smoke test with both retry and block failure paths.

## Documentation

- [Implementation plan](docs/PLAN.md)
- [Phase 1 specification](docs/specification/README.md)
- [Phase 2 minimal runtime](docs/runtime/README.md)
- [Phase 3 initial category protocols](docs/protocols/README.md)
- [Phase 4 constraint registry](docs/constraints/README.md)
- [Protocol vocabulary](docs/specification/vocabulary.md)
- [Core invariants](docs/specification/invariants.md)
- [Host-native product boundary](docs/HOST-NATIVE-PRODUCT-BOUNDARY.md)
- [Host-native runtime lifecycle](docs/runtime/host-native-lifecycle.md)
- [First host target](docs/hosts/first-host-target.md)
- [Phase 5 implementation plan](docs/superpowers/plans/2026-07-10-phase-5-host-native-product-boundary.md)

## Validation

```bash
npm run typecheck
npm test
npm run smoke
```

## Scope boundary

The product is plugin-first and local-first. It does not require:

- a hosted backend,
- a public SDK,
- direct provider API credentials,
- mandatory model routing,
- mandatory multi-agent execution.

The host owns model execution. Host-specific capabilities must not leak into protocol semantics, and enforcement claims must match actual hooks.
