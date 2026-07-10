# Codebase Structure Analysis

This document describes the structure and organization of the behavioral runtime repository.

## 1. Project Organization
The project organizes its source code in a modular, domain-driven structure under `src/`:

```text
src/
├── spec/                       # Protocol schema & type declarations
│   ├── constraints.ts
│   ├── execution.ts
│   ├── host.ts
│   ├── index.ts
│   ├── permissions.ts
│   ├── phases.ts
│   ├── primitives.ts
│   ├── protocol.ts
│   ├── reasoning.ts
│   ├── trace.ts
│   ├── validation.ts
│   └── workflow.ts
│
├── runtime/                    # Core engine implementation
│   ├── behavioral-runtime.ts   # Central orchestrator
│   ├── errors.ts               # Core error classes
│   ├── host-governance.ts      # Host capabilities & enforcement level matching
│   ├── index.ts
│   ├── protocol-registry.ts    # Dynamic resolution of category protocol properties
│   ├── state-store.ts          # State storage contract & default memory implementation
│   ├── step-compiler.ts        # Dynamic compilation of step contracts
│   ├── transition-resolver.ts  # Step-to-step state transition manager
│   ├── types.ts                # Runtime-specific state & execution interfaces
│   └── validation.ts           # Validation pipeline & built-in validator handlers
│
├── constraints/                # Constraint registration & verification
│   ├── extractor.ts            # Constraint instruction parser
│   ├── index.ts
│   ├── registry.ts             # Snapshot constraint store
│   └── types.ts
│
├── protocol/                   # Concrete protocol files
│   └── ...
│
└── index.ts                    # Root export definition
```

## 2. Testing Structure
Tests are housed in a flat `tests/` directory at the project root:
* Tests are named corresponding to features/phases (e.g. `phase5-host-native-boundary.test.ts`, `phase6-reasoning-strategies.test.ts`).
* The test execution relies on a manual assertion-based runner executed via compiled javascript files inside `dist/tests/`.
* The build output is structured in `dist/` mirroring the source files structure.
