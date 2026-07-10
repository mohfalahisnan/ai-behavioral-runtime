# Codebase Gaps and Architectural Issues (Phases 7-10)

This document lists the gaps, missing features, and architectural inconsistencies in the current runtime implementation that must be addressed in Phases 7-10.

## 1. Phase 7: Incomplete Validation Framework
* **Missing Validators**: The spec defines `ValidatorKind` as including `"completion_criteria"`, `"deterministic"`, `"tool_result"`, `"test"`, `"external_evidence"`, `"model"`, and `"human"`. However, in [validation.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/runtime/validation.ts), only `SchemaValidatorHandler` (`"schema"`) and `ConstraintValidatorHandler` (`"constraint"`) are implemented as dedicated handlers. The rest of the kinds are either hardcoded inline or not implemented at all.
* **Deterministic Callbacks & Tool-result / Test Validation**: There are no default handlers for run-time deterministic functions (e.g. running unit tests or inspecting file output) or registering host tool results/test evidence into validation context.
* **No Model-based Evaluator**: There is no handler that runs a secondary model execution to evaluate output when deterministic validators cannot decide.

## 2. Phase 8: Lack of Automatic Phase & Category Resolution
* **Manual Control Only**: Transitioning between categories/phases relies entirely on manual client calls (`transitionPhase()`). The runtime has no automatic resolution classifier to map input turns to `categoryId` or `modifierIds`.
* **Ambiguity Handling**: There is no mechanism to handle low-confidence turn classifications or prompt the user for clarification when classification is ambiguous.
* **Permissions vs Classification**: No boundary separates permissions from auto-classification. If classification fails or is ambiguous, it should never bypass strict host-native permissions.

## 3. Phase 9: Traceability & Debugging Gaps
* **Opaque Transitions & Executions**: While traces are stored in the state, they are represented as flat logs. There is no trace query interface or trace replay system to inspect why a transition was chosen or replay a prior execution run step-by-step.
* **Trace Detail**: Traces record metadata but lack diagnostic explanations (e.g., specific rules evaluated, exact mismatches in the schema, or details of the retry history of the active step).

## 4. Phase 10: Evaluation Gaps
* **No Evaluation Scripts**: There are no benchmarks, prompt templates, or evaluation harnesses in the project to compare the effectiveness of the runtime (`E`) against normal baseline prompting (`A`), giant universal prompts (`B`), or intermediate step-specific reasoning strategies (`C`/`D`).
* **Unimplemented Transition Logic**:
  * The transition action `replan` in `behavioral-runtime.ts` [line 542](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/runtime/behavioral-runtime.ts#L542) throws an error: `Replan was requested, but Phase 2 does not implement automatic replanning`.
