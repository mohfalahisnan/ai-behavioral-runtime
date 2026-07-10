# Protocol Vocabulary

This document defines the canonical terms used by the runtime. Keeping these meanings stable matters because fuzzy terminology is how architecture documents become mythology.

## Base Protocol

The smallest set of universal rules and reasoning principles that apply across all categories.

The base protocol should remain intentionally small.

## Category Protocol

A broad interaction or task type whose workflow materially differs from others.

Examples:

- discussion,
- brainstorming,
- research,
- task execution,
- coding task.

A topic is not automatically a category. `AI architecture` is context. `Discussion` is a category.

## Behavioral Modifier

An orthogonal behavior adjustment that does not justify a separate workflow.

Examples:

- critical,
- concise,
- exploratory,
- read-only,
- security-sensitive.

## Phase

One ordered interaction segment in a user request. A single turn may contain multiple phases.

Example:

```text
Research the approach, then implement it.
```

This may resolve to:

```text
research → coding_task
```

The later phase may remain blocked until execution is explicitly authorized.

## Workflow

The declarative sequence and legal transitions for one category.

A workflow is not necessarily linear. It may retry, replan, return to an earlier step, block, or complete.

## Workflow Step

A bounded unit of behavior with:

- an objective,
- a step kind,
- input and output contracts,
- optional reasoning strategies,
- relevant constraints,
- optional validation,
- completion criteria,
- allowed transitions.

## Step Kind

One of:

- `reasoning` — judgment or analysis is primary,
- `action` — an operation or output is primary,
- `validation` — verification is primary,
- `control` — orchestration and state decisions are primary.

## Reasoning Strategy

A reusable observable method for a bounded reasoning step.

Examples:

- constraint analysis,
- evidence gathering,
- hypothesis testing,
- root cause analysis,
- tradeoff analysis,
- risk analysis,
- adversarial review,
- verification.

The strategy standardizes behavior, checks, evidence expectations, and prohibited shortcuts. It does not require exposing hidden chain-of-thought.

## Constraint

A first-class rule that may come from the user, system, category, modifier, or runtime.

Examples:

- must use TypeScript,
- must not modify the public API,
- execution is not authorized,
- research must happen before implementation.

Constraints receive stable IDs so compliance can be traced across steps.

## Validation Contract

The checks that determine whether a step output is acceptable.

Validation may be:

- deterministic,
- schema-based,
- constraint-based,
- test-based,
- tool-based,
- external-evidence-based,
- model-based,
- human-reviewed.

Prefer objective evidence over model self-evaluation whenever practical.

## Completion Criterion

An explicit condition required before a step can be considered complete.

The model may produce an answer, but the runtime decides whether completion criteria are satisfied.

## Transition

A runtime-authorized state change after a step.

Initial actions:

- `continue`,
- `retry`,
- `replan`,
- `block`,
- `complete`.

## Effective Protocol

The active behavior contract for the current interaction:

```text
Base Rules
+ Category Protocol
+ Behavioral Modifiers
+ Explicit User Constraints
```

At a specific step, the effective behavior additionally includes:

```text
Relevant Constraints
+ Step Reasoning Strategies
+ Current Context
```

## Model Executor

The generic boundary that performs model execution.

The core specification assumes one executor interface only. Whether an implementation later uses one model, routing, or multiple agents is outside the protocol semantics.

## Execution Trace

An inspectable record of:

- active phase,
- active category,
- current step,
- modifiers,
- applied constraints,
- reasoning strategies,
- validation result,
- transition decision.

The trace exists to make failures localizable and replayable.
