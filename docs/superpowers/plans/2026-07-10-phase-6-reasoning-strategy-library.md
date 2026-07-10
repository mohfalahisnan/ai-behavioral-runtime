# Phase 6 Reasoning Strategy Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver all eight reusable reasoning strategies with complete observable contracts, deterministic definition validation, meaningful workflow mappings, and no hidden chain-of-thought requirement.

**Architecture:** Keep the existing declarative `ReasoningStrategy` and `StepCompiler` path. Tighten the strategy contract, validate definitions in `ProtocolRegistry`, expose one canonical built-in catalog, and attach strategies to existing category steps without changing workflow order or transitions. Reuse current outputs, `ExecutionResult.evidence`, validation, traces, prepare/submit, and direct-executor paths.

**Tech Stack:** TypeScript 5.8, Node.js ES modules, npm scripts, existing handwritten assertion tests.

## Global Constraints

- Implement exactly these eight strategy IDs: `constraint_analysis`, `evidence_gathering`, `hypothesis_testing`, `root_cause_analysis`, `tradeoff_analysis`, `risk_analysis`, `adversarial_review`, and `verification`.
- Every strategy must define a nonblank objective and nonempty behaviors, required checks, prohibited shortcuts, and evidence expectations.
- Strategy contracts describe observable behavior, checks, outputs, and evidence. Never request or store hidden chain-of-thought.
- Keep strategies declarative, model-agnostic, provider-neutral, and host-neutral.
- Do not add a reasoning compiler, execution endpoint, result envelope, state shape, trace shape, hosted service, model router, or multi-agent concept.
- Keep all existing category step sequences and transitions unchanged.
- Preserve Phase 3 category behavior, Phase 4 constraint behavior, and Phase 5 host-native and optional direct-executor compatibility.
- Reuse `EffectiveStepContract.reasoning`, step contracts, completion criteria, validation contracts, `ExecutionResult.evidence`, and existing traces.
- Leave expanded evidence enforcement and per-strategy compliance evaluation to Phase 7.
- Existing built-in strategies move to version `0.2.0`; new strategies start at `0.1.0`; `initialRuntimeSpecification` moves to `0.4.0`.
- Add no dependencies.
- Follow TDD: observe a focused failure before each behavior implementation slice.
- Keep the working tree scoped. Do not modify or stage unrelated user-owned files.

---

## File Structure

- `src/spec/reasoning.ts` — make every strategy semantic field required.
- `src/runtime/protocol-registry.ts` — reject unusable built-in or custom strategy definitions during construction.
- `src/protocol/strategies.ts` — define and export the canonical eight-strategy catalog.
- `src/protocol/specification.ts` — install the complete catalog and update specification metadata.
- `src/protocol/categories/discussion.ts` — add adversarial review to the analysis step.
- `src/protocol/categories/task-execution.ts` — add risk analysis and verification where judgment requires them.
- `src/protocol/categories/coding-task.ts` — map evidence, diagnosis, risk, adversarial, and verification strategies to existing steps.
- `tests/phase6-reasoning-strategies.test.ts` — cover definition integrity, exact catalog, workflow stability, compiler resolution, and execution-path compatibility.
- `package.json` — add the Phase 6 test command to the full suite.
- `docs/reasoning/README.md` — document the catalog and observable reasoning boundary.
- `docs/PLAN.md` — resolve the five-versus-eight strategy scope in favor of the approved eight.
- `docs/HOST-NATIVE-PRODUCT-BOUNDARY.md` — align the MVP strategy list with the approved Phase 6 scope.
- `README.md` — publish Phase 6 capability and documentation links.
- `PROGRESS.md` — mark Phase 6 complete and Phase 7 next after verification.
- `docs/superpowers/reports/2026-07-10-phase-6-implementation.md` — record delivered behavior and fresh verification evidence.

---

### Task 1: Enforce complete strategy definitions

**Files:**
- Create: `tests/phase6-reasoning-strategies.test.ts`
- Modify: `package.json`
- Modify: `src/spec/reasoning.ts`
- Modify: `src/runtime/protocol-registry.ts`
- Modify: `src/protocol/strategies.ts`

**Interfaces:**
- Consumes: `ReasoningStrategy`, `ProtocolRuntimeSpecification`, `ProtocolRegistry`, `SpecificationError`.
- Produces: required `ReasoningStrategy.requiredChecks`, `prohibitedShortcuts`, and `evidenceExpectations`; deterministic definition validation during `new ProtocolRegistry(specification)`.

- [ ] **Step 1: Add the focused test script**

Change `package.json` scripts to include Phase 6:

```json
"test": "npm run test:phase3 && npm run test:phase4 && npm run test:phase5 && npm run test:phase6",
"test:phase6": "npm run typecheck && npm run build && node dist/tests/phase6-reasoning-strategies.test.js"
```

- [ ] **Step 2: Write failing definition-integrity tests**

Create `tests/phase6-reasoning-strategies.test.ts` with:

```ts
import {
  ProtocolRegistry,
  SpecificationError,
  constraintAnalysisStrategy,
  initialRuntimeSpecification,
} from "../src/index.js";
import type {
  ProtocolRuntimeSpecification,
  ReasoningStrategy,
} from "../src/index.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function specificationWith(
  strategy: ReasoningStrategy,
): ProtocolRuntimeSpecification {
  return {
    ...initialRuntimeSpecification,
    reasoningStrategies: [
      strategy,
      ...initialRuntimeSpecification.reasoningStrategies.filter(
        (candidate) => candidate.id !== strategy.id,
      ),
    ],
  };
}

function assertSpecificationError(
  strategy: ReasoningStrategy,
  expectedMessage: string,
): void {
  try {
    new ProtocolRegistry(specificationWith(strategy));
  } catch (error) {
    assert(error instanceof SpecificationError, "invalid strategy must throw SpecificationError");
    assertEqual(error.message, expectedMessage, "strategy validation message");
    return;
  }
  throw new Error(`expected SpecificationError: ${expectedMessage}`);
}

const invalidDefinitions: readonly {
  readonly strategy: ReasoningStrategy;
  readonly message: string;
}[] = [
  {
    strategy: { ...constraintAnalysisStrategy, objective: " \n " },
    message: "Reasoning strategy 'constraint_analysis' field 'objective' must be a non-blank string",
  },
  {
    strategy: { ...constraintAnalysisStrategy, behaviors: [] },
    message: "Reasoning strategy 'constraint_analysis' field 'behaviors' must contain at least one entry",
  },
  {
    strategy: { ...constraintAnalysisStrategy, requiredChecks: [] },
    message: "Reasoning strategy 'constraint_analysis' field 'requiredChecks' must contain at least one entry",
  },
  {
    strategy: { ...constraintAnalysisStrategy, prohibitedShortcuts: [] },
    message: "Reasoning strategy 'constraint_analysis' field 'prohibitedShortcuts' must contain at least one entry",
  },
  {
    strategy: { ...constraintAnalysisStrategy, evidenceExpectations: [] },
    message: "Reasoning strategy 'constraint_analysis' field 'evidenceExpectations' must contain at least one entry",
  },
  {
    strategy: { ...constraintAnalysisStrategy, requiredChecks: ["valid", " "] },
    message: "Reasoning strategy 'constraint_analysis' field 'requiredChecks' entry 1 must be a non-blank string",
  },
];

for (const invalid of invalidDefinitions) {
  assertSpecificationError(invalid.strategy, invalid.message);
}

new ProtocolRegistry(initialRuntimeSpecification);

console.log("Phase 6 reasoning strategy tests passed");
```

- [ ] **Step 3: Run the focused test and confirm RED**

Run: `npm run test:phase6`

Expected: FAIL because `ProtocolRegistry` accepts at least the blank objective or empty semantic list.

- [ ] **Step 4: Make every strategy field required**

Change `ReasoningStrategy` in `src/spec/reasoning.ts` to:

```ts
export interface ReasoningStrategy extends SpecificationMetadata {
  readonly id: StrategyId;
  readonly objective: string;
  readonly behaviors: readonly string[];
  readonly requiredChecks: readonly string[];
  readonly prohibitedShortcuts: readonly string[];
  readonly evidenceExpectations: readonly string[];
}
```

- [ ] **Step 5: Complete the two existing strategy definitions**

Use these exact Phase 6 definitions temporarily in `src/protocol/strategies.ts`; Task 2 will add the remaining six and the catalog array:

```ts
export const constraintAnalysisStrategy: ReasoningStrategy = {
  id: "constraint_analysis",
  version: "0.2.0",
  objective: "Identify applicable requirements, prohibitions, permissions, priorities, conflicts, and sequencing constraints.",
  behaviors: [
    "identify explicit requirements, prohibitions, permissions, priorities, and sequencing constraints",
    "separate hard constraints from preferences and assumptions",
    "surface conflicts and unresolved constraint ambiguity",
  ],
  requiredChecks: [
    "confirm every relevant explicit constraint is represented",
    "check for conflicting constraints and authority or priority",
    "check that execution permission and ordering are explicit",
  ],
  prohibitedShortcuts: [
    "infer execution permission from the topic or requested outcome",
    "silently discard a constraint because it is inconvenient",
    "treat a preference as a hard requirement without evidence",
  ],
  evidenceExpectations: [
    "reference relevant constraint IDs or source instructions when available",
    "record unresolved conflicts and the basis for any precedence decision",
  ],
};

export const tradeoffAnalysisStrategy: ReasoningStrategy = {
  id: "tradeoff_analysis",
  version: "0.2.0",
  objective: "Compare viable alternatives against explicit decision criteria and current constraints.",
  behaviors: [
    "identify materially distinct viable alternatives",
    "compare benefits, costs, assumptions, and constraints using explicit criteria",
    "prefer the simplest option that satisfies the current constraints",
  ],
  requiredChecks: [
    "confirm compared options are genuinely viable",
    "check that the same material criteria are applied to each option",
    "identify decisive constraints and assumptions behind the recommendation",
  ],
  prohibitedShortcuts: [
    "force false balance when only one option is viable",
    "hide a decisive downside or constraint violation",
    "converge before meaningful alternatives are compared",
  ],
  evidenceExpectations: [
    "record the comparison criteria and material facts behind each tradeoff",
    "state unsupported assumptions and evidence gaps affecting the recommendation",
  ],
};
```

- [ ] **Step 6: Validate definitions during registry construction**

In `src/runtime/protocol-registry.ts`, call `this.#validateReasoningStrategies()` after indexing the strategies and before validating workflows:

```ts
this.#indexUnique(specification.reasoningStrategies, this.#strategies, "reasoning strategy");
this.#validateReasoningStrategies();
this.#validateWorkflows();
```

Add these private methods:

```ts
#validateReasoningStrategies(): void {
  const listFields = [
    "behaviors",
    "requiredChecks",
    "prohibitedShortcuts",
    "evidenceExpectations",
  ] as const;

  for (const strategy of this.#specification.reasoningStrategies) {
    if (strategy.objective.trim().length === 0) {
      throw new SpecificationError(
        `Reasoning strategy '${strategy.id}' field 'objective' must be a non-blank string`,
      );
    }

    for (const field of listFields) {
      const entries = strategy[field];
      if (entries.length === 0) {
        throw new SpecificationError(
          `Reasoning strategy '${strategy.id}' field '${field}' must contain at least one entry`,
        );
      }
      entries.forEach((entry, index) => {
        if (entry.trim().length === 0) {
          throw new SpecificationError(
            `Reasoning strategy '${strategy.id}' field '${field}' entry ${index} must be a non-blank string`,
          );
        }
      });
    }
  }
}
```

- [ ] **Step 7: Run focused and regression tests**

Run: `npm run test:phase6`

Expected: PASS with `Phase 6 reasoning strategy tests passed`.

Run: `npm test`

Expected: Phase 3, Phase 4, Phase 5, and Phase 6 pass.

- [ ] **Step 8: Commit contract enforcement**

```bash
git add package.json tests/phase6-reasoning-strategies.test.ts src/spec/reasoning.ts src/runtime/protocol-registry.ts src/protocol/strategies.ts
git commit -m "feat(reasoning): enforce complete strategy definitions"
```

---

### Task 2: Build the complete eight-strategy catalog

**Files:**
- Modify: `tests/phase6-reasoning-strategies.test.ts`
- Modify: `src/protocol/strategies.ts`
- Modify: `src/protocol/specification.ts`

**Interfaces:**
- Consumes: the required `ReasoningStrategy` contract from Task 1.
- Produces: eight named strategy constants and `reasoningStrategies: readonly ReasoningStrategy[]`; `initialRuntimeSpecification.reasoningStrategies` uses that catalog.

- [ ] **Step 1: Write failing exact-catalog tests**

Extend the imports in `tests/phase6-reasoning-strategies.test.ts` with:

```ts
import {
  adversarialReviewStrategy,
  evidenceGatheringStrategy,
  hypothesisTestingStrategy,
  reasoningStrategies,
  riskAnalysisStrategy,
  rootCauseAnalysisStrategy,
  verificationStrategy,
} from "../src/index.js";
```

Insert before the final `console.log`:

```ts
const expectedStrategyIds = [
  "constraint_analysis",
  "evidence_gathering",
  "hypothesis_testing",
  "root_cause_analysis",
  "tradeoff_analysis",
  "risk_analysis",
  "adversarial_review",
  "verification",
] as const;

assertEqual(reasoningStrategies.length, expectedStrategyIds.length, "catalog size");
assertEqual(
  new Set(reasoningStrategies.map((strategy) => strategy.id)).size,
  expectedStrategyIds.length,
  "catalog IDs must be unique",
);
assertEqual(
  reasoningStrategies.map((strategy) => strategy.id).join(","),
  expectedStrategyIds.join(","),
  "catalog order and IDs",
);
assertEqual(
  initialRuntimeSpecification.reasoningStrategies,
  reasoningStrategies,
  "initial specification must use the canonical catalog",
);
assertEqual(initialRuntimeSpecification.version, "0.4.0", "Phase 6 specification version");

for (const strategy of reasoningStrategies) {
  assert(strategy.objective.trim().length > 0, `${strategy.id} objective`);
  for (const field of [
    "behaviors",
    "requiredChecks",
    "prohibitedShortcuts",
    "evidenceExpectations",
  ] as const) {
    assert(strategy[field].length > 0, `${strategy.id}.${field} must not be empty`);
    assert(
      strategy[field].every((entry) => entry.trim().length > 0),
      `${strategy.id}.${field} entries must be nonblank`,
    );
  }
}

assertEqual(reasoningStrategies[1], evidenceGatheringStrategy, "evidence export");
assertEqual(reasoningStrategies[2], hypothesisTestingStrategy, "hypothesis export");
assertEqual(reasoningStrategies[3], rootCauseAnalysisStrategy, "root-cause export");
assertEqual(reasoningStrategies[5], riskAnalysisStrategy, "risk export");
assertEqual(reasoningStrategies[6], adversarialReviewStrategy, "adversarial export");
assertEqual(reasoningStrategies[7], verificationStrategy, "verification export");
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm run test:phase6`

Expected: FAIL during typecheck because the six new exports and `reasoningStrategies` do not exist.

- [ ] **Step 3: Add the six new strategy definitions**

Append these definitions to `src/protocol/strategies.ts` after `tradeoffAnalysisStrategy`:

```ts
export const evidenceGatheringStrategy: ReasoningStrategy = {
  id: "evidence_gathering",
  version: "0.1.0",
  objective: "Collect relevant evidence, distinguish facts from assumptions, and expose material evidence gaps.",
  behaviors: [
    "gather evidence that can change or support the current decision",
    "distinguish direct observations from inference and assumption",
    "include contradictory evidence and material unknowns",
  ],
  requiredChecks: [
    "check that each material item is relevant to the objective",
    "check source or artifact provenance when available",
    "identify missing evidence that limits confidence",
  ],
  prohibitedShortcuts: [
    "treat an unsupported assertion as evidence",
    "substitute evidence volume for relevance or quality",
    "omit contradictory evidence without explanation",
  ],
  evidenceExpectations: [
    "reference inspected artifacts, tool results, sources, or observations",
    "record material missing evidence and its effect on confidence",
  ],
};

export const hypothesisTestingStrategy: ReasoningStrategy = {
  id: "hypothesis_testing",
  version: "0.1.0",
  objective: "Evaluate testable candidate explanations by seeking discriminating and falsifying evidence.",
  behaviors: [
    "form materially distinct candidate explanations when alternatives are plausible",
    "derive observations or checks that distinguish candidates",
    "attempt to falsify the leading candidate before accepting it",
  ],
  requiredChecks: [
    "check at least one credible alternative when the evidence permits one",
    "check that proposed tests can distinguish between candidates",
    "record the outcome of each performed check",
  ],
  prohibitedShortcuts: [
    "accept the first plausible explanation without testing",
    "seek only evidence that confirms the preferred candidate",
    "reject a candidate without a relevant observation or check",
  ],
  evidenceExpectations: [
    "record candidate hypotheses, discriminating checks, and observed outcomes",
    "identify candidates that remain untested or inconclusive",
  ],
};

export const rootCauseAnalysisStrategy: ReasoningStrategy = {
  id: "root_cause_analysis",
  version: "0.1.0",
  objective: "Identify the underlying causal fault and distinguish it from symptoms and contributing conditions.",
  behaviors: [
    "separate observed symptoms from candidate causes",
    "trace a causal chain from evidence to the underlying fault",
    "distinguish the root cause from contributing conditions",
  ],
  requiredChecks: [
    "check that evidence supports each material causal link",
    "check that the proposed cause can explain the observed symptoms",
    "check credible alternatives before finalizing the root cause",
  ],
  prohibitedShortcuts: [
    "relabel a symptom as the root cause",
    "treat correlation or timing alone as proof of causation",
    "assume a single cause before considering contributing conditions",
  ],
  evidenceExpectations: [
    "record the evidence chain connecting symptoms to the proposed root cause",
    "record rejected alternatives and the observations that weakened them",
  ],
};

export const riskAnalysisStrategy: ReasoningStrategy = {
  id: "risk_analysis",
  version: "0.1.0",
  objective: "Identify credible failure modes and assess likelihood, impact, mitigation, and residual risk.",
  behaviors: [
    "identify credible failure modes across relevant trust and operational boundaries",
    "assess likelihood and impact using explicit evidence or assumptions",
    "define mitigations and state the remaining residual risk",
  ],
  requiredChecks: [
    "check high-impact and high-likelihood risks first",
    "check assumptions behind qualitative or quantitative ratings",
    "check whether proposed mitigations are feasible and verifiable",
  ],
  prohibitedShortcuts: [
    "equate lack of observed failure with absence of risk",
    "use vague severity labels without a stated basis",
    "ignore residual risk after naming a mitigation",
  ],
  evidenceExpectations: [
    "record the basis for material likelihood and impact assessments",
    "record mitigation evidence, ownership assumptions, and residual risk",
  ],
};

export const adversarialReviewStrategy: ReasoningStrategy = {
  id: "adversarial_review",
  version: "0.1.0",
  objective: "Challenge a candidate result by seeking counterexamples, boundary failures, unsafe assumptions, and unsupported claims.",
  behaviors: [
    "test material claims against counterexamples and edge conditions",
    "inspect scope, trust boundaries, failure paths, and hidden assumptions",
    "separate actionable findings from speculative concerns",
  ],
  requiredChecks: [
    "check the highest-impact assumptions and failure surfaces",
    "check whether the result changes scope or violates a constraint",
    "record the disposition of each material finding",
  ],
  prohibitedShortcuts: [
    "perform an approval-only or ceremonial review",
    "attack irrelevant details while ignoring material failure paths",
    "equate no discovered issue with proof of safety or correctness",
  ],
  evidenceExpectations: [
    "record reviewed attack surfaces, counterexamples, or boundary cases",
    "attach evidence for findings and state coverage limits when no issue is found",
  ],
};

export const verificationStrategy: ReasoningStrategy = {
  id: "verification",
  version: "0.1.0",
  objective: "Check claims and completion criteria against reproducible evidence and report limitations honestly.",
  behaviors: [
    "translate material claims and completion criteria into explicit checks",
    "prefer deterministic, tool, test, or external evidence over self-evaluation",
    "record actual outcomes, failures, and limitations",
  ],
  requiredChecks: [
    "check every required completion claim",
    "check that reported verification was actually executed",
    "check that evidence is current, relevant, and attributable",
  ],
  prohibitedShortcuts: [
    "claim success from intention, plausibility, or an unexecuted check",
    "hide a failed or inconclusive verification result",
    "use model self-assessment when stronger objective evidence is available",
  ],
  evidenceExpectations: [
    "record commands, tools, tests, outputs, or external artifacts used for verification",
    "record failed, skipped, and inconclusive checks with their impact",
  ],
};
```

- [ ] **Step 4: Export the canonical catalog array**

Append to `src/protocol/strategies.ts`:

```ts
export const reasoningStrategies: readonly ReasoningStrategy[] = [
  constraintAnalysisStrategy,
  evidenceGatheringStrategy,
  hypothesisTestingStrategy,
  rootCauseAnalysisStrategy,
  tradeoffAnalysisStrategy,
  riskAnalysisStrategy,
  adversarialReviewStrategy,
  verificationStrategy,
];
```

- [ ] **Step 5: Install the canonical catalog in the runtime specification**

Replace the strategy imports and metadata in `src/protocol/specification.ts` with:

```ts
import { reasoningStrategies } from "./strategies.js";

export const initialRuntimeSpecification: ProtocolRuntimeSpecification = {
  version: "0.4.0",
  description: "Phase 6 runtime specification with reusable observable reasoning strategies.",
  baseProtocol: universalBaseProtocol,
  categories: [discussionCategory, taskExecutionCategory, codingTaskCategory],
  modifiers: [],
  reasoningStrategies,
};
```

Keep the existing base and category imports unchanged.

- [ ] **Step 6: Run focused and full tests**

Run: `npm run test:phase6`

Expected: PASS and exact catalog order matches all eight IDs.

Run: `npm test`

Expected: all Phase 3–6 suites pass.

- [ ] **Step 7: Commit the catalog**

```bash
git add tests/phase6-reasoning-strategies.test.ts src/protocol/strategies.ts src/protocol/specification.ts
git commit -m "feat(reasoning): add complete strategy catalog"
```

---

### Task 3: Map strategies without changing workflows

**Files:**
- Modify: `tests/phase6-reasoning-strategies.test.ts`
- Modify: `src/protocol/categories/discussion.ts`
- Modify: `src/protocol/categories/task-execution.ts`
- Modify: `src/protocol/categories/coding-task.ts`

**Interfaces:**
- Consumes: the canonical catalog, `ProtocolRegistry`, `StepCompiler`, `BehavioralRuntime`, and existing workflow definitions.
- Produces: approved strategy references on existing steps; compiled full definitions visible through both host-native and direct-executor contracts.

- [ ] **Step 1: Write failing mapping and workflow-shape tests**

Extend the test imports with:

```ts
import {
  BehavioralRuntime,
  StepCompiler,
} from "../src/index.js";
import type {
  ModelExecutionInput,
  ModelExecutor,
} from "../src/index.js";
```

Insert before the final log:

```ts
const expectedWorkflowShape = {
  discussion: [
    ["understand-position", ["continue:analyze-and-challenge", "block:-"]],
    ["analyze-and-challenge", ["continue:respond", "retry:analyze-and-challenge"]],
    ["respond", ["complete:-"]],
  ],
  task_execution: [
    ["understand-task", ["continue:plan-execution"]],
    ["plan-execution", ["continue:execute-task"]],
    ["execute-task", ["continue:validate-result"]],
    ["validate-result", ["continue:report"]],
    ["report", ["complete:-"]],
  ],
  coding_task: [
    ["understand-requirement", ["continue:inspect-codebase"]],
    ["inspect-codebase", ["continue:diagnose"]],
    ["diagnose", ["continue:design-solution"]],
    ["design-solution", ["continue:security-check"]],
    ["security-check", ["continue:implement", "block:-"]],
    ["implement", ["continue:static-validation"]],
    ["static-validation", ["continue:runtime-validation"]],
    ["runtime-validation", ["continue:regression-check"]],
    ["regression-check", ["continue:review-diff"]],
    ["review-diff", ["continue:report"]],
    ["report", ["complete:-"]],
  ],
} as const;

const expectedMappings: Readonly<Record<string, readonly string[]>> = {
  "discussion/understand-position": ["constraint_analysis"],
  "discussion/analyze-and-challenge": ["tradeoff_analysis", "adversarial_review"],
  "discussion/respond": [],
  "task_execution/understand-task": ["constraint_analysis"],
  "task_execution/plan-execution": ["tradeoff_analysis", "risk_analysis"],
  "task_execution/execute-task": [],
  "task_execution/validate-result": ["verification"],
  "task_execution/report": [],
  "coding_task/understand-requirement": ["constraint_analysis"],
  "coding_task/inspect-codebase": ["evidence_gathering"],
  "coding_task/diagnose": ["evidence_gathering", "hypothesis_testing", "root_cause_analysis"],
  "coding_task/design-solution": ["tradeoff_analysis", "risk_analysis"],
  "coding_task/security-check": ["risk_analysis", "adversarial_review"],
  "coding_task/implement": [],
  "coding_task/static-validation": ["verification"],
  "coding_task/runtime-validation": ["verification"],
  "coding_task/regression-check": ["verification"],
  "coding_task/review-diff": ["constraint_analysis", "adversarial_review", "verification"],
  "coding_task/report": [],
};

for (const category of initialRuntimeSpecification.categories) {
  const expectedShape = expectedWorkflowShape[category.id as keyof typeof expectedWorkflowShape];
  assert(expectedShape, `unexpected category '${category.id}'`);
  assertEqual(category.workflow.steps.length, expectedShape.length, `${category.id} step count`);

  category.workflow.steps.forEach((step, index) => {
    const expectedStep = expectedShape[index];
    assert(expectedStep, `${category.id} missing expected step ${index}`);
    assertEqual(step.id, expectedStep[0], `${category.id} step ${index}`);
    assertEqual(
      step.allowedTransitions
        .map((transition) => `${transition.action}:${transition.to ?? "-"}`)
        .join(","),
      expectedStep[1].join(","),
      `${category.id}/${step.id} transitions`,
    );

    const mappingKey = `${category.id}/${step.id}`;
    const expectedStrategies = expectedMappings[mappingKey];
    assert(expectedStrategies, `missing expected strategy mapping for ${mappingKey}`);
    assertEqual(
      (step.reasoning ?? []).map((reference) => reference.strategyId).join(","),
      expectedStrategies.join(","),
      `${mappingKey} strategies`,
    );
  });
}
```

- [ ] **Step 2: Add compiler and host/direct compatibility assertions**

Append after the workflow checks:

```ts
const registry = new ProtocolRegistry(initialRuntimeSpecification);
const compiler = new StepCompiler(registry);
const codingProtocol = registry.resolveEffectiveProtocol("coding_task", [], []);
const diagnoseStep = registry.getWorkflowStep("coding_task", "diagnose");
const diagnoseContract = compiler.compile(codingProtocol, diagnoseStep);

assertEqual(
  diagnoseContract.reasoning.strategies
    .map((resolved) => resolved.definition.id)
    .join(","),
  "evidence_gathering,hypothesis_testing,root_cause_analysis",
  "compiler must resolve complete diagnose strategy definitions",
);
for (const resolved of diagnoseContract.reasoning.strategies) {
  assert(resolved.definition.requiredChecks.length > 0, `${resolved.definition.id} checks`);
  assert(
    resolved.definition.evidenceExpectations.length > 0,
    `${resolved.definition.id} evidence expectations`,
  );
}

class CapturingExecutor implements ModelExecutor {
  input?: ModelExecutionInput;

  async execute(input: ModelExecutionInput) {
    this.input = input;
    return {
      output: Object.fromEntries(
        (input.contract.step.outputContract.requiredFields ?? []).map((field) => [field, field]),
      ),
      evidence: ["captured contract"],
      completedCriteria: input.contract.step.completionCriteria
        .filter((criterion) => criterion.required)
        .map((criterion) => criterion.id),
    };
  }
}

const runtimeInput = {
  phaseId: "phase6-entry-phase",
  categoryId: "coding_task",
  objective: "Compare host-native and direct reasoning contracts",
  context: {
    requirement: "Inspect the strategy contract",
    codebaseContext: "Phase 6 test fixture",
  },
} as const;

const hostRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
});
await hostRuntime.startRun({ ...runtimeInput, runId: "phase6-host-native" });
const hostPrepared = await hostRuntime.prepareCurrentStep("phase6-host-native");

const capturingExecutor = new CapturingExecutor();
const directRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: capturingExecutor,
});
await directRuntime.startRun({ ...runtimeInput, runId: "phase6-direct" });
await directRuntime.executeCurrentStep("phase6-direct");
assert(capturingExecutor.input, "direct executor must receive a compiled contract");
assertEqual(
  JSON.stringify(capturingExecutor.input.contract.reasoning),
  JSON.stringify(hostPrepared.contract.reasoning),
  "host-native and direct paths must receive equivalent reasoning contracts",
);
```

- [ ] **Step 3: Run the focused test and confirm RED**

Run: `npm run test:phase6`

Expected: FAIL on the first new mapping difference, such as missing `adversarial_review` on `discussion/analyze-and-challenge`.

- [ ] **Step 4: Apply the approved discussion and task mappings**

In `src/protocol/categories/discussion.ts`:

```ts
reasoning: [
  { strategyId: "tradeoff_analysis" },
  { strategyId: "adversarial_review" },
],
```

Use that exact array on `analyze-and-challenge`. Keep `understand-position` unchanged.

In `src/protocol/categories/task-execution.ts`, use:

```ts
// plan-execution
reasoning: [
  { strategyId: "tradeoff_analysis" },
  { strategyId: "risk_analysis" },
],

// validate-result
reasoning: [{ strategyId: "verification" }],
```

Keep the other task-execution reasoning assignments unchanged.

- [ ] **Step 5: Apply the approved coding mappings**

Use these exact arrays in `src/protocol/categories/coding-task.ts`:

```ts
// inspect-codebase
reasoning: [{ strategyId: "evidence_gathering" }],

// diagnose
reasoning: [
  { strategyId: "evidence_gathering" },
  { strategyId: "hypothesis_testing" },
  { strategyId: "root_cause_analysis" },
],

// design-solution
reasoning: [
  { strategyId: "tradeoff_analysis" },
  { strategyId: "risk_analysis" },
],

// security-check
reasoning: [
  { strategyId: "risk_analysis" },
  { strategyId: "adversarial_review" },
],

// static-validation, runtime-validation, and regression-check
reasoning: [{ strategyId: "verification" }],

// review-diff
reasoning: [
  { strategyId: "constraint_analysis" },
  { strategyId: "adversarial_review" },
  { strategyId: "verification" },
],
```

Keep `understand-requirement` unchanged. Do not add strategies to `implement` or `report`.

- [ ] **Step 6: Run focused, full, and smoke tests**

Run: `npm run test:phase6`

Expected: PASS, including exact workflow shape and host/direct contract equality.

Run: `npm test`

Expected: all Phase 3–6 tests pass; existing transition regression tests remain green.

Run: `npm run smoke`

Expected: direct-executor example completes.

Run: `npm run smoke:host-native`

Expected: `host-native run completed with 3 traces`.

- [ ] **Step 7: Commit workflow mappings**

```bash
git add tests/phase6-reasoning-strategies.test.ts src/protocol/categories/discussion.ts src/protocol/categories/task-execution.ts src/protocol/categories/coding-task.ts
git commit -m "feat(reasoning): map strategies to workflow steps"
```

---

### Task 4: Document the observable strategy boundary

**Files:**
- Create: `docs/reasoning/README.md`
- Modify: `docs/PLAN.md`
- Modify: `docs/HOST-NATIVE-PRODUCT-BOUNDARY.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: the implemented catalog and mappings.
- Produces: user-facing catalog semantics, no-chain-of-thought boundary, and one consistent eight-strategy scope.

- [ ] **Step 1: Create the reasoning strategy guide**

Create `docs/reasoning/README.md`:

```markdown
# Reasoning Strategy Library

Phase 6 provides eight reusable, host-neutral reasoning strategies:

| Strategy | Observable purpose |
|---|---|
| `constraint_analysis` | Identify applicable rules, conflicts, permissions, and sequence. |
| `evidence_gathering` | Collect relevant evidence and expose assumptions and gaps. |
| `hypothesis_testing` | Compare testable explanations using discriminating checks. |
| `root_cause_analysis` | Connect symptoms to an evidence-backed causal fault. |
| `tradeoff_analysis` | Compare viable options against explicit criteria. |
| `risk_analysis` | Assess failure modes, likelihood, impact, mitigation, and residual risk. |
| `adversarial_review` | Seek counterexamples, boundary failures, and unsupported claims. |
| `verification` | Check claims and completion criteria using reproducible evidence. |

Every strategy defines:

- an objective,
- recommended behaviors,
- required checks,
- prohibited shortcuts,
- evidence expectations.

`ProtocolRegistry` rejects blank or empty definitions. `StepCompiler` resolves selected definitions into `EffectiveStepContract.reasoning.strategies`, so host-native and optional direct-executor paths receive the same contract.

## Observable boundary

Strategies standardize behavior that can be inspected through contracts, structured outputs, completion criteria, validation rules, evidence, and traces. They do not request or store hidden chain-of-thought, private scratch work, or a narrative reasoning transcript.

The host returns normal `ExecutionResult` output and optional evidence. Phase 6 does not add model-authored strategy compliance reports. Phase 7 expands evidence enforcement through validators.

## Workflow mapping rule

Use strategies only where judgment is material. Mechanical execution and reporting steps do not receive ceremonial reasoning instructions. Strategy composition changes the effective step contract, not category workflow order or runtime transitions.
```

- [ ] **Step 2: Resolve the roadmap scope consistently**

In `docs/PLAN.md`, replace the five-item reasoning-strategy list under `Recommended MVP Scope` with:

```text
8 Reasoning Strategies:
- constraint_analysis
- evidence_gathering
- hypothesis_testing
- root_cause_analysis
- tradeoff_analysis
- risk_analysis
- adversarial_review
- verification
```

In `docs/HOST-NATIVE-PRODUCT-BOUNDARY.md`, replace the five-item strategy list under `MVP Shipping Definition` with the same eight IDs and heading `8 Initial Reasoning Strategies:`.

- [ ] **Step 3: Update README capability and links**

Add these bullets to the current capability list in `README.md`:

```markdown
- eight reusable reasoning strategies with complete observable contracts,
- deterministic rejection of blank or incomplete strategy definitions,
- strategy composition across existing discussion, task-execution, and coding workflows,
```

Add these documentation links:

```markdown
- [Reasoning strategy library](docs/reasoning/README.md)
- [Phase 6 design](docs/superpowers/specs/2026-07-10-phase-6-reasoning-strategy-library-design.md)
- [Phase 6 implementation plan](docs/superpowers/plans/2026-07-10-phase-6-reasoning-strategy-library.md)
```

- [ ] **Step 4: Check documentation and regression tests**

Run: `git diff --check`

Expected: no output and exit 0.

Run: `npm run test:phase6`

Expected: PASS.

- [ ] **Step 5: Commit strategy documentation**

```bash
git add docs/reasoning/README.md docs/PLAN.md docs/HOST-NATIVE-PRODUCT-BOUNDARY.md README.md
git commit -m "docs: document reasoning strategy library"
```

---

### Task 5: Verify and close Phase 6

**Files:**
- Modify: `README.md`
- Modify: `PROGRESS.md`
- Create: `docs/superpowers/reports/2026-07-10-phase-6-implementation.md`

**Interfaces:**
- Consumes: all Phase 6 code, tests, mappings, and documentation.
- Produces: fresh completion evidence and Phase 7 handoff.

- [ ] **Step 1: Run the complete verification gate**

Run each command separately:

```bash
npm run typecheck
npm test
npm run smoke
npm run smoke:host-native
npm run build
git diff --check
```

Expected:

- typecheck exits 0,
- Phase 3, Phase 4, Phase 5, and Phase 6 tests pass,
- direct smoke completes,
- host-native smoke prints `host-native run completed with 3 traces`,
- build exits 0,
- diff check emits no errors.

- [ ] **Step 2: Review the scoped diff**

Run:

```bash
git diff --stat 6584ea1..HEAD
git diff 6584ea1..HEAD -- src tests package.json README.md PROGRESS.md docs
git status --short
```

Confirm the diff contains only the approved design, plan, eight-strategy implementation, workflow mappings, tests, and documentation. Confirm there is no reasoning transcript field, workflow reorder, transition change, execution API change, state change, trace change, provider dependency, routing, or multi-agent runtime.

- [ ] **Step 3: Record the implementation report**

Create `docs/superpowers/reports/2026-07-10-phase-6-implementation.md` only after Step 1 passes:

```markdown
# Phase 6 Reasoning Strategy Library Implementation Report

## Outcome

The runtime now provides eight reusable reasoning strategies with complete observable contracts and deterministic definition validation. Existing category workflows compose them without changing step order, transitions, host-native execution, or direct-executor compatibility.

## Delivered

- eight-strategy canonical catalog
- required objectives, behaviors, checks, prohibited shortcuts, and evidence expectations
- deterministic registry rejection of blank and empty strategy definitions
- approved mappings across discussion, task-execution, and coding workflows
- full strategy resolution in minimal effective step contracts
- host-native and direct-executor contract compatibility
- no hidden chain-of-thought or reasoning transcript requirement
- Phase 6 regression suite and documentation

## Verification

- `npm run typecheck` — passed
- `npm test` — passed
- `npm run smoke` — passed
- `npm run smoke:host-native` — passed
- `npm run build` — passed
- `git diff --check` — passed

## Next

Phase 7 — Validation Framework.
```

- [ ] **Step 4: Update progress and README status**

In `PROGRESS.md`, change the status table to include:

```markdown
| Phase 6 — Reasoning Strategy Library | ✅ Completed | Added eight reusable strategies, complete observable contracts, definition validation, workflow mappings, and regression coverage. |
| Phase 7 — Validation Framework | ⏳ Next | Add validator interfaces and expanded deterministic evidence enforcement. |
```

Replace the Phase 6 section with:

```markdown
## Phase 6 — Reasoning Strategy Library

**Status:** ✅ Completed

Delivered:

- eight reusable strategy definitions
- required objectives, behaviors, checks, prohibited shortcuts, and evidence expectations
- deterministic definition-integrity validation
- approved strategy mappings without workflow-shape changes
- host-native and direct-executor contract compatibility
- observable behavior and evidence expectations without hidden chain-of-thought

Validation evidence:

- `npm run typecheck` — passed
- `npm test` — passed
- `npm run smoke` — passed
- `npm run smoke:host-native` — passed
- `npm run build` — passed
- `git diff --check` — passed

## Phase 7 — Validation Framework

**Status:** ⏳ Next

Planned scope:

- validator interfaces
- schema, constraint, completion-criteria, deterministic callback, and model-based validators
- bounded retry integration
- traceable validation evidence
```

Change README current status to:

```markdown
**Phase 6 — Reasoning Strategy Library** is implemented.
```

- [ ] **Step 5: Recheck final documentation and commit completion**

Run: `git diff --check`

Expected: no output and exit 0.

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm test`

Expected: all Phase 3–6 suites pass.

Commit:

```bash
git add README.md PROGRESS.md docs/superpowers/reports/2026-07-10-phase-6-implementation.md
git commit -m "docs: complete phase 6 reasoning strategies"
```

- [ ] **Step 6: Show final repository state**

Run:

```bash
git status --short
git log -8 --oneline
```

Expected: no scoped Phase 6 changes remain uncommitted. Report any unrelated pre-existing files without staging or modifying them.
