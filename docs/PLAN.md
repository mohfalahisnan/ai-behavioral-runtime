# AI Behavioral Runtime — Implementation Plan

## 1. Objective

Build a model-agnostic behavioral runtime that makes AI behavior more predictable, inspectable, correctable, and portable across different model providers.

The runtime should standardize:

- how a user turn is interpreted,
- which interaction category applies,
- which workflow is activated,
- which reasoning strategy applies to each important step,
- which user constraints must be preserved,
- how each step is validated,
- when execution may continue, retry, replan, block, or complete.

The core must work with:

```text
One Runtime
+ One Protocol System
+ One Model
```

Multi-agent execution and model routing are optional future extensions and are excluded from the core architecture.

---

## 2. Core Hypothesis

> A small deterministic behavioral runtime that compiles a minimal step-specific contract around one capable model will be more reliable, debuggable, and portable than either a giant universal prompt or an unconstrained agent.

The system should not try to eliminate model nondeterminism entirely. It should constrain where judgment is allowed and move deterministic behavior into software wherever practical.

Core rule:

```text
The model reasons.
The runtime governs.
Validation decides whether execution may continue.
```

---

## 3. Canonical Architecture

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

Compact form:

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

## 4. Ownership Boundaries

### Runtime owns

- active phase,
- active category,
- current workflow step,
- workflow state,
- allowed transitions,
- execution permissions,
- constraint registry,
- relevant constraint selection,
- retry limits,
- validation gates,
- trace history,
- completion criteria.

### Model owns

- bounded reasoning,
- content generation,
- candidate decisions,
- interpretation where deterministic logic is insufficient,
- judgment inside the active step contract.

The model must not independently decide that:

- it is finished,
- validation passed,
- execution is authorized,
- a constraint may be ignored,
- an illegal transition is acceptable.

---

## 5. Protocol Layers

### 5.1 Base Protocol

Keep this intentionally small. Initial candidates:

- preserve user intent,
- respect explicit constraints,
- do not invent unavailable facts,
- distinguish facts from assumptions,
- preserve relevant conversation context,
- do not execute without permission,
- do not claim success without evidence,
- do not silently change scope.

### 5.2 Category Protocols

Start with broad categories only:

- discussion,
- brainstorming,
- research,
- writing,
- review,
- image generation,
- video generation,
- general task execution,
- coding task,
- data analysis,
- decision support,
- planning.

Rule:

> Create a separate category only when the workflow materially changes.

The topic belongs in context, not in a deep protocol hierarchy.

### 5.3 Behavioral Modifiers

Use modifiers for orthogonal behavior changes:

- critical,
- technical,
- concise,
- exploratory,
- evidence-driven,
- security-sensitive,
- read-only,
- adversarial,
- creative,
- collaborative,
- high-risk.

Core distinction:

```text
Category = workflow shape
Modifier = behavioral adjustment
Context = actual subject matter
Constraint = explicit requirement
```

Effective protocol:

```text
Base Rules
+ Category Protocol
+ Behavioral Modifiers
+ Explicit User Constraints
```

---

## 6. Multi-Phase Turns

A turn may contain multiple phases.

Example:

```text
Research the authentication architecture, then implement it.
```

```yaml
phases:
  - category: research
    status: pending

  - category: coding_task
    status: pending
```

Another example:

```text
Discuss the architecture first, then implement it.
```

```yaml
phases:
  - category: discussion
    status: active

  - category: coding_task
    status: blocked
    reason: execution_not_yet_authorized
```

The runtime controls phase transitions. A later phase must not become executable merely because the model thinks the conversation naturally progressed there.

---

## 7. Workflow Step Model

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

  relevantConstraints?: ConstraintSelector;
  validationContract?: ValidationContract;

  completionCriteria: CompletionCriterion[];
  allowedTransitions: Transition[];
}
```

Not every step needs heavy reasoning. `run_tests` is mainly an action. `interpret_test_failure` requires reasoning.

---

## 8. Reasoning Protocol System

Use three levels.

### 8.1 Universal Reasoning Core

- understand before deciding,
- identify relevant constraints,
- separate fact from assumption,
- track uncertainty,
- avoid unsupported conclusions,
- verify important claims.

### 8.2 Category Reasoning Rules

For coding:

- inspect before modifying,
- trace dependencies,
- preserve existing behavior,
- consider security impact,
- prefer minimal safe change,
- validate before completion.

For brainstorming:

- diverge before converging,
- avoid premature filtering,
- generate meaningfully distinct alternatives,
- group patterns,
- evaluate only after sufficient exploration.

For discussion:

- understand the user's position,
- identify assumptions,
- challenge weak points where useful,
- extend promising ideas,
- avoid premature conclusion.

### 8.3 Step-Specific Reasoning Strategies

Initial strategy library:

- constraint_analysis,
- evidence_gathering,
- hypothesis_testing,
- root_cause_analysis,
- tradeoff_analysis,
- risk_analysis,
- adversarial_review,
- divergent_generation,
- convergent_selection,
- verification.

Example:

```yaml
step: diagnose
reasoning:
  - evidence_gathering
  - hypothesis_testing
  - root_cause_analysis
```

Effective step reasoning:

```text
Universal Reasoning Core
+ Category Reasoning Rules
+ Step-Specific Strategies
+ Relevant User Constraints
+ Current Context
```

---

## 9. Constraint Registry

Explicit user instructions become first-class constraints.

```yaml
constraints:
  - id: C1
    type: must_not
    rule: do_not_modify_public_api

  - id: C2
    type: must
    rule: preserve_existing_rls_behavior

  - id: C3
    type: must_not
    rule: do_not_add_dependencies
```

Each step receives only relevant constraints.

```yaml
step: implement
relevant_constraints:
  - C1
  - C2
  - C3
```

Validation records compliance.

```yaml
constraint_compliance:
  C1: satisfied
  C2: satisfied
  C3: violated
```

---

## 10. Validation System

Validation is first-class, not an optional final afterthought.

Possible validator types:

- schema validator,
- constraint validator,
- deterministic validator,
- tool-result validator,
- test validator,
- model validator,
- external-evidence validator,
- human approval.

Validation result example:

```yaml
validation:
  status: passed

  checks:
    output_schema: passed
    relevant_constraints: passed
    evidence_requirement: passed

  evidence:
    - type: test
      result: success
```

Possible outcomes:

- passed,
- failed,
- inconclusive,
- requires_human_review.

Validation preference order:

```text
Deterministic Evidence
    >
Tool / Test Evidence
    >
External Evidence
    >
Independent Model Judgment
    >
Model Self-Evaluation
```

---

## 11. Runtime Transitions

Initial transition outcomes:

- continue,
- retry,
- replan,
- block,
- complete.

Example:

```yaml
transition:
  from: diagnose
  to: design_solution
  condition:
    - root_cause_identified
    - evidence_present
    - validation_passed
```

Retry policy:

```yaml
retry_policy:
  max_attempts: 2

  retry_when:
    - invalid_output_schema
    - recoverable_constraint_violation

  block_when:
    - required_context_missing
    - permission_missing
```

The model may suggest a transition, but the runtime authorizes it.

---

## 12. Coding Task Category

Coding is intentionally separate from generic task execution.

Initial coding workflow:

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

It must support loops and recovery.

Examples:

```text
Diagnose
→ Need More Evidence
→ Inspect Codebase
→ Diagnose
```

```text
Runtime Validation Failed
→ Diagnose
→ Redesign
→ Implement
→ Validate Again
```

Initial coding rules:

- inspect before modifying,
- understand relevant dependencies,
- preserve public contracts unless authorized,
- prefer minimal changes,
- prefer DRY design,
- consider scalability,
- consider trust boundaries,
- consider authentication and authorization,
- avoid unnecessary dependencies,
- run validation before claiming completion,
- review the final diff,
- report remaining uncertainty.

---

## 13. Model Execution Boundary

The core runtime exposes a generic executor:

```ts
interface ModelExecutor {
  execute(
    input: ModelExecutionInput,
  ): Promise<ModelExecutionResult>;
}
```

Initial execution path:

```text
Current Workflow Step
    ↓
Single Model Executor
    ↓
Model
```

The protocol must not depend on:

- multiple agents,
- multiple models,
- provider-specific APIs,
- model routing.

---

## 14. Optional Future Extensions

### Optional Model Routing

Possible later flow:

```text
Current Workflow Step
    ↓
Optional Model Router
    ↓
Selected Model
    ↓
Execution
```

This should implement the same `ModelExecutor` interface.

### Optional Multi-Agent Execution

Multi-agent execution may later exist as another execution backend, but:

- the protocol should not define role-play agents,
- the core architecture should not require delegation,
- workflows should not assume agent-to-agent communication.

The protocol defines what must happen. The executor decides how execution is performed.

---

## 15. Implementation Phases

### Phase 1 — Specification

Define the vocabulary and core interfaces.

Deliverables:

- protocol vocabulary,
- category definitions,
- modifier model,
- constraint model,
- workflow definition model,
- workflow step model,
- reasoning strategy model,
- validation model,
- transition model,
- trace model.

Initial TypeScript interfaces:

- `BaseProtocol`
- `CategoryProtocol`
- `BehaviorModifier`
- `WorkflowDefinition`
- `WorkflowStep`
- `ReasoningStrategy`
- `Constraint`
- `ConstraintRegistry`
- `ValidationContract`
- `ValidationResult`
- `Transition`
- `ExecutionTrace`
- `ModelExecutor`

Exit criteria:

- one complete protocol can be represented declaratively,
- no provider-specific concepts leak into the core,
- no multi-agent concepts exist in the core,
- no model-routing assumptions exist in the core.

### Phase 2 — Minimal Runtime

Build:

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

Do not build automatic category classification yet.

Exit criteria:

- workflow state persists,
- active step is externally controlled,
- the model receives only the effective step contract,
- validation can reject a result,
- runtime can continue, retry, block, and complete.

### Phase 3 — Initial Categories

Start with only:

- discussion,
- task_execution,
- coding_task.

This is enough to test materially different workflow shapes.

Exit criteria:

- all three categories use the same runtime,
- categories differ through declarative protocol definitions,
- no unnecessary category-specific runtime code.

### Phase 4 — Constraint Registry

Implement:

- explicit constraint extraction,
- stable constraint IDs,
- constraint relevance selection,
- step-level constraint injection,
- constraint compliance reporting.

Exit criteria:

- explicit instructions are traceable,
- relevant constraints are visible per step,
- ignored constraints appear in validation output,
- constraint history survives phase transitions.

### Phase 5 — Reasoning Strategy Library

Implement the first reusable strategies:

- constraint_analysis,
- evidence_gathering,
- hypothesis_testing,
- root_cause_analysis,
- tradeoff_analysis,
- risk_analysis,
- adversarial_review,
- verification.

Each strategy should define:

- objective,
- recommended reasoning behavior,
- required checks,
- prohibited shortcuts,
- evidence expectations.

Do not require hidden chain-of-thought. Standardize observable reasoning behavior, checks, outputs, and evidence expectations.

### Phase 6 — Validation Framework

Implement validator interfaces.

```ts
interface Validator<TInput, TResult> {
  validate(input: TInput): Promise<TResult>;
}
```

Initial validators:

- schema validator,
- constraint validator,
- completion criteria validator,
- deterministic callback validator,
- model-based evaluator.

Exit criteria:

- validation failures can trigger retries,
- retries are bounded,
- completion requires validation,
- validation results are traceable.

### Phase 7 — Automatic Phase and Category Resolution

Introduce automatic resolution only after the runtime works with manual selection.

Example result:

```yaml
phases:
  - category: discussion
    confidence: 0.94
    status: active

  - category: coding_task
    status: blocked
    reason: execution_not_authorized
```

Separate hard information from soft classification.

Hard information:

- explicit user constraints,
- permissions,
- execution prohibitions,
- required sequence.

Soft classification:

- category,
- modifiers,
- reasoning strategies.

Exit criteria:

- resolver decisions are inspectable,
- manual overrides are possible,
- explicit permissions cannot be overridden by classification,
- ambiguity never silently authorizes execution.

### Phase 8 — Traceability and Debugging

Every runtime decision should be inspectable.

Example trace:

```yaml
run_id: run_123
phase: coding_task
step: diagnose

effective_protocol:
  base_rules:
    - preserve_user_intent

  modifiers:
    - security_sensitive

  constraints:
    - C1
    - C2

reasoning:
  - evidence_gathering
  - root_cause_analysis

execution:
  model: configured_default_model

validation:
  status: failed
  violations:
    - C2

transition:
  action: retry
```

The trace should answer:

- Which protocol was selected?
- Which modifiers were active?
- Which constraints applied?
- Which reasoning strategies were used?
- What did the model return?
- Which validation failed?
- Why did the runtime transition?

### Phase 9 — Evaluation

Compare:

```text
A. Normal baseline prompt

B. Giant universal protocol prompt

C. Base + category protocol

D. Base + category + step reasoning strategies

E. Full runtime:
   category
   + modifiers
   + constraints
   + step reasoning
   + validation
```

Keep constant where practical:

- same tasks,
- same model,
- same tools,
- same approximate token budget.

Measure:

- task success,
- constraint adherence,
- ignored instructions,
- false completion claims,
- validation failures,
- retries,
- token usage,
- latency,
- cross-model variance,
- failure localization quality.

Primary question:

> Did the system make behavior more predictable, failures more visible, and correction easier?

---

## 16. Recommended MVP Scope

Include only:

```text
1 Base Protocol

3 Categories:
- discussion
- task_execution
- coding_task

5 Reasoning Strategies:
- constraint_analysis
- evidence_gathering
- root_cause_analysis
- tradeoff_analysis
- verification

1 Constraint Registry

4 Step Kinds:
- reasoning
- action
- validation
- control

4 Runtime Transitions:
- continue
- retry
- block
- complete

3 Validators:
- schema
- constraints
- completion criteria

1 Single-Model Executor

1 Trace System
```

Explicitly exclude from MVP:

- multi-agent execution,
- model routing,
- deep protocol inheritance,
- large category taxonomy,
- automatic protocol generation,
- automatic workflow generation,
- self-modifying protocols,
- marketplace or plugin ecosystem,
- distributed execution.

---

## 17. Suggested Repository Structure

```text
src/
├── protocol/
│   ├── base/
│   ├── categories/
│   ├── modifiers/
│   └── types/
│
├── reasoning/
│   ├── strategies/
│   └── compiler/
│
├── constraints/
│   ├── registry.ts
│   ├── selector.ts
│   └── validator.ts
│
├── workflow/
│   ├── engine.ts
│   ├── state.ts
│   ├── transitions.ts
│   └── step.ts
│
├── validation/
│   ├── validators/
│   ├── pipeline.ts
│   └── types.ts
│
├── execution/
│   ├── model-executor.ts
│   └── single-model-executor.ts
│
├── compiler/
│   ├── effective-protocol.ts
│   └── step-contract.ts
│
├── trace/
│   ├── recorder.ts
│   └── types.ts
│
└── runtime/
    └── behavioral-runtime.ts
```

Key boundary:

```text
Protocol definitions
    ≠
Workflow runtime
    ≠
Model execution backend
```

---

## 18. Main Risks

### Protocol Explosion

Mitigation:

- add a category only when workflow materially changes,
- use modifiers for orthogonal behavior,
- keep the universal core small.

### False Determinism

Mitigation:

- validate outcomes, not just format,
- require evidence where practical,
- benchmark task quality separately from protocol compliance.

### Classifier Failure

Mitigation:

- keep classifications broad,
- make decisions inspectable,
- separate permissions from category inference,
- allow manual overrides.

### Constraint Dilution

Mitigation:

- use stable constraint IDs,
- select relevant constraints per step,
- validate compliance explicitly.

### Validation Circularity

Mitigation:

- prefer deterministic checks,
- prefer tool and test evidence,
- use model evaluation only where unavoidable.

### Over-Protocolization

Mitigation:

- use lightweight category workflows,
- do not require heavy reasoning for mechanical steps,
- compile only the minimal effective step contract.

---

## 19. Recommended Build Order

1. Freeze conceptual vocabulary.
2. Define TypeScript core interfaces.
3. Build workflow state machine.
4. Build manual protocol loader.
5. Implement single-model executor.
6. Implement discussion category.
7. Implement generic task category.
8. Implement minimal coding category.
9. Add constraint registry.
10. Add step-specific reasoning strategies.
11. Add validation pipeline.
12. Add trace and replay.
13. Create benchmark suite.
14. Compare against baseline prompting.
15. Refine architecture based on measured failures.
16. Only then consider automatic category resolution.
17. Only later consider optional model routing.
18. Consider multi-agent execution only when evidence justifies it.

---

## 20. Definition of Success

Version one succeeds when:

- the same user request can be executed repeatedly with measurably lower behavioral variance,
- explicit instructions are less frequently ignored,
- false completion claims become detectable,
- failures can be localized to a specific phase or step,
- the runtime can explain why a transition occurred,
- the same protocol can operate across different models with minimal adaptation,
- coding workflows can evolve deeply without contaminating generic task behavior,
- simple discussions remain lightweight,
- the system works correctly with one model and no multi-agent architecture.

---

## 21. Final MVP Architecture

```text
                User Turn
                    ↓
             Phase Resolution
                    ↓
           Effective Protocol
         ┌──────────┼──────────┐
         ↓          ↓          ↓
     Base Rules   Category   Modifiers
                    +
             User Constraints
                    ↓
           Constraint Registry
                    ↓
             Workflow Engine
                    ↓
            Current Step Contract
         ┌──────────┼───────────┐
         ↓          ↓           ↓
     Reasoning   Constraints   Contracts
                    ↓
              Model Execution
                    ↓
                 Validation
                    ↓
          Runtime-Owned Transition
         ┌────────┬───────┬────────┐
         ↓        ↓       ↓        ↓
      Continue   Retry   Block   Complete
```

This is the foundation. Everything else is optional.
