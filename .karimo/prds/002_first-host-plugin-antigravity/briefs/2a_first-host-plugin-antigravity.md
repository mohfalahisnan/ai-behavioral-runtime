# Task Brief: 2a - Implement Lightweight native HTTP Hook Server

## Objective
Implement `AntigravityHookServer` using Node's standard `http` module to handle local webhooks.

## Context
* Standard Orca hook scripts send POST requests to `http://127.0.0.1:%ORCA_AGENT_HOOK_PORT%/hook/antigravity`.
* Parse body payload chunks safely.
* Dispatch callbacks for `PreInvocation`, `PostToolUse`, `Stop`, and `PostInvocation` events.

## Proposed Changes
* Create [src/host/antigravity/server.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/host/antigravity/server.ts).

## Success Criteria
* Runs without external framework dependencies (like Express).
* Safely starts and stops the Node http server.
