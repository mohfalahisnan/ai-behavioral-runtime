# Consolidated Internal Research: Phases 7-10

This document consolidates findings from internal analysis of the codebase, focusing on implementation paths for Phases 7, 8, 9, and 10 of the AI Behavioral Runtime.

## 1. Validation Framework (Phase 7)
* **Status**: Validation currently uses a simple hardcoded pipeline (`ValidationPipeline`) in [validation.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/runtime/validation.ts).
* **Missing Components**: We need to implement concrete classes for all kinds in `ValidatorKind` (spec/validation.ts):
  * `"completion_criteria"`: Validates that the model reports all required completion criteria.
  * `"deterministic"`: Allows client-side JavaScript callback validation.
  * `"tool_result"` and `"test"`: Validates output against tool execution outputs or automated test outcomes.
  * `"model"`: Runs a secondary evaluation prompt.
* **Proposed Implementation**:
  1. Define a general `Validator` interface that can process rules and contexts asynchronously.
  2. Implement registry methods inside the `ValidationPipeline` to allow registration of custom handlers.
  3. Wire the validators to support bounded retries using the transition resolver.

## 2. Automatic Phase & Category Resolution (Phase 8)
* **Status**: The runtime currently starts and runs in a category specified explicitly by the caller.
* **Gaps**: There is no classifier that evaluates raw input turns to detect:
  * The target `categoryId` (e.g. `discussion`, `coding_task`, `task_execution`).
  * Active `modifierIds` (e.g. `concise`, `exploratory`, `critical`).
* **Proposed Implementation**:
  1. Create a `TurnResolver` or `CategoryResolver` component.
  2. Define an interface for category/modifier classification (e.g., using a small model execution or simple string heuristics).
  3. Ensure resolver output is inspectable, supports manual overrides, and never overrides explicit permission policy checks.

## 3. Traceability & Debugging (Phase 9)
* **Status**: Flat traces are appended to `traces` in state, recording execution input, output, validation checks, and transition decisions.
* **Proposed Implementation**:
  1. Create a utility class or query interface (e.g., `TraceInspector` or `TraceQuery`) to filter and extract decisions.
  2. Implement verification/replay methods that can feed past traces back into the runtime state store to verify deterministic outcomes or replay transitions step-by-step.

## 4. Evaluation (Phase 10)
* **Status**: No benchmarks exist.
* **Proposed Implementation**:
  1. Design a set of standard tasks and write a benchmark suite.
  2. Measure execution metrics (success rate, constraint violation rate, token usage, latency, retries, variance) across different prompt strategies:
     * Baseline prompting.
     * Giant universal prompt.
     * Runtime-governed category protocols.
     * Step-specific reasoning strategies.
     * Full runtime (resolution, validation, constraints).
