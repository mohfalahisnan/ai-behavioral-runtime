# Consolidated External Research: Phases 7-10

This document consolidates external research findings regarding runtime validation libraries, turn classification architectures, and trace replay patterns.

## 1. Validation Framework (Phase 7)
* **Library Recommendations**:
  * **Zod** is recommended for general-purpose runtime validation due to its clean API, widespread ecosystem, and native TypeScript type inference.
  * **TypeBox** is recommended if direct compatibility with JSON Schema is needed or if validation performance is a critical bottleneck.
* **Deterministic Evidence & Custom Callbacks**:
  * Custom validators (e.g. tool-based or test-based checks) should be decoupled from the core runtime engine. The runtime should accept custom asynchronous validator handlers (e.g., executing a local script or verifying file presence).

## 2. Automatic Turn Resolution (Phase 8)
* **Intent Routing Pattern**:
  * A lightweight "router" prompt (e.g., using Gemini Flash or Claude Haiku) is the standard method to classify user intent into discrete categories and modifiers.
  * To ensure reliability, turn classification must output strict, structured JSON (e.g., enforcing the schema via Structured Outputs).
* **Governance Boundary**:
  * Permissions must be evaluated independently of Turn Resolution. A turn classifier must only suggest categories and modifiers; it cannot override the security permission policy.

## 3. Traceability and Replay (Phase 9)
* **Structured Observability**:
  * Storing run traces in flat JSON Lines (JSONL) files is standard practice for local development, allowing grep-based searches and lightweight indexers.
* **Deterministic Replay Harness**:
  * Replaying traces is achieved by loading a saved JSON trace and mock-executing the runtime steps. This acts as a regression testing framework (trace-to-eval loop).

## 4. Evaluation Suite (Phase 10)
* **Metrics to Track**:
  * Task success rate.
  * Constraint adherence/violation rate.
  * Total token consumption and average latency.
  * Retry counts and execution variance across runs.
* **Comparison Setup**:
  * Compare a standard baseline prompt against a giant monolithic prompt, a category prompt, and the full behavioral runtime.
