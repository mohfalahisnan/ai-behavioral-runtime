# Internal Codebase Patterns - Antigravity Host Plugin

## Discovered Patterns

### 1. HostAdapter and HostCapabilities
* Defined in [src/spec/host.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/spec/host.ts).
* Supports optional methods: `injectInstructions`, `observeModelOutput`, `observeToolCall`, and `blockToolCall`.
* Uses `HostCapabilities` properties to determine capability notes, tool interception scope, and structured outputs.

### 2. Enforcement Level Resolution
* Resolved in [src/runtime/host-governance.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/runtime/host-governance.ts#L16).
* Dynamically returns `"fully_governed"`, `"interceptable"`, `"observable"`, or `"prompt_only"` depending on what capability flags are set on the adapter.

### 3. Step Preparation and Result Submission Lifecycle
* Handled in [src/runtime/behavioral-runtime.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/runtime/behavioral-runtime.ts).
* Calls `prepareCurrentStep(runId)` to compile the active step contract.
* Calls `submitStepResult(runId, execution)` to validate and transition.
