# Task Brief: 3a - Implement Plugin Orchestrator and Hook Lifecycle Coordinator

## Objective
Implement `AntigravityPlugin` to unify `BehavioralRuntime`, the server callbacks, and the host adapter execution lifecycle.

## Context
* Coordinate webhook payloads with preparation and verification:
  * `PreInvocation` -> call `runtime.prepareCurrentStep()` and inject context/instructions.
  * `PostToolUse` -> evaluate tool validation.
  * `Stop` -> call `runtime.submitStepResult()`.
  * `PostInvocation` -> complete transitions and persist execution traces.

## Proposed Changes
* Create [src/host/antigravity/plugin.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/host/antigravity/plugin.ts).

## Success Criteria
* Correctly transitions states upon receiving hook payloads.
* Standardized callback hook pipeline matches execution expectations.
