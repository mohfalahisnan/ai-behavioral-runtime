# Constraint Registry

Phase 4 adds deterministic, caller-driven constraint handling to the generic runtime.

## Explicit extraction

The caller supplies instruction text, `ConstraintKind`, source, and optional applicability. The runtime trims and collapses instruction whitespace, preserves the original text in `origin`, and generates an ID from only:

- kind
- normalized rule
- source
- normalized applicability

The runtime does not infer natural-language intent. Empty instructions fail. Different canonical values that receive the same ID fail as a collision.

## Registry and selection

`ConstraintRegistry` returns immutable snapshots. New semantic constraints append `registered` history entries. Repeated semantic constraints stay deduplicated and append `reaffirmed` entries.

Selection precedence is deterministic:

1. explicit exclusion
2. explicit inclusion
3. applicable constraints when `includeAllApplicable` is enabled or omitted
4. ignored with a declared reason

Compiled step contracts expose relevant constraints in `constraints` and ignored IDs and reasons in `ignoredConstraints`.

## Compliance

Validation returns one compliance record for each constraint visible to the step. Relevant executor records are preserved. Missing relevant records become `inconclusive`. Ignored constraints become `not_applicable` with the selection reason.

Unknown or duplicate executor compliance IDs create deterministic failed checks. Violated hard constraints fail validation.

## Phase transition boundary

`BehavioralRuntime.transitionPhase` is explicit caller authorization. It accepts a new phase, category, and objective only when the prior phase is completed. It preserves context, traces, active constraints, and full history; adds or reaffirms caller-supplied constraints; resets step counters; and starts at the new category entry step.

No automatic category selection, provider binding, model routing, validator framework, or multi-agent behavior is introduced.
