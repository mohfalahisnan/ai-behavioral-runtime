# Progress

Last updated: 2026-07-10

## Current Status

| Phase | Status | Summary |
|---|---|---|
| Phase 1 — Specification | ✅ Completed | Core vocabulary, interfaces, protocol definitions, workflow model, reasoning strategy model, validation, transitions, traces, and model execution boundary defined. |
| Phase 2 — Minimal Runtime | ✅ Completed | Minimal behavioral runtime implemented with protocol loading, workflow execution, step contract compilation, model execution, validation, tracing, and runtime-controlled transitions. |
| Phase 3 — Initial Categories | ✅ Completed | Added and validated `discussion`, `task_execution`, and `coding_task` on the same declarative runtime. |
| Phase 4 — Constraint Registry | ✅ Completed | Added deterministic explicit extraction, immutable registry history, step relevance metadata, complete compliance reporting, and caller-authorized phase transitions. |
| Phase 5 — Host-Native Product Boundary | ✅ Completed | Added executor-free prepare/submit, optional direct execution, host governance contracts, persisted permissions, local lifecycle docs, and Claude Code as first host. |
| Phase 6 — Reasoning Strategy Library | ✅ Completed | Added eight reusable strategies, complete observable contracts, definition validation, workflow mappings, and regression coverage. |
| Phase 7 — Validation Framework | ✅ Completed | Exposed generic Validator interface and concrete validator handlers (completion criteria, deterministic callbacks, model evaluation), wored with bounded retries. |
| Phase 8 — Auto Turn Resolution | ✅ Completed | Created TurnResolver supporting LLM turn classification and keyword heuristics, fully integrated into the runtime. |
| Phase 9 — Traceability & Debugging | ✅ Completed | Created TraceInspector providing query, filter, and a deterministic step-by-step replay harness. |
| Phase 10 — Evaluation | ✅ Completed | Developed evaluation suite comparing prompting paradigms. |

## Phase 1 — Specification

**Status:** ✅ Completed

Deliverables completed:

- protocol vocabulary
- category definitions
- modifier model
- constraint model
- workflow definition model
- workflow step model
- reasoning strategy model
- validation model
- transition model
- trace model
- provider-agnostic `ModelExecutor` boundary

## Phase 2 — Minimal Runtime

**Status:** ✅ Completed

Implemented runtime flow:

```text
User Input
→ Manually Select Category
→ Load Protocol
→ Start Workflow
→ Compile Current Step Contract
→ Execute Model
→ Validate Output
→ Transition
```

Completed capabilities:

- workflow state persistence
- externally controlled active step
- effective step contract compilation
- model execution through a generic executor boundary
- validation that can reject execution results
- runtime-controlled `continue`, `retry`, `block`, and `complete` transitions
- execution traces including model execution results
- Phase 2 smoke example and build scripts

### Code Review (2026-07-10)

Reviewed 2 commits (`b85e387`, `c6e2c46`) — refactors to spec layer.

| Finding | Priority | Status |
|---|---|---|
| `reasoningStrategies` required but missing in example literal | P1 | ✅ Fixed (pull `5b06a6b`) |
| Spread type regression in `behavioral-runtime.ts` (JsonObject extraction) | P1 | ✅ Fixed (pull `5b06a6b`) |
| 22 runtime-layer type errors (`EffectiveStepContract`, `completedCriteria`, etc.) | P1 | ✅ Fixed (pull `5b06a6b`) |
| No referential integrity check for `strategyId` refs in workflow steps | P2 | ✅ Fixed — `ProtocolRegistry#validateWorkflows` (pull `5b06a6b`) |
| `JsonArray` not exported alongside `JsonObject` | P2 | ✅ Fixed — exported `JsonArray` in `primitives.ts` |
| No type-level tests for `JsonObject` / `JsonArray` | P2 | ✅ Closed in Phase 3 with valid nested assignments and rejected non-JSON values |
| `JsonObject` / `JsonArray` missing JSDoc | P3 | ✅ Fixed — added doc comments |

`tsc --noEmit` passes clean (0 errors) after all fixes.

## Phase 3 — Initial Categories

**Status:** ✅ Completed

Implemented categories:

- `discussion`
- `task_execution`
- `coding_task`

Exit criteria:

- ✅ all three categories use the same runtime and generic executor
- ✅ categories differ through declarative protocol definitions
- ✅ no category-specific runtime code was added
- ✅ required category IDs are tested by containment and uniqueness
- ✅ `JsonObject` / `JsonArray` type-test debt is closed

Validation evidence:

- `npm run test:phase3` — passed
- `npm run typecheck` — passed
- `npm run build` — passed

## Phase 4

**Status:** ✅ Completed

Implemented capabilities:

- deterministic structured extraction with whitespace normalization and stable semantic IDs
- original instruction traceability and collision rejection
- immutable registry snapshots with registration and reaffirmation history
- selector precedence with explicit ignored reasons
- relevant and ignored constraints in compiled step contracts
- complete compliance records for every visible registry constraint
- deterministic rejection of unknown and duplicate executor compliance IDs
- explicit phase transitions only after completion, preserving context, traces, constraints, and history
- reset step and retry counters at the next category entry step

Validation evidence:

- `npm run test:phase4` — passed
- `npm test` — Phase 3 and Phase 4 passed
- `npm run typecheck` — passed
- `npm run smoke` — passed
- `git diff --check` — passed

## Phase 5 — Host-Native Product Boundary

**Status:** ✅ Completed

Delivered:

- separate `prepareCurrentStep()` from `submitStepResult()`
- make `ModelExecutor` optional and keep `executeCurrentStep()` as a convenience helper
- define `HostAdapter`, `HostCapabilities`, and explicit `EnforcementLevel`
- add first-class `PermissionPolicy` to runtime state
- record enforcement and permissions in traces
- document the plugin lifecycle and local persistence boundary
- record Claude Code as the first host and Codex as the second compatibility target
- classify Claude Code as `interceptable` and preserve per-tool capability caveats
- update product documentation to plugin-first, local-first ownership

Validation evidence:

- `npm run typecheck` — passed
- `npm test` — passed
- `npm run smoke` — passed
- `npm run smoke:host-native` — passed
- `npm run build` — passed
- `git diff --check` — passed

## Phase 6 — Reasoning Strategy Library

**Status:** ✅ Completed

Delivered:

- eight reusable strategy definitions
- required objectives, behaviors, checks, prohibited shortcuts, and evidence expectations
- deterministic definition-integrity validation
- approved strategy mappings without workflow-shape changes
- host-native and direct-executor contract compatibility
- observable behavior and evidence expectations without hidden chain-of-thought

Validation evidence:

- `npm run typecheck` — passed
- `npm test` — passed
- `npm run smoke` — passed
- `npm run smoke:host-native` — passed
- `npm run build` — passed
- `git diff --check` — passed

## Phase 7 — Validation Framework

**Status:** ✅ Completed

Exposed deliverables:
- Generic `Validator` and `ValidatorHandler` interfaces.
- Dynamic registry in `ValidationPipeline` to add and execute custom handlers.
- Concrete classes: `CompletionCriteriaValidatorHandler`, `DeterministicValidatorHandler` (dynamic JavaScript validation callbacks), and `ModelValidatorHandler` (secondary evaluation model execution).
- Bounded retries connected with validation outcomes.

## Phase 8 — Auto Turn Resolution

**Status:** ✅ Completed

Exposed deliverables:
- Created `TurnResolver` supporting LLM turn classification and keyword fallback logic.
- Exposed turn resolution interface on the central `BehavioralRuntime`.

## Phase 9 — Traceability & Debugging

**Status:** ✅ Completed

Exposed deliverables:
- Created `TraceInspector` offering query and filter capabilities on stored step traces.
- Built a deterministic replay harness that mock-runs traces to verify validation/transition results step-by-step.

## Phase 10 — Evaluation

**Status:** ✅ Completed

Exposed deliverables:
- Built a comprehensive test and evaluation suite comparing prompting paradigms.
- Verified resolution, custom/completion validation, and replay functionality.

Validation evidence:
- `npm test` — all tests passed including Phase 10 validation/replay benchmarks.
