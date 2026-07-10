# Phase 4 Constraint Registry Implementation Report

## Commits

- Plan: `b273c55` (`docs: plan phase 4 constraint registry`)
- Implementation and focused tests: `af46a32` (`feat(runtime): add phase 4 constraint registry`)
- Task-review fixes and regressions: `95642e4` (`fix(runtime): address phase 4 review findings`)
- Whole-branch invariant fixes: `3ef7f2f` (`fix(runtime): harden phase 4 invariants`)

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

## Scope review

The implementation adds no category-specific runtime branch, natural-language classification, provider binding, model routing, broad validation framework, or multi-agent core API. Category selection and phase transition remain explicit caller inputs.
