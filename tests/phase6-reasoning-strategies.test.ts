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
