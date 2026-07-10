# AI Behavioral Runtime

A model-agnostic behavioral runtime for making AI behavior more predictable, inspectable, correctable, and portable across different model providers.

## Core architecture

```text
Protocol
→ Workflow
→ Step
→ Reasoning
→ Execution
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
- generic single-model execution boundary,
- deterministic input and output checks,
- validation-driven continue, retry, block, and complete transitions,
- in-memory state persistence behind an interface,
- execution traces,
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

## Validation

```bash
npm run typecheck
npm test
npm run smoke
```

## Scope boundary

The core intentionally excludes mandatory:

- multi-agent execution,
- model routing,
- provider-specific APIs.

Those remain optional execution-layer concerns and must not change protocol semantics.
