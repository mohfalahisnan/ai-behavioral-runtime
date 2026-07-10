import type {
  ModelExecutionInput,
  ModelExecutionResult,
  ModelExecutor,
} from "../src/spec/index.js";
import {
  BehavioralRuntime,
  InMemoryRuntimeStateStore,
} from "../src/runtime/index.js";
import { exampleRuntimeSpecification } from "./discussion.protocol.js";

class DemoExecutor implements ModelExecutor {
  readonly #callsByStep = new Map<string, number>();

  async execute(input: ModelExecutionInput): Promise<ModelExecutionResult> {
    const stepId = input.contract.step.id;
    const call = (this.#callsByStep.get(stepId) ?? 0) + 1;
    this.#callsByStep.set(stepId, call);

    switch (stepId) {
      case "understand-position":
        return {
          output: {
            position: "The runtime should standardize AI behavior without forcing every interaction into one rigid flow.",
            constraints: ["Do not execute external actions during discussion."],
            assumptions: ["Broad categories are more maintainable than deep niche inheritance."],
          },
          completedCriteria: ["position-understood"],
        };

      case "analyze-and-challenge":
        if (call === 1) {
          // Deliberately invalid: `refinements` is missing. The runtime must reject it.
          return {
            output: {
              strengths: ["Predictable state and transitions."],
              weaknesses: ["Protocol complexity can become its own failure mode."],
              tradeoffs: ["More control costs more runtime machinery."],
            },
            completedCriteria: ["tradeoffs-exposed"],
          };
        }

        return {
          output: {
            strengths: ["Predictable state and transitions."],
            weaknesses: ["Protocol complexity can become its own failure mode."],
            tradeoffs: ["More control costs more runtime machinery."],
            refinements: ["Keep categories broad and compile only the active step contract."],
          },
          completedCriteria: ["tradeoffs-exposed"],
        };

      case "respond":
        return {
          output: {
            response: "Use a small deterministic runtime around bounded model reasoning, with validation before transitions.",
          },
          completedCriteria: ["response-delivered"],
        };

      default:
        throw new Error(`Unexpected demo step: ${stepId}`);
    }
  }
}

const runtime = new BehavioralRuntime({
  specification: exampleRuntimeSpecification,
  executor: new DemoExecutor(),
  stateStore: new InMemoryRuntimeStateStore(),
  clock: {
    now: () => "2026-07-10T00:00:00.000Z",
  },
});

const started = await runtime.startRun({
  runId: "demo-run",
  phaseId: "phase-discussion",
  categoryId: "discussion",
  objective: "Critically discuss the behavioral runtime architecture.",
  context: {
    userTurn: "Discuss the nested protocol architecture and challenge weak assumptions.",
    conversationContext: [],
  },
});

console.log(`started: ${started.currentStepId}`);

const initialContract = await runtime.compileCurrentStep("demo-run");
if (initialContract.step.id !== "understand-position") {
  throw new Error("Expected the compiled contract to contain only the active entry step");
}
if (initialContract.reasoning.strategies[0]?.definition.id !== "constraint_analysis") {
  throw new Error("Expected reasoning strategy references to resolve into full definitions");
}

while ((await runtime.getState("demo-run")).status === "active") {
  const result = await runtime.executeCurrentStep("demo-run");
  console.log(
    `${result.contract.step.id}: validation=${result.validation.status}, transition=${result.transition.action}${result.transition.to ? ` -> ${result.transition.to}` : ""}`,
  );
}

const finalState = await runtime.getState("demo-run");

if (finalState.status !== "completed") {
  throw new Error(`Expected completed run, got '${finalState.status}'`);
}

if ((finalState.retriesByStep["analyze-and-challenge"] ?? 0) !== 1) {
  throw new Error("Expected the invalid analysis output to trigger exactly one retry");
}

if (finalState.traces.length !== 4) {
  throw new Error(`Expected 4 traces, got ${finalState.traces.length}`);
}

console.log(`completed with ${finalState.traces.length} traces and one validated retry`);

const blocked = await runtime.startRun({
  runId: "blocked-run",
  phaseId: "phase-blocked",
  categoryId: "discussion",
  objective: "Prove missing required input blocks before model execution.",
  context: {
    userTurn: "Discuss this without the required conversation context field.",
  },
});

if (blocked.currentStepId !== "understand-position") {
  throw new Error("Expected blocked demo to start at the discussion entry step");
}

const blockedResult = await runtime.executeCurrentStep("blocked-run");
if (blockedResult.state.status !== "blocked") {
  throw new Error(`Expected blocked run, got '${blockedResult.state.status}'`);
}
if (blockedResult.execution) {
  throw new Error("Model executor must not run when the input contract fails");
}

console.log("blocked invalid input before model execution");
