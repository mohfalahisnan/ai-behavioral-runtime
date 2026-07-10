import { BehavioralRuntime } from "../src/runtime/index.js";
import type {
  ModelExecutionInput,
  ModelExecutionResult,
  ModelExecutor,
} from "../src/spec/index.js";
import { initialRuntimeSpecification } from "../src/protocol/index.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertSequence(
  actual: readonly string[],
  expected: readonly string[],
  message: string,
): void {
  assertEqual(actual.length, expected.length, `${message} length`);
  expected.forEach((value, index) => {
    assertEqual(actual[index], value, `${message} item ${index}`);
  });
}

class GenericExecutor implements ModelExecutor {
  async execute(input: ModelExecutionInput): Promise<ModelExecutionResult> {
    const output = Object.fromEntries(
      (input.contract.step.outputContract.requiredFields ?? []).map((field) => [
        field,
        `${input.contract.categoryId}:${input.contract.step.id}:${field}`,
      ]),
    );

    return {
      output,
      completedCriteria: input.contract.step.completionCriteria
        .filter((criterion) => criterion.required)
        .map((criterion) => criterion.id),
    };
  }
}

const expectedWorkflows = {
  discussion: [
    "understand-position:reasoning",
    "analyze-and-challenge:reasoning",
    "respond:action",
  ],
  task_execution: [
    "understand-task:reasoning",
    "plan-execution:reasoning",
    "execute-task:action",
    "validate-result:validation",
    "report:action",
  ],
  coding_task: [
    "understand-requirement:reasoning",
    "inspect-codebase:action",
    "diagnose:reasoning",
    "design-solution:reasoning",
    "security-check:validation",
    "implement:action",
    "static-validation:validation",
    "runtime-validation:validation",
    "regression-check:validation",
    "review-diff:reasoning",
    "report:action",
  ],
} as const;

const requiredCategoryIds = Object.keys(expectedWorkflows) as Array<
  keyof typeof expectedWorkflows
>;

for (const categoryId of requiredCategoryIds) {
  const occurrences = initialRuntimeSpecification.categories.filter(
    (category) => category.id === categoryId,
  );
  assertEqual(occurrences.length, 1, `category '${categoryId}' must occur exactly once`);

  const category = occurrences[0];
  assert(category, `category '${categoryId}' must exist`);
  assertSequence(
    category.workflow.steps.map((step) => `${step.id}:${step.kind}`),
    expectedWorkflows[categoryId],
    `workflow '${categoryId}'`,
  );
}

const workflowSequences = requiredCategoryIds.map((categoryId) =>
  expectedWorkflows[categoryId].map((step) => step.split(":")[0]).join(">"),
);
assertEqual(
  new Set(workflowSequences).size,
  requiredCategoryIds.length,
  "the three workflows must have different ordered step-ID sequences",
);

const executor = new GenericExecutor();
const runtime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor,
});

for (const categoryId of requiredCategoryIds) {
  const runId = `phase3-${categoryId}`;
  let state = await runtime.startRun({
    runId,
    phaseId: `phase-${categoryId}`,
    categoryId,
    objective: `Complete the ${categoryId} workflow`,
    context: {
      userTurn: "Discuss this position",
      conversationContext: "Relevant conversation context",
      task: "Execute this task",
      taskContext: "Relevant task context",
      requirement: "Implement this requirement",
      codebaseContext: "Relevant codebase context",
    },
  });

  assertEqual(
    state.categoryId,
    categoryId,
    "StartRunInput.categoryId must manually select the category",
  );

  while (state.status === "active") {
    state = (await runtime.executeCurrentStep(runId)).state;
  }

  assertEqual(state.status, "completed", `run '${runId}' must complete`);
  assertEqual(
    state.traces.length,
    expectedWorkflows[categoryId].length,
    `run '${runId}' must emit one trace per workflow step`,
  );
  for (const trace of state.traces) {
    assertEqual(
      trace.protocol.categoryId,
      categoryId,
      `trace '${trace.stepId}' must record the selected category`,
    );
  }
}

console.log("Phase 3 category tests passed: discussion, task_execution, coding_task");
