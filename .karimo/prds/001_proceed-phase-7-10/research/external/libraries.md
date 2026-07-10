# Library Evaluation: Validation, Classification, and Tracing

This document evaluates third-party packages and libraries to implement validation, classification, and trace replaying.

## 1. Schema Validation Libraries

| Library | Performance | Developer Experience (DX) | Bundle Size | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Zod** | Moderate | Excellent | Large | **Recommended** for standard runtime schema validation where developer productivity and ecosystem compatibility are key. |
| **TypeBox** | High | Good | Moderate | **Highly Recommended** if native JSON Schema compliance or direct interop with OpenAPI/Fastify is required. |
| **Ajv** | Extremely High | Poor (no TS type gen) | Small | Recommended only for high-throughput JSON Schema checks where raw speed is the bottleneck. |
| **Valibot** | Moderate | Good | Very Small | Best for edge computing and browser environments where bundle sizes are highly constrained. |

* **Selection**: For the AI Behavioral Runtime, **TypeBox** is a strong fit if we want declarative JSON Schema protocols. However, **Zod** provides the best out-of-the-box TypeScript developer experience.

## 2. Turn Classification and Intent Resolution
* **LLM-based classification**: Run a lightweight model (e.g. Gemini 2.5 Flash / Claude Haiku) with strict structured outputs.
* **Natural language classifier**: Simple string heuristics or keyword-based classifiers can act as fallback mechanisms if model calls fail or are not allowed.

## 3. Tracing and Auditing
* **JSONL storage**: Storing traces in local JSONL (JSON Lines) files is simple, performant, and allows grep-based querying.
* **Trace-based Replay**: Replaying past traces can be implemented via a local CLI script that mocks the model executor and runs the state machine using the input and output recorded in the trace.
