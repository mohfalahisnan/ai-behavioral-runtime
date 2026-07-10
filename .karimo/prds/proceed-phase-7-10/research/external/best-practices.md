# External Best Practices: Validation, Routing, and Tracing

This document outlines industry best practices for runtime validation, intent routing, and execution tracing.

## 1. Advanced Schema and Constraint Validation
* **Decoupled validation pipeline**: Validate both inputs and outputs at each transition boundary using strict schemas (e.g., using Zod or JSON Schema).
* **Stateful bounded retries**: Retries should follow a stateful policy that checks the number of attempts and restricts loops. "Self-reflection passes" should formulate corrective prompts based on validation failures rather than repeating the same input.
* **Separation of transient and semantic errors**: Infrastructure failures (rate limits, network drops) require retry-with-backoff, whereas semantic failures (schema violations, constraint failures) require replanning or human intervention.

## 2. LLM Turn Classification and Intent Routing
* **Decoupling intent from execution**: Run a fast, lightweight "flash" classifier to determine the category and modifiers of a user's turn before invoking heavy reasoning.
* **Strict schema enforcement**: Classifiers must output a strictly structured format to prevent hallucinations during routing.
* **Permissions as a separate layer**: Permissions must never be determined or modified by turn classification. Auto-classification only suggests execution parameters; permissions remain static and host-governed.

## 3. Trace Auditing and Replay
* **Time-travel debugging**: Build tools that reconstruct runtime state step-by-step from past traces.
* **Trace-to-evaluation loops**: Turn production failure traces directly into regression tests to ensure changes do not break successful paths.
* **Structured observability**: Capture all context, model outputs, tool arguments, validation failures, and transitions in structured trace documents (e.g., JSON Lines format).
