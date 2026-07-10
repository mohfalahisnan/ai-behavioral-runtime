# Phase 6 Reasoning Strategy Library Design

**Date:** 2026-07-10  
**Status:** Approved for implementation planning

## Goal

Add a complete reusable library of eight host-neutral reasoning strategies. Each strategy must expose an objective, recommended behavior, required checks, prohibited shortcuts, and evidence expectations without requesting hidden chain-of-thought.

## Scope Decision

Phase 6 implements all eight strategies named by the roadmap:

- `constraint_analysis`
- `evidence_gathering`
- `hypothesis_testing`
- `root_cause_analysis`
- `tradeoff_analysis`
- `risk_analysis`
- `adversarial_review`
- `verification`

This deliberately uses the full Phase 6 roadmap scope instead of the smaller five-strategy MVP list. The strategy framework already exists, so completing the catalog does not require another subsystem.

## Architecture

The current strategy model remains the architectural center:

```text
Strategy catalog
→ ProtocolRegistry validation
→ Workflow strategy references
→ StepCompiler resolution
→ PreparedStep contract
→ Host model execution
→ Existing result, validation, transition, and trace flow
```

`ReasoningStrategy` keeps its current five semantic fields, but all five become required:

- `objective`
- `behaviors`
- `requiredChecks`
- `prohibitedShortcuts`
- `evidenceExpectations`

`src/protocol/strategies.ts` remains the canonical built-in catalog. `StepCompiler` remains unchanged because it already resolves full strategy definitions into `ReasoningProtocol.strategies` inside the minimal effective step contract.

No new reasoning compiler, execution endpoint, result envelope, persistence shape, trace shape, hosted service, provider concept, model router, or multi-agent concept is added.

## Catalog Semantics

### `constraint_analysis`

Identify applicable requirements, prohibitions, permissions, priorities, conflicts, and sequencing rules. Observable results should reference the constraints considered and expose unresolved conflicts. It must not infer permission or silently discard a constraint.

### `evidence_gathering`

Collect evidence relevant to the current objective, distinguish observed facts from assumptions, and expose material gaps. Observable results should identify evidence sources or artifacts and state important missing evidence. It must not treat an unsupported assertion as evidence.

### `hypothesis_testing`

Form testable candidate explanations, derive discriminating checks, and attempt falsification before selecting a leading hypothesis. Observable results should record candidates, tests, and outcomes. It must not stop at the first plausible explanation.

### `root_cause_analysis`

Connect observed symptoms to the underlying causal fault and distinguish causes from contributing conditions. Observable results should cite the evidence chain and rejected alternatives. It must not relabel a symptom as the root cause.

### `tradeoff_analysis`

Compare viable alternatives against explicit decision criteria and constraints. Observable results should expose material benefits, costs, assumptions, and the basis for any recommendation. It must not force comparison when only one viable option exists or hide a decisive downside.

### `risk_analysis`

Identify credible failure modes and assess likelihood, impact, mitigation, and residual risk. Observable results should provide the evidence or assumption behind material risk ratings. It must not equate an unobserved risk with an impossible risk.

### `adversarial_review`

Challenge the candidate result by seeking counterexamples, boundary failures, unsafe assumptions, scope drift, and unsupported claims. Observable results should record findings or the reviewed attack surface when no issue is found. It must not perform a ceremonial approval-only review.

### `verification`

Check claims and completion criteria against reproducible evidence, preferring deterministic, tool, test, or external evidence. Observable results should record the check performed, its outcome, and limitations. It must not claim success from intention, plausibility, or unexecuted checks.

## Definition Integrity

`ProtocolRegistry` validates every strategy during construction. It rejects:

- a blank objective,
- an empty `behaviors` list,
- an empty `requiredChecks` list,
- an empty `prohibitedShortcuts` list,
- an empty `evidenceExpectations` list,
- blank entries in any semantic list.

Failures use deterministic `SpecificationError` messages naming the strategy ID and invalid field. Existing duplicate-ID and unknown-reference checks remain intact.

This validation applies to built-in and caller-supplied strategies. Tightening the optional fields into required fields is an intentional compile-time compatibility change: custom strategies must now satisfy the complete semantic contract.

## Workflow Mapping

Existing category workflow steps and transitions remain in the same order. Only strategy references change.

### Discussion

- `understand-position`: `constraint_analysis`
- `analyze-and-challenge`: `tradeoff_analysis`, `adversarial_review`

### Task execution

- `understand-task`: `constraint_analysis`
- `plan-execution`: `tradeoff_analysis`, `risk_analysis`
- `validate-result`: `verification`

### Coding task

- `understand-requirement`: `constraint_analysis`
- `inspect-codebase`: `evidence_gathering`
- `diagnose`: `evidence_gathering`, `hypothesis_testing`, `root_cause_analysis`
- `design-solution`: `tradeoff_analysis`, `risk_analysis`
- `security-check`: `risk_analysis`, `adversarial_review`
- `static-validation`: `verification`
- `runtime-validation`: `verification`
- `regression-check`: `verification`
- `review-diff`: `constraint_analysis`, `adversarial_review`, `verification`

Mechanical execution and reporting steps receive no ceremonial reasoning strategy.

## Observable Boundary

Phase 6 reuses existing observable surfaces:

- compiled strategy definitions in `EffectiveStepContract.reasoning`,
- step output contracts,
- completion criteria,
- validation contracts,
- `ExecutionResult.evidence`,
- existing execution traces.

The runtime does not request or store private scratch work, hidden chain-of-thought, or a narrative reasoning transcript. Hosts receive behavioral instructions, required checks, prohibited shortcuts, and evidence expectations. They return normal structured outputs and evidence.

Phase 6 does not add per-strategy self-compliance reports or new evidence enforcement. Phase 7 remains responsible for expanding validator interfaces and enforcement. Existing Phase 6 contracts prepare that work without pulling it forward.

## Compatibility

- Phase 3 category step order and transitions remain unchanged.
- Phase 4 constraints and compliance behavior remain unchanged.
- Phase 5 executor-free prepare/submit and optional direct execution remain unchanged.
- Host-native and direct-executor paths receive the same compiled strategy definitions.
- Persisted run state and trace shapes remain unchanged.
- Built-in catalog and runtime specification metadata receive a Phase 6 version update.

## Testing

Add `tests/phase6-reasoning-strategies.test.ts` and a `test:phase6` package script. The suite verifies:

- the exact eight built-in strategy IDs,
- ID uniqueness,
- complete nonblank semantic fields,
- deterministic rejection for each invalid definition field,
- exact strategy mappings on existing workflow steps,
- unchanged workflow step sequences and transitions,
- full strategy resolution in compiled step contracts,
- equivalent compiled reasoning contracts through host-native and direct-executor paths,
- public exports for the complete catalog.

Implementation follows red-green slices. Existing Phase 3–5 tests stay green throughout.

Final verification runs:

```text
npm run typecheck
npm test
npm run smoke
npm run smoke:host-native
npm run build
git diff --check
```

## Documentation

Phase 6 adds a reasoning-strategy guide that documents the catalog, mapping rules, observable boundary, and evidence semantics. README, roadmap scope wording, progress, scripts, and the Phase 6 implementation report are updated after verified implementation.

## Rejected Approaches

### Separate strategy compiler

Rejected because `StepCompiler` already resolves complete definitions. A second compiler would duplicate data and create another contract surface without adding Phase 6 value.

### Per-strategy compliance report

Rejected for Phase 6 because it would pull validation-framework work from Phase 7 into the strategy catalog and rely heavily on model self-evaluation.

### Catalog-only definitions with no registry validation

Rejected because required TypeScript fields can still contain empty arrays or blank strings. Runtime construction must fail early for unusable custom specifications.
