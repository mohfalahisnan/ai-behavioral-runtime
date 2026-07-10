# AI Behavioral Runtime — Updated Architecture Summary

## Core Problem

Different AI models have different reasoning patterns, inconsistent behavior, and sometimes ignore instructions.

The goal is to make AI behavior more predictable, correctable, and portable across models without forcing every interaction into one rigid workflow.

The system separates two related concerns:

1. **Reasoning Protocol** — how the model should reason within a bounded step.
2. **Behavior / Interaction Protocol** — how the runtime structures the interaction, applies constraints, controls transitions, and validates outcomes.

---

## 1. Core Principle

A structured response is not enough.

**Format ≠ Workflow ≠ Behavior**

A model can still produce valid JSON while:

- ignoring constraints,
- making poor decisions,
- fabricating verification,
- declaring completion too early,
- silently changing scope.

The current canonical architecture is:

```text
Protocol
→ Workflow
→ Step
→ Reasoning
→ Execution
→ Validation
→ Transition
```

---

## 2. Canonical Core Architecture

```text
User Turn
    ↓
Phase Resolution
    ↓
Effective Protocol
    ├── Base Rules
    ├── Category Protocol
    ├── Behavioral Modifiers
    └── Explicit User Constraints
    ↓
Constraint Registry
    ↓
Workflow Engine
    ↓
Current Workflow Step
    ├── Objective
    ├── Step Kind
    ├── Relevant Constraints
    ├── Reasoning Strategy
    ├── Input Contract
    ├── Output Contract
    ├── Validation Contract
    └── Completion Criteria
    ↓
Model Execution
    ↓
Validation
    ↓
Runtime-Controlled Transition
    ├── Continue
    ├── Retry
    ├── Replan
    ├── Block
    └── Complete
```

---

## 3. Runtime Ownership vs Model Ownership

### Runtime Owns

- current phase,
- current category,
- current workflow step,
- state,
- transitions,
- permissions,
- constraint registry,
- relevant-constraint selection,
- retry limits,
- validation gates,
- trace history,
- completion criteria.

### Model Owns

- bounded reasoning,
- content generation,
- candidate decisions,
- interpretation where deterministic logic is insufficient.

Core rule:

> **The model reasons. The runtime governs.**

The model should not be the sole authority deciding:

- whether it is done,
- whether validation passed,
- whether execution is allowed,
- whether a constraint can be ignored,
- whether a transition is legal.

---

## 4. Base Protocol

Contains universal rules that apply everywhere.

Examples:

- preserve user intent,
- respect explicit constraints,
- do not invent unavailable facts,
- distinguish fact from assumption,
- preserve conversation context,
- do not execute without permission,
- do not claim success without evidence.

The base protocol should remain small to avoid instruction dilution.

---

## 5. Broad Category Protocols

Categories should stay broad and exist only when the workflow materially changes.

Candidate categories:

- Discussion
- Brainstorming
- Research
- Writing
- Review
- Image Generation
- Video Generation
- General Task Execution
- Coding Task
- Data Analysis
- Decision Support
- Planning

The actual topic remains context, not another protocol layer.

Example:

```yaml
category: discussion
topic: AI behavior standardization
```

Avoid deep taxonomies such as:

```text
Discussion
└── Architecture Discussion
    └── AI Architecture Discussion
        └── Behavioral Protocol Discussion
```

That creates protocol explosion without meaningful behavioral benefit.

---

## 6. Coding Task Is a Dedicated Category

Coding remains separate from generic task execution because it has distinct:

- workflows,
- reasoning strategies,
- tooling requirements,
- repository context handling,
- validation rules,
- security concerns,
- failure recovery,
- completion criteria.

Example coding workflow:

```text
Understand Requirement
→ Inspect Codebase
→ Diagnose
→ Design Solution
→ Security Check
→ Implement
→ Static Validation
→ Runtime Validation
→ Regression Check
→ Review Diff
→ Report
```

Potential coding principles:

- inspect before modifying,
- trace dependencies,
- preserve existing behavior,
- prefer minimal changes,
- consider security risks,
- prefer DRY design,
- consider scalability,
- validate before completion.

---

## 7. Modifiers Instead of Deep Categories

Use modifiers for orthogonal behavioral adjustments.

Example:

```yaml
category: discussion

modifiers:
  - critical
  - technical
  - exploratory
```

Another:

```yaml
category: coding_task

modifiers:
  - security_sensitive
  - read_only
  - adversarial
```

Core separation:

```text
Category = workflow shape
Modifiers = behavioral adjustments
Context = actual subject matter
Constraints = explicit user requirements
```

Effective protocol:

```text
Effective Protocol =
    Base Rules
  + Category Protocol
  + Behavioral Modifiers
  + Explicit User Constraints
```

---

## 8. Multi-Phase Turns

A turn can contain multiple phases.

Example:

> Research the authentication architecture, then implement it.

```yaml
phases:
  - category: research
  - category: coding_task
```

Example:

> Brainstorm logo ideas, then generate one.

```yaml
phases:
  - category: brainstorming
  - category: image_generation
```

Example:

> Discuss the architecture first, then implement.

```yaml
phases:
  - category: discussion
    status: active

  - category: coding_task
    status: blocked
    reason: user_has_not_authorized_execution
```

This preserves execution boundaries.

---

## 9. Workflow Steps and Reasoning Protocols

Each important workflow step can use a step-specific reasoning protocol.

Example for coding:

```text
Understand Requirement
└── intent extraction + constraint analysis

Inspect Codebase
└── evidence gathering + dependency tracing

Diagnose
└── hypothesis generation + falsification

Design Solution
└── tradeoff analysis + security review

Implement
└── minimal-change reasoning + invariant preservation

Validate
└── adversarial verification + test interpretation
```

Not every mechanical action needs elaborate reasoning.

For example:

```text
Run tests
```

is primarily an action.

But:

```text
Interpret failing tests
```

requires reasoning.

Possible step kinds:

```ts
type StepKind =
  | "reasoning"
  | "action"
  | "validation"
  | "control";
```

---

## 10. Three Levels of Reasoning

### Universal Reasoning Core

Applies everywhere:

- understand before deciding,
- identify constraints,
- separate fact from assumption,
- track uncertainty,
- avoid unsupported conclusions,
- verify important claims.

### Category Reasoning Rules

Applies to the entire category.

For coding:

- inspect before modifying,
- trace dependencies,
- consider security,
- preserve behavior,
- prefer minimal safe change.

For brainstorming:

- diverge before converging,
- avoid premature filtering,
- generate independent alternatives,
- group patterns,
- evaluate after sufficient exploration.

### Step-Specific Reasoning Strategy

Applies only to the active step.

Example for diagnosing a bug:

```text
collect evidence
→ generate hypotheses
→ rank hypotheses
→ attempt falsification
→ identify root cause
```

---

## 11. Reusable Reasoning Strategy Library

Do not let every step invent a completely new reasoning pattern.

Candidate reusable strategies:

- constraint_analysis
- evidence_gathering
- hypothesis_testing
- root_cause_analysis
- tradeoff_analysis
- risk_analysis
- adversarial_review
- divergent_generation
- convergent_selection
- verification

Example:

```yaml
step: diagnose

reasoning:
  - evidence_gathering
  - hypothesis_testing
  - root_cause_analysis
```

Example:

```yaml
step: design_solution

reasoning:
  - constraint_analysis
  - tradeoff_analysis
  - risk_analysis
```

---

## 12. Validation Is First-Class

Validation should not be an optional final afterthought.

Each important step may define:

```text
Workflow Step
    ├── Step Objective
    ├── Relevant Constraints
    ├── Reasoning Strategy
    ├── Input Contract
    ├── Output Contract
    ├── Validation Contract
    └── Completion Criteria
```

A step should transition only after validation succeeds or an explicit retry/replan policy is triggered.

Important principle:

> **Do not confuse structured output with correct behavior.**

---

## 13. Constraint Registry

Important instructions should be extracted into a first-class registry.

Example:

```yaml
constraints:
  - id: C1
    rule: do_not_modify_public_api

  - id: C2
    rule: preserve_rls

  - id: C3
    rule: no_new_dependency
```

Then relevant steps validate compliance:

```yaml
compliance:
  C1: satisfied
  C2: satisfied
  C3: violated
```

This is stronger than relying on a model to remember instruction number 27 from a giant prompt.

---

## 14. Multi-Agent Is Optional and Excluded from the Core Architecture

The core architecture does **not** assume multi-agent execution.

The system must work cleanly with:

```text
One Runtime
+ One Protocol System
+ One Model
```

Multi-agent execution may exist later as an optional execution strategy, but it is not part of the protocol architecture itself.

Therefore, the canonical architecture excludes:

- agent roles,
- inter-agent delegation,
- role-based reasoning ownership,
- agent-to-agent communication.

The protocol should define **what must happen**, not how many agents perform it.

---

## 15. Model Routing Is Optional and Excluded from the Core Architecture

Model routing is also optional.

The default execution path is simply:

```text
Current Workflow Step
    ↓
Model Execution
```

An optional implementation may later insert a router:

```text
Current Workflow Step
    ↓
Optional Model Router
    ↓
Selected Model
    ↓
Model Execution
```

But this does not change the core protocol.

The protocol defines:

- what must happen,
- how the step should reason,
- what constraints apply,
- what output is required,
- how success is validated.

The execution backend decides which model performs the step.

These concerns should remain separate.

---

## 16. Proposed Conceptual Interfaces

```ts
interface ProtocolRuntime {
  baseProtocol: BaseProtocol;
  categories: CategoryProtocol[];
  reasoningStrategies: ReasoningStrategy[];
  modifiers: BehaviorModifier[];
}
```

```ts
interface CategoryProtocol {
  id: string;
  workflow: WorkflowDefinition;
  rules: ProtocolRule[];
}
```

```ts
interface WorkflowDefinition {
  entryStep: string;
  steps: WorkflowStep[];
}
```

```ts
interface WorkflowStep {
  id: string;

  kind:
    | "reasoning"
    | "action"
    | "validation"
    | "control";

  objective: string;

  reasoning?: ReasoningStrategyRef[];

  inputContract: InputContract;
  outputContract: OutputContract;
  validationContract?: ValidationContract;

  completionCriteria: CompletionCriterion[];

  allowedTransitions: Transition[];
}
```

Execution stays generic:

```ts
interface ModelExecutor {
  execute(input: ModelExecutionInput): Promise<ModelExecutionResult>;
}
```

The default can use a single model.

Optional model routing can later implement the same interface without changing the runtime architecture.

---

## 17. Canonical Effective Step Behavior

```text
Effective Step Behavior =
    Universal Base Rules
  + Category Protocol
  + Behavioral Modifiers
  + Relevant User Constraints
  + Step Reasoning Strategy
  + Current Context
```

Example:

```yaml
category: coding_task

modifiers:
  - security_sensitive

constraints:
  - id: C1
    rule: do_not_change_public_api

  - id: C2
    rule: no_new_dependencies

current_step:
  id: diagnose

  kind: reasoning

  reasoning:
    - evidence_gathering
    - hypothesis_testing
    - root_cause_analysis

  completion_criteria:
    - root_cause_identified
    - evidence_attached
    - relevant_constraints_checked
```

---

## 18. Current Design Principles

1. Keep categories broad.
2. Make coding a dedicated category.
3. Create a new category only when workflow materially changes.
4. Use modifiers instead of deep niche inheritance.
5. Allow multi-phase turns.
6. Apply reasoning protocols to important reasoning steps, not every mechanical action.
7. Reuse reasoning strategies instead of inventing new ones per step.
8. Keep permissions outside the model's control.
9. Keep runtime state and transitions outside the model's control.
10. Make validation first-class.
11. Keep a constraint registry.
12. Do not confuse structured output with correct behavior.
13. Prefer deterministic software wherever AI judgment is unnecessary.
14. Multi-agent is optional and outside the core architecture.
15. Model routing is optional and outside the core architecture.
16. The core system must work with one model.

---

## 19. Main Open Questions

- How should category selection work?
- How should phase resolution work?
- How should multi-phase transitions work?
- How should reasoning strategies compose?
- How should validation differ across categories?
- How should protocol conflicts and precedence be resolved?
- How much protocol state should persist across turns?
- How should constraint relevance be selected per step?
- Which checks should be deterministic, model-based, external, or human-reviewed?
- How should the system be benchmarked across different model families?

---

## 20. Strongest Current Hypothesis

> A small deterministic behavioral runtime that compiles a minimal, step-specific contract around one capable model will be more reliable, debuggable, and portable than either a giant universal prompt or a role-heavy multi-agent system.

This remains a hypothesis to test, not an assumption to worship. Architecture diagrams have ruined enough afternoons already.
