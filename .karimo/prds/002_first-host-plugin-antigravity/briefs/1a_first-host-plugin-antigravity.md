# Task Brief: 1a - Define Antigravity Host Adapter and Capability Mapping

## Objective
Implement `AntigravityHostAdapter` conforming to `HostAdapter` with explicit capability flags.

## Context
* We need to define `ANTIGRAVITY_HOST_CAPABILITIES` with all capabilities enabled (`canInjectInstructions: true`, `canObserveModelOutput: true`, `canObserveToolCalls: true`, `canBlockToolCalls: true`, `canTriggerAdditionalTurns: true`, `canPersistLocalState: true`, `canSelectModel: true`, `supportsStructuredOutput: true`, `canBlockModelOutput: true`, `toolCallInterceptionScope: "complete"`).
* Define the adapter class `AntigravityHostAdapter` implementing the spec's `HostAdapter` interface.

## Proposed Changes
* Create [src/host/antigravity/adapter.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/host/antigravity/adapter.ts).

## Success Criteria
* Conforms strictly to the `HostAdapter` interface.
* Capabilities map accurately to complete governance.
