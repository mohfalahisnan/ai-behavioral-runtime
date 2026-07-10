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

class MissingTerminalOutputExecutor extends GenericExecutor {
  override async execute(input: ModelExecutionInput): Promise<ModelExecutionResult> {
    const isTerminal = input.contract.step.allowedTransitions.some(
      (transition) => transition.action === "complete",
    );
    if (isTerminal) {
      return {
        output: {},
        completedCriteria: input.contract.step.completionCriteria
          .filter((criterion) => criterion.required)
          .map((criterion) => criterion.id),
      };
    }

    return super.execute(input);
  }
}

class DeniedSecurityExecutor extends GenericExecutor {
  override async execute(input: ModelExecutionInput): Promise<ModelExecutionResult> {
    if (input.contract.step.id === "security-check") {
      return {
        output: Object.fromEntries(
          (input.contract.step.outputContract.requiredFields ?? []).map((field) => [
            field,
            field === "securityApproval" ? false : `denied:${field}`,
          ]),
        ),
        completedCriteria: input.contract.step.completionCriteria
          .filter((criterion) => criterion.required && criterion.id !== "security-approved")
          .map((criterion) => criterion.id),
      };
    }

    return super.execute(input);
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

const initialContext = {
  userTurn: "Discuss this position",
  conversationContext: "Relevant conversation context",
  task: "Execute this task",
  taskContext: "Relevant task context",
  requirement: "Implement this requirement",
  codebaseContext: "Relevant codebase context",
} as const;

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
    context: initialContext,
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

const missingTerminalOutputRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new MissingTerminalOutputExecutor(),
});
const regressionFailures: string[] = [];

for (const categoryId of requiredCategoryIds) {
  const runId = `missing-terminal-output-${categoryId}`;
  let state = await missingTerminalOutputRuntime.startRun({
    runId,
    phaseId: `phase-missing-terminal-output-${categoryId}`,
    categoryId,
    objective: `Reject invalid terminal output for ${categoryId}`,
    context: initialContext,
  });

  while (state.status === "active") {
    state = (await missingTerminalOutputRuntime.executeCurrentStep(runId)).state;
  }

  if (state.status !== "blocked") {
    regressionFailures.push(
      `category '${categoryId}' completed with missing terminal output`,
    );
    continue;
  }
  const terminalTrace = state.traces.at(-1);
  assert(terminalTrace, `category '${categoryId}' must emit a terminal trace`);
  assertEqual(
    terminalTrace.validation?.status,
    "failed",
    `category '${categoryId}' terminal validation must fail`,
  );
  assertEqual(
    terminalTrace.transition?.action,
    "block",
    `category '${categoryId}' must block after terminal validation failure`,
  );
}

const deniedSecurityRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new DeniedSecurityExecutor(),
});
let deniedSecurityState = await deniedSecurityRuntime.startRun({
  runId: "denied-security-coding-task",
  phaseId: "phase-denied-security-coding-task",
  categoryId: "coding_task",
  objective: "Block implementation when security approval is denied",
  context: initialContext,
});

while (deniedSecurityState.status === "active") {
  deniedSecurityState = (
    await deniedSecurityRuntime.executeCurrentStep(deniedSecurityState.runId)
  ).state;
}

if (deniedSecurityState.status !== "blocked") {
  regressionFailures.push("coding task reached completion after security approval was denied");
} else {
  assertEqual(
    deniedSecurityState.currentStepId,
    "security-check",
    "denied security approval must stop at security-check",
  );
  assert(
    !deniedSecurityState.traces.some((trace) => trace.stepId === "implement"),
    "denied security approval must never reach implement",
  );
  const deniedSecurityTrace = deniedSecurityState.traces.at(-1);
  assert(deniedSecurityTrace, "denied security approval must emit a trace");
  assertEqual(
    deniedSecurityTrace.transition?.action,
    "block",
    "denied security approval must take the declarative block transition",
  );
  assertEqual(
    deniedSecurityTrace.transition?.reason,
    "Security approval is absent or denied; implementation is blocked.",
    "denied security approval must use the declared security block reason",
  );

  const codingCategory = initialRuntimeSpecification.categories.find(
    (category) => category.id === "coding_task",
  );
  const securityStep = codingCategory?.workflow.steps.find(
    (step) => step.id === "security-check",
  );
  assert(securityStep, "coding_task must define security-check");
  assertEqual(
    securityStep.allowedTransitions[0]?.action,
    "continue",
    "security-check guarded continue must be first",
  );
  assertEqual(
    securityStep.allowedTransitions[1]?.action,
    "block",
    "security-check unconditional block must follow guarded continue",
  );
  assertEqual(
    securityStep.allowedTransitions[1]?.when?.validationStatus,
    undefined,
    "security-check block must be unconditional",
  );
}

assertEqual(
  regressionFailures.length,
  0,
  `transition regressions: ${regressionFailures.join("; ")}`,
);

console.log("Phase 3 category tests passed: success and transition regressions");
