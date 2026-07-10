# Internal Codebase Structure - Antigravity Host Plugin

## Structure Overview

### 1. Build and Run Configurations
* Main files reside in `src/`. Compiled output target is ESM and builds via `tsconfig.build.json` to `dist/`.
* Test files are located in `tests/` and run under Node.js using ESM (`node dist/tests/*.js`).

### 2. Proposed Directory Layout for Host Plugin
* The host plugin code will live under [src/host/antigravity/](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/src/host/antigravity/) to keep it isolated from the core engine.
* Tests will live in [tests/phase11-antigravity-plugin.test.ts](file:///d:/workspaces/coding/projects/ai-behavioral-runtime/tests/phase11-antigravity-plugin.test.ts).
