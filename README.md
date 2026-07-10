# AI Behavioral Runtime

A model-agnostic behavioral runtime for making AI interactions more predictable, inspectable, correctable, and portable across model providers.

## Core idea

```text
Protocol
→ Workflow
→ Step
→ Reasoning
→ Execution
→ Validation
→ Transition
```

The runtime governs state, constraints, permissions, validation, retries, and transitions. The model performs bounded reasoning and generation inside the active step contract.

## Current status

Architecture and implementation planning phase.

## Docs

- [Implementation Plan](docs/PLAN.md)

## Initial scope

- Single-model core runtime
- Broad category protocols
- Step-specific reasoning strategies
- Constraint registry
- First-class validation
- Runtime-owned transitions
- Traceability and replay

Multi-agent execution and model routing are intentionally excluded from the core architecture and remain optional future extensions.
