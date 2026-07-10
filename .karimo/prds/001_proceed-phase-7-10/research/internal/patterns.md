# Codebase Patterns: Validation and Transitions

This document outlines the existing patterns in the codebase for validation, transition resolution, state storage, and tracing, which serves as the starting point for Phases 7-10.

## 1. Validation Pipeline Pattern
Validation is implemented as a pipeline processing structure. The core validation logic is defined in [validation.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/runtime/validation.ts):
* **Handler Registration**: `ValidationPipeline` constructor accepts an array of custom `ValidatorHandler` implementations.
* **Default Handlers**: Built-in handlers include `SchemaValidatorHandler` (verifies presence of output fields) and `ConstraintValidatorHandler` (verifies compliance status of relevant constraints).
* **Execution Flow**:
  1. Calls `#analyzeCompliance` to normalize, validate, and check the integrity of constraint compliance reported by the executor.
  2. Runs default validators for required output fields and completion criteria.
  3. Iterates over step-specific `validationContract.rules` and delegates validation to registered handlers matching the rule's `kind`.
  4. Aggregates results into a single `ValidationResult` containing status, detailed checks, and normalized constraint compliance.

## 2. Transition Resolution Pattern
Transitions are managed by the `TransitionResolver` class in [transition-resolver.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/runtime/transition-resolver.ts):
* **Matching Criteria**: Steps through allowed transitions. A transition matches if:
  1. Its validation status requirements match the computed validation status.
  2. The execution completed criteria includes all completion criteria required by the transition.
* **Action Types**: Handles actions such as `continue`, `retry`, `block`, `complete`, and `replan`.
* **Retry Policy**: Evaluates `retry` actions against the step's `retryPolicy` (i.e. check `maxAttempts` and `retryOn` statuses). If the limit is reached or the status isn't retryable, the transition falls back to `block`.

## 3. Host Governance and Permissions
The boundary between runtime governance and host model execution is defined in [behavioral-runtime.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/runtime/behavioral-runtime.ts):
* **Preparation**: `prepareCurrentStep()` compiles the contract and runs input contract verification. If validation fails, it blocks.
* **Submission**: `submitStepResult()` runs validation on the submitted result, invokes the transition resolver, updates run state, creates a trace, and stores the updated state.
* **Interception**: Host governance is mapped to `HostCapabilities` and `EnforcementLevel` (prompt-only, observable, interceptable, fully-governed) in [host-governance.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/runtime/host-governance.ts).

## 4. Trace Recording Pattern
Traces are recorded for each step execution in `#createTrace()` in [behavioral-runtime.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/runtime/behavioral-runtime.ts). Traces record:
* Basic execution context (`runId`, `phaseId`, `stepId`, `protocol` identifiers).
* Computed `validation` details.
* The resolved `transition` action and reason.
* Host `governance` parameters (`hostCapabilities`, `enforcementLevel`, `permissionPolicy`).
* Raw `execution` output/result (if step execution occurred).
