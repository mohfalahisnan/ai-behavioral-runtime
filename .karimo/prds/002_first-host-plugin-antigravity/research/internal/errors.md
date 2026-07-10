# Internal Codebase Errors - Antigravity Host Plugin

## Discovered Error Patterns

### 1. Specification and State Errors
* Defined in [src/runtime/errors.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/runtime/errors.ts).
* `SpecificationError` is thrown when protocols, workflows, steps, or reasoning strategies are missing or duplicated.
* `InvalidRunStateError` is thrown when attempting to transition an invalid run or duplicate run IDs.

### 2. Validation Failures
* When `ValidationPipeline.validate` determines validation results have `"failed"`, the runtime blocks transitions unless a valid `retry` policy is matching.
* Custom validator callback errors must be caught and converted to `"failed"` status results.
