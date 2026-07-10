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

**Phase 1 — Specification** is implemented.

The repository currently contains:

- strict TypeScript contracts for the core protocol vocabulary,
- broad category and modifier abstractions,
- workflow steps and runtime-controlled transitions,
- reusable reasoning strategy definitions,
- a first-class constraint registry model,
- validation and trace contracts,
- a generic single-executor boundary,
- one complete declarative `discussion` category example.

## Documentation

- [Implementation plan](docs/PLAN.md)
- [Phase 1 specification](docs/specification/README.md)
- [Protocol vocabulary](docs/specification/vocabulary.md)
- [Core invariants](docs/specification/invariants.md)

## Type checking

```bash
npm run typecheck
```

## Scope boundary

The core specification intentionally excludes mandatory:

- multi-agent execution,
- model routing,
- provider-specific APIs.

Those remain optional execution-layer concerns and must not change protocol semantics.
