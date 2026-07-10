# Phase 4 Constraint Registry Implementation Plan

## Goal

Add deterministic, traceable constraint extraction and registry behavior without introducing Phase 5+ reasoning, validation-framework, category-resolution, model-routing, or multi-agent semantics into the runtime core.

## Fixed design decisions

- Extraction is deterministic and structured. The caller supplies explicit instruction text plus its `ConstraintKind`; the runtime does not infer natural-language intent.
- Normalize instruction text by trimming and collapsing internal whitespace. Preserve the original instruction text for traceability.
- Stable IDs derive only from normalized semantic content (`kind`, normalized rule, source, applicability). Re-extracting the same instruction produces the same ID.
- Hash collisions between different canonical constraint values must throw an explicit error. Do not resolve collisions by insertion-order suffixes.
- Duplicate semantic constraints are deduplicated in the active registry and recorded as reaffirmed in history.
- Selector precedence is: `exclude` wins; explicit `include` wins over applicability; otherwise `includeAllApplicable` defaults to true and respects `appliesTo`; remaining constraints are ignored with an explicit reason.
- Step contracts contain only relevant constraints in the existing `constraints` field and also expose ignored-constraint metadata.
- Validation returns one compliance record for every registry constraint visible to the step: executor-provided status for relevant constraints, `inconclusive` when relevant compliance is missing, and `not_applicable` plus a reason when selection ignored it.
- Unknown or duplicate executor compliance IDs must not silently pass. Surface them through deterministic validation checks.
- Add an explicit caller-driven phase-transition API. It may activate a new phase only after the prior phase completed. It preserves traces, context, registry constraints, and registry history; it resets the workflow step and per-step counters for the new category. The call itself is the external authorization boundary. No automatic phase/category resolution.
- Preserve provider independence and the single-model execution boundary. Category behavior remains declarative.

## Expected file map

- Create `src/constraints/extractor.ts`: structured extraction, canonicalization, stable ID generation, empty-instruction rejection.
- Create `src/constraints/registry.ts`: immutable snapshot registration, deduplication/reaffirmation history, relevance selection and ignored reasons.
- Create `src/constraints/index.ts`: public exports.
- Modify `src/spec/constraints.ts`: explicit-input, origin/history/snapshot, ignored-selection types; retain existing public constraint/compliance types where possible.
- Modify `src/spec/execution.ts`: expose ignored selection in the effective step contract.
- Modify `src/runtime/types.ts`: registry-backed run state and explicit phase-transition input while keeping `StartRunInput.userConstraints` compatibility.
- Modify `src/runtime/step-compiler.ts`: use the registry selector; no category-specific branch.
- Modify `src/runtime/behavioral-runtime.ts`: extract/register at start, preserve registry through explicit phase transition, compile/validate with selection metadata.
- Modify `src/runtime/validation.ts`: complete compliance report and deterministic unknown/duplicate/missing reporting.
- Modify public index files and package scripts.
- Create `tests/phase4-constraint-registry.test.ts`.
- Update `README.md`, `docs/protocols/README.md` or add a focused constraint-registry doc, and `PROGRESS.md`.
- Create `docs/superpowers/reports/2026-07-10-phase-4-implementation.md` with exact RED/GREEN command output summaries and commit SHA(s).

## Required TDD sequence

1. Add `test:phase4` and write focused failing tests before any production change.
2. Run `npm run test:phase4`. Record the expected RED failure caused by missing Phase 4 API/behavior, not a syntax mistake.
3. Implement the smallest production surface that makes the focused tests pass.
4. Run `npm run test:phase4` and record GREEN.
5. Run the full gate: `npm test`, `npm run typecheck`, `npm run smoke`, `git diff --check`.
6. Review the committed diff for accidental Phase 5+ scope and category-specific runtime branches.

## Required tests

- Equivalent explicit inputs with whitespace differences produce the same stable ID; changed semantics produce a different ID.
- Empty explicit instruction is rejected.
- A forced hash collision between different canonical values is rejected. Use an injectable ID generator or another testable seam; do not depend on finding a real collision.
- Duplicate semantic constraints deduplicate and create a reaffirmation history event.
- `exclude` beats `include`; explicit `include` beats `appliesTo`; default applicability and `includeAllApplicable: false` behave as specified.
- Compiled step contract exposes relevant constraints and ignored constraint IDs/reasons.
- Executor compliance for relevant constraints is preserved.
- Missing relevant compliance becomes `inconclusive`; violated hard constraints fail validation.
- Ignored constraints appear in validation compliance as `not_applicable` with selection reason.
- Unknown and duplicate executor compliance IDs are visible in deterministic validation checks and cannot yield a passed validation.
- An explicit completed-phase transition preserves constraint IDs and full registry history, carries context/traces, adds/deduplicates new explicit constraints, resets workflow counters, and starts the new category entry step.
- Transitioning an active or blocked phase is rejected and does not silently authorize execution.
- Existing Phase 3 category and transition regression tests remain green.

## Acceptance criteria

- Explicit instructions are traceable from original text to stable constraint ID and history entries.
- Relevant and ignored constraints are visible for each compiled step.
- Validation output accounts for every registered constraint and cannot pass with missing hard-constraint evidence.
- Constraint history survives explicit phase transitions.
- No automatic extraction/classification, broad validator framework, reasoning strategy library, provider binding, model routing, or multi-agent core API is added.
- All verification commands exit 0.

## Implementer delivery contract

- Work only in `D:\workspaces\coding\projects\ai-behavioral-runtime-phase4` on `codex/phase-4-constraint-registry`.
- Do not touch the main checkout or its untracked `pnpm-lock.yaml`.
- Commit the plan separately first if uncommitted, then implementation in logical commit(s).
- Return status `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
- Include files changed, RED evidence, GREEN/full-gate evidence, commit SHA(s), and any concerns.
