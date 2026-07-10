# Phase 4 Constraint Registry Implementation Report

## Commits

- Plan: `b273c55` (`docs: plan phase 4 constraint registry`)
- Implementation and focused tests: `af46a32` (`feat(runtime): add phase 4 constraint registry`)
- Task-review fixes and regressions: `95642e4` (`fix(runtime): address phase 4 review findings`)
- Whole-branch invariant fixes: `3ef7f2f` (`fix(runtime): harden phase 4 invariants`)
- Alias re-review fixes: `0bbb67f` (`fix(runtime): harden constraint alias handling`)
- Persisted alias normalization: `a42df1b` (`fix(runtime): normalize persisted constraint aliases`)
- Persisted active/catalog reconciliation: `d09e969` (`fix(runtime): reconcile persisted active constraints`)

## TDD evidence

### RED

Command: `npm run test:phase4`

Exit: `1`

Output summary: `tsc --noEmit` rejected the focused test because the Phase 4 surface did not exist. Errors named missing `ConstraintExtractor`, `ConstraintIdGenerator`, `ConstraintSelection`, `ExplicitConstraintInput`, value `ConstraintRegistry`, `StartRunInput.explicitConstraints`, `EffectiveStepContract.ignoredConstraints`, `BehavioralRuntime.transitionPhase`, and `RuntimeRunState.constraintRegistry`. The test fixture's exact-optional property construction was corrected, then RED was rerun so the remaining failures were missing Phase 4 API and behavior.

### GREEN

Command: `npm run test:phase4`

Exit: `0`

Output summary:

```text
> npm run typecheck && npm run build && node dist/tests/phase4-constraint-registry.test.js
> tsc --noEmit
> tsc -p tsconfig.build.json
Phase 4 constraint registry tests passed
```

## Full verification

- `npm test` — exit `0`; Phase 3 category success/transition regressions and Phase 4 constraint registry tests passed.
- `npm run typecheck` — exit `0`; `tsc --noEmit` reported no errors.
- `npm run smoke` — exit `0`; completed the discussion workflow with one validated retry and blocked invalid input before model execution.
- `git diff --check` — exit `0`; no whitespace errors.

## Task-review TDD fixes

### Missing preference compliance

- RED: `npm run test:phase4` exited `1`; regression expected overall `passed` but received `inconclusive` for a missing preference-only record.
- GREEN: after limiting the compliance gate to hard constraints, `npm run test:phase4` exited `0`. The preference record remains `inconclusive` in the report.

### Phase-attributed history

- RED: `npm run test:phase4` exited `1`; TypeScript reported five `Expected 2 arguments, but got 3` errors for phase-aware `register` calls and four missing `ConstraintHistoryEntry.phaseId` errors.
- GREEN: after requiring `phaseId` on registration and recording it on every history event, `npm run test:phase4` exited `0`.

### Modifier deactivation across phases

- RED: `npm run test:phase4` exited `1`; regression failed with `removed modifier constraint must stop being active` after transition with `modifierIds: []`.
- GREEN: after separating the run-wide registered catalog from the current active set and tracking persistent explicit/user IDs, `npm run test:phase4` exited `0`. Removed modifier history remains attributable to its original phase.

### Preference compliance diagnostic

- RED: `npm run test:phase4` exited `1`; the passed-check assertion expected `Relevant hard constraints have conclusive compliance records` but received `Relevant constraints have conclusive compliance records`.
- GREEN: after correcting the diagnostic to describe the hard-constraint gate, `npm run test:phase4` exited `0`.

## Whole-branch review TDD fixes

### Completion safety gate

- RED: `npm run test:phase4` exited `1`; a deliberately misconfigured declarative transition produced `complete` after failed output and completion-criteria validation, while the regression expected `block`.
- GREEN: after making `complete` eligible only for aggregate `passed` validation, `npm run test:phase4` exited `0`; state remained blocked and never completed.

### Untrusted compliance status

- RED: `npm run test:phase4` exited `1`; an executor-supplied `bogus` status produced overall `passed`, while the regression expected `failed`.
- GREEN: after runtime status validation, deterministic integrity reporting, and normalization to `inconclusive`, `npm run test:phase4` exited `0`.

### Canonical deduplication and ID aliases

- RED 1: `npm run test:phase4` exited `1`; same canonical legacy constraints with different IDs produced two active constraints instead of one.
- GREEN 1: canonical indexing deduplicated active and registered state and appended reaffirmation history.
- RED 2: `npm run test:phase4` exited `1` during phase transition with `Cannot activate unknown constraints: legacy-canonical-b`.
- GREEN 2: persistent and modifier activation IDs resolved through canonical registered constraints.
- RED 3: `npm run test:phase4` exited `1` because reusing a deduplicated alias ID for different semantics did not throw the expected collision.
- GREEN 3: immutable alias tracking preserved collision behavior for every observed ID; final `npm run test:phase4` exited `0`.

### Pre-Phase-4 persisted-state hydration

- RED: `npm run test:phase4` exited `1`; compilation of a seeded legacy active state failed `hydrated legacy active state must retain user constraints`.
- GREEN: after rebuilding and saving registry-backed state from legacy user and modifier constraints, active compilation/validation and completed-phase transition passed with `npm run test:phase4` exit `0`.

## Alias re-review TDD fixes

### Selector aliases

- RED: `npm run test:phase4` exited `1`; excluding a deduplicated alias while including the canonical ID expected zero relevant constraints but received one.
- GREEN: after resolving selector IDs before precedence, alias exclusion wins and alias inclusion works with `includeAllApplicable: false`; `npm run test:phase4` exited `0`.

### Executor compliance aliases

- RED: `npm run test:phase4` exited `1` at typecheck because `EffectiveStepContract` did not expose `constraintIdAliases`, confirming alias metadata stopped before the executor/validation boundary.
- GREEN: after threading aliases through the contract and validation, alias-only compliance satisfies the canonical constraint and canonical-plus-alias reporting fails as a canonical duplicate; `npm run test:phase4` exited `0`.

### Persisted Phase-4 snapshot normalization

- RED: `npm run test:phase4` exited `1`; a seeded snapshot without aliases expected one canonical registered constraint but received two.
- GREEN: normalization now deduplicates active/catalog state, restores aliases and persistent IDs, preserves history/traces, saves through the configured state store, and validates alias compliance; `npm run test:phase4` exited `0`.

### Prototype-safe alias storage

- RED: after correcting a test-only `.constructor` typing issue without production edits, `npm run test:phase4` exited `1`; alias storage expected a null prototype but received an ordinary object.
- GREEN: null-prototype maps plus own-key reads preserve `__proto__` and `constructor` through registration, resolution, selection, activation, persisted-state migration, contract compilation, and validation; `npm run test:phase4` exited `0`.

### Persisted alias graph normalization

- TDD setup: an uncommitted canonical-ID guard from an interrupted implementation was removed before the regression run. Focused tests then covered canonical-ID remapping, both insertion orders for a two-hop alias chain, both insertion orders for a cycle, and a dangling target.
- RED: `npm run test:phase4` exited `1` after typecheck and build both succeeded. Runtime execution reached the regression and reported `expected rejection 'Canonical constraint ID 'legacy-canonical-a' cannot alias 'legacy-canonical-c''`, proving persisted canonical IDs could still be silently remapped.
- GREEN: `npm run test:phase4` exited `0`; `tsc --noEmit`, build, and `Phase 4 constraint registry tests passed` all succeeded. Alias chains flattened to their registered canonical ID in either insertion order, canonical IDs remained self-mapped, and cycles/dangling targets produced exact deterministic errors.
- Full gate before commit: `npm test`, `npm run typecheck`, `npm run smoke`, and `git diff --check` each exited `0`. Phase 3 and Phase 4 regressions passed; smoke completed with four traces and one validated retry, then blocked invalid input before model execution.

### Persisted active/catalog reconciliation

- RED: after adding focused regressions without production edits, `npm run test:phase4` exited `1` after typecheck and build succeeded. The runtime threw `Constraint alias cycle detected: legacy-canonical-b -> legacy-canonical-b` while normalizing an older `[A, B]` duplicate catalog with identity aliases, proving stale duplicate identity aliases were not repaired.
- Added coverage: a unique active constraint absent from the registered catalog rejects with an exact dangling-active error; an active constraint reusing registered ID `A` for different semantics throws `ConstraintCollisionError`; an active legacy ID `B` with the same canonical semantics as registered `A` repairs to `B -> A`, activates canonical `A`, and preserves history.
- GREEN: `npm run test:phase4` exited `0`; typecheck, build, and all Phase 4 constraint registry regressions passed. Catalog/active semantics are now reconciled before persisted alias graph resolution, so only semantically proven stale identity aliases are repaired.
- Full gate before commit: `npm test`, `npm run typecheck`, `npm run smoke`, and `git diff --check` each exited `0`. Phase 3 and Phase 4 tests passed; smoke completed with four traces and one validated retry, then blocked invalid input before model execution.

## Scope review

The implementation adds no category-specific runtime branch, natural-language classification, provider binding, model routing, broad validation framework, or multi-agent core API. Category selection and phase transition remain explicit caller inputs.
