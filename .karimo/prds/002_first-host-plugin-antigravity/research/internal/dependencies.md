# Internal Codebase Dependencies - Antigravity Host Plugin

## Discovered Dependencies

### 1. Internal Imports
* The host plugin must import `HostAdapter`, `HostCapabilities`, `BehavioralRuntime`, `ValidationContext`, and `ExecutionResult` from the core runtime packages (`src/index.ts`).

### 2. External / System Dependencies
* Standard Node.js `http` module is required to listen on `ORCA_AGENT_HOOK_PORT` and handle standard webhook requests.
* Standard Node.js `fs/promises` is required to manage state persistency files locally.
