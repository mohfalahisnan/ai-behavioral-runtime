# Core Invariants

These invariants define the non-negotiable boundaries of the specification.

## 1. The runtime governs state

The runtime owns:

- active phase,
- active category,
- current step,
- legal transitions,
- permissions,
- retries,
- validation gates,
- completion.

The model may propose. The runtime authorizes.

## 2. The model does not self-authorize execution

Discussion, explanation, or simulation must never silently become mutation or external execution.

Execution authority comes from explicit permissions and runtime policy.

## 3. Completion requires explicit criteria

A fluent model response does not equal successful completion.

Required completion criteria and validation rules must be evaluated before the runtime marks a step complete.

## 4. Constraints are first-class and traceable

Important constraints receive stable identifiers and remain inspectable throughout the workflow.

A constraint must not disappear merely because the context became long.

## 5. Validation is separate from generation

Generation and validation are distinct concerns even when one implementation happens to use the same model for both.

Deterministic and external evidence should be preferred where available.

## 6. Categories stay broad

Create a new category only when the workflow materially changes.

Use:

- context for the actual topic,
- modifiers for orthogonal behavior changes,
- constraints for explicit requirements.

Do not build deep protocol taxonomy for every niche.

## 7. Reasoning strategies are reusable

A workflow step composes from reusable reasoning strategies instead of inventing an unrelated reasoning ritual each time.

## 8. Mechanical actions do not require ceremonial reasoning

Use reasoning where judgment is needed. Keep deterministic operations deterministic.

## 9. The core is model-agnostic

Core contracts must not depend on:

- provider names,
- provider-specific message formats,
- model routing,
- multiple models,
- multi-agent role systems.

## 10. Optional execution backends must not change protocol meaning

A future single-model executor, routed executor, or multi-agent executor may satisfy the same execution boundary, but the protocol itself must continue to describe **what must happen**, not how many models perform it.
