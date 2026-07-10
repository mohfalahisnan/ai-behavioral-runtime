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

`ConstraintRegistry` returns immutable snapshots. `constraints` contains the active set for the current phase, while `registeredConstraints` retains the run-wide catalog used for collision detection and later reactivation. Deduplication uses canonical semantic content, not only caller IDs. Different IDs for the same canonical constraint map through `constraintIdAliases` to one registered ID and append `reaffirmed` history. Reusing any observed ID for different canonical content remains a collision. Alias maps use frozen null-prototype objects and own-key lookup, so legacy IDs such as `__proto__` and `constructor` remain ordinary strings. Every history entry records the `phaseId` that caused the registration or reaffirmation.

Selection precedence is deterministic:

1. explicit exclusion
2. explicit inclusion
3. applicable constraints when `includeAllApplicable` is enabled or omitted
4. ignored with a declared reason

Compiled step contracts expose relevant constraints in `constraints` and ignored IDs and reasons in `ignoredConstraints`.
They also expose `constraintIdAliases`, allowing executors to trace legacy IDs to canonical contract constraints. Selector `include` and `exclude` IDs resolve through the same map before precedence is applied.

## Compliance

Validation returns one compliance record for each constraint visible to the step. Relevant executor records are preserved. Missing relevant records become `inconclusive`. Missing hard-constraint records make overall validation inconclusive; missing preference records remain visible but do not gate validation. Ignored constraints become `not_applicable` with the selection reason.

Unknown or duplicate executor compliance IDs create deterministic failed checks. Executor compliance aliases resolve to canonical IDs before known-ID, duplicate, and status analysis. Reporting both a canonical ID and one of its aliases is therefore one deterministic duplicate failure. Executor status values are runtime-checked; invalid values fail integrity validation and normalize to `inconclusive` in the returned public compliance report. Violated hard constraints fail validation.

## Runtime safety and persisted state

A declarative `complete` transition is eligible only when aggregate validation is `passed`. A misconfigured protocol cannot complete after failed, inconclusive, or human-review validation.

When a state store returns a pre-Phase-4 run without `constraintRegistry` and `persistentConstraintIds`, the runtime rebuilds them from existing user constraints and active modifier constraints, saves the normalized state through the configured store, and continues normal compilation, validation, or completed-phase transition. Persisted Phase-4 snapshots are also normalized when aliases are missing or stored in an older ordinary-object or `Map` shape: active/catalog constraints are canonically deduplicated, aliases and persistent IDs are restored, and existing history and traces are preserved.

## Phase transition boundary

`BehavioralRuntime.transitionPhase` is explicit caller authorization. It accepts a new phase, category, and objective only when the prior phase is completed. It preserves context, traces, persistent explicit and legacy user constraints, the registered catalog, and full history; adds or reaffirms caller-supplied constraints; resets step counters; and starts at the new category entry step. Modifier constraints follow the new `modifierIds`: removed modifiers become inactive and stop being selected, but their catalog and history records remain.

No automatic category selection, provider binding, model routing, validator framework, or multi-agent behavior is introduced.
