# Task Brief: 5a - Build Test Suite for Antigravity Webhooks & Lifecycle Verification

## Objective
Build a comprehensive suite of integration tests verifying the hook lifecycle server and adapter using mock delivery payloads.

## Context
* We need to test the server startup and shutdown.
* Deliver simulated Orca hook requests to the server, verifying correct preparation, validation, and tracing states.
* Register task script under `package.json` and ensure it runs in `npm test`.

## Proposed Changes
* Create [tests/phase11-antigravity-plugin.test.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/tests/phase11-antigravity-plugin.test.ts).
* Update [package.json](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/package.json).

## Success Criteria
* All tests pass successfully.
* Verification suite runs cleanly under Node.js ESM.
