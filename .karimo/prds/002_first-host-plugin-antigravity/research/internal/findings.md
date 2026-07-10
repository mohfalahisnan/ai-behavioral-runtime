# Consolidated Internal Findings - Antigravity Host Plugin

We analyzed the codebase and mapped the core requirements to construct a self-contained local Antigravity host plugin:

1. **Host Adapter**: We must implement `AntigravityHostAdapter` adhering to `HostAdapter` with `ANTIGRAVITY_HOST_CAPABILITIES` (enabling full interception).
2. **Hook Integration**: The standard Orca hooks execute powershell to call `http://127.0.0.1:%ORCA_AGENT_HOOK_PORT%/hook/antigravity`. The plugin must launch a native Node `http` server on that port.
3. **Runtime Coordination**: The server will receive JSON webhooks and trigger the correct runtime step lifecycle hooks (`prepareCurrentStep` on `PreInvocation`, `submitStepResult` on `Stop`).
