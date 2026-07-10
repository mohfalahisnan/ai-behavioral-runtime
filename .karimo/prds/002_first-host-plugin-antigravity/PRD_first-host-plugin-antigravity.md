# PRD: first-host-plugin-antigravity

## 1. Vision & Goals
The objective of this phase is to build a self-contained local plugin for the Antigravity agent system. This plugin implements the host adapter boundary to observe, govern, and validate the agent's execution lifecycle.

---

## 2. Research Findings
* **Existing Patterns (Internal)**:
  * `HostAdapter` and `HostCapabilities` defined in the core spec support prompt injection, output observation, and tool call interception.
  * Runtime enforcement levels resolve dynamically based on these capability flags.
* **Best Practices & Libraries (External)**:
  * Zero-dependency native Node `http` server to listen on local webhook callbacks safely.
  * Asynchronous trace processing to accommodate short execution webhook timeouts (under 2 seconds).
  * Workspace file persistence under a local `.behavioral-runtime/` directory for run state and traces.

---

## 3. Scope Boundaries
* **In Scope**:
  * Implementation of `AntigravityHostAdapter` implementing `HostAdapter`.
  * Node-native HTTP hook server listening on `ORCA_AGENT_HOOK_PORT` and handling `/hook/antigravity` webhooks.
  * `AntigravityPlugin` orchestrating runtime lifecycle callback states (PreInvocation, PostToolUse, Stop, PostInvocation).
  * Automated testing verifying lifecycle hooks and simulated webhook callbacks.
* **Out of Scope**:
  * Real-time network telemetry servers.
  * Claude Code or Codex specific hooks (handled in separate plugins).

---

## 4. Tasks & Wave Breakdown
* **Wave 1**: Define Antigravity Host Adapter and Capability Mapping (Task 1a)
* **Wave 2**: Implement Lightweight native HTTP Hook Server (Task 2a)
* **Wave 3**: Implement Plugin Orchestrator and Hook Lifecycle Coordinator (Task 3a)
* **Wave 4**: Integrate workspace persistence and configuration loading (Task 4a)
* **Wave 5**: Build Test Suite for Antigravity Webhooks & Lifecycle Verification (Task 5a)
