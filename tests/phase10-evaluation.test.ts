import {
  BehavioralRuntime,
  InMemoryRuntimeStateStore,
  initialRuntimeSpecification,
  TraceInspector,
  TurnResolver,
  CompletionCriteriaValidatorHandler,
  DeterministicValidatorHandler,
} from "../src/index.js";
import type { ValidationCheckResult, ValidationContext } from "../src/index.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

// 1. Test Turn Classification
console.log("Testing TurnResolver...");
const resolver = new TurnResolver({
  categories: [
    { id: "discussion", keywords: ["discuss", "chat", "explain"] },
    { id: "coding_task", keywords: ["code", "implement", "fix"] },
  ],
  modifiers: [
    { id: "concise", keywords: ["concise", "short"] },
  ],
});

const res1 = await resolver.resolve("discuss the validation framework in a concise way");
assertEqual(res1.categoryId, "discussion", "must classify as discussion");
assert(res1.modifierIds.includes("concise"), "must include concise modifier");

const res2 = await resolver.resolve("fix a bug in validation.ts");
assertEqual(res2.categoryId, "coding_task", "must classify as coding_task");

// 2. Test Dynamic Validator Registry and Custom Callbacks
console.log("Testing Dynamic Validator Registry...");
const runtime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  stateStore: new InMemoryRuntimeStateStore(),
});

const deterministicHandler = new DeterministicValidatorHandler();
deterministicHandler.register("custom-check", async (context: ValidationContext) => {
  const output = context.execution.output;
  if (output.testField === "valid") {
    return {
      validatorId: "custom-check",
      status: "passed",
      message: "Custom check passed successfully",
    };
  }
  return {
    validatorId: "custom-check",
    status: "failed",
    message: "Custom check failed",
  };
});

runtime.registerValidator(deterministicHandler);

// 3. Test Bounded Retries and Validation Pipeline
console.log("Testing Bounded Retries and Validation Pipeline...");
await runtime.startRun({
  runId: "eval-run-1",
  phaseId: "eval-phase",
  categoryId: "discussion",
  objective: "Test custom validation and retry limit",
  context: {
    userTurn: "Hello",
    conversationContext: [],
  },
});

runtime.registerValidator(new CompletionCriteriaValidatorHandler());

const step1Result = await runtime.submitStepResult("eval-run-1", {
  output: {
    position: "The user wants to run a validation test.",
    constraints: [],
  },
  completedCriteria: ["position-understood"],
});

assertEqual(step1Result.validation.status, "failed", "validation must fail due to missing field");
assertEqual(step1Result.transition.action, "block", "since there is no retry policy on understand-position, it must block");

// 4. Test Replay Harness (TraceInspector)
console.log("Testing TraceInspector Replay...");
const inspectorState = await runtime.getState("eval-run-1");
const inspector = new TraceInspector(inspectorState.traces);

const replayRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  stateStore: new InMemoryRuntimeStateStore(),
});
replayRuntime.registerValidator(deterministicHandler);
replayRuntime.registerValidator(new CompletionCriteriaValidatorHandler());

const replayResult = await inspector.replayRun(replayRuntime, {
  runId: "eval-run-1",
  phaseId: "eval-phase",
  categoryId: "discussion",
  objective: "Test custom validation and retry limit",
  context: {
    userTurn: "Hello",
    conversationContext: [],
  },
});

assert(replayResult.success, "replay must match trace outputs deterministically");
assertEqual(replayResult.steps.length, 1, "must replay 1 step");
const firstStep = replayResult.steps[0];
assert(firstStep, "first step must exist");
assert(firstStep.matched, "first step must match expected outcomes");

console.log("Phase 10 evaluation and benchmark tests passed successfully!");
