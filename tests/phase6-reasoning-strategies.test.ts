import {
  ProtocolRegistry,
  SpecificationError,
  constraintAnalysisStrategy,
  initialRuntimeSpecification,
  adversarialReviewStrategy,
  evidenceGatheringStrategy,
  hypothesisTestingStrategy,
  reasoningStrategies,
  riskAnalysisStrategy,
  rootCauseAnalysisStrategy,
  verificationStrategy,
  BehavioralRuntime,
  StepCompiler,
} from "../src/index.js";
import type {
  ProtocolRuntimeSpecification,
  ReasoningStrategy,
  ModelExecutionInput,
  ModelExecutor,
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

console.log("Phase 6 reasoning strategy tests passed");
