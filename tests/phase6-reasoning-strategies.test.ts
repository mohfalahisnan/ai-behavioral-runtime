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

console.log("Phase 6 reasoning strategy tests passed");
