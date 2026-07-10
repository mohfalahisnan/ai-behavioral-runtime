import type { ExecutionResult } from "../src/spec/index.js";
import { BehavioralRuntime } from "../src/runtime/index.js";
import { exampleRuntimeSpecification } from "./discussion.protocol.js";

const runtime = new BehavioralRuntime({
  specification: exampleRuntimeSpecification,
  hostAdapter: {
    capabilities: {
      canInjectInstructions: true,
      canObserveModelOutput: true,
      canObserveToolCalls: true,
      canBlockToolCalls: true,
      canTriggerAdditionalTurns: true,
      canPersistLocalState: true,
      canBlockModelOutput: false,
      toolCallInterceptionScope: "partial",
      capabilityNotes: ["Example host cannot suppress already-visible model text"],
    },
  },
});

let state = await runtime.startRun({
  runId: "host-native-demo",
  phaseId: "discussion-phase",
  categoryId: "discussion",
  objective: "Demonstrate host-owned model execution",
  permissionPolicy: { execution: "none" },
  context: {
    userTurn: "Explain the host-native runtime boundary.",
    conversationContext: [],
  },
});

const hostResults: Record<string, ExecutionResult> = {
  "understand-position": {
    output: {
      position: "The plugin governs behavior while the host executes the model.",
      constraints: ["No direct provider API"],
      assumptions: [],
    },
    completedCriteria: ["position-understood"],
  },
  "analyze-and-challenge": {
    output: {
      strengths: ["No duplicate provider credentials"],
      weaknesses: ["Enforcement depends on host hooks"],
      tradeoffs: ["Portability requires honest capability declarations"],
      refinements: ["Record enforcement level in each trace"],
    },
    completedCriteria: ["tradeoffs-exposed"],
  },
  respond: {
    output: { response: "The host executes; the local plugin governs and validates." },
    completedCriteria: ["response-delivered"],
  },
};

while (state.status === "active") {
  const prepared = await runtime.prepareCurrentStep(state.runId);
  if (!prepared.readyForExecution) break;

  // A real plugin injects `prepared.contract` into the host and observes its result.
  const hostResult = hostResults[prepared.contract.step.id];
  if (!hostResult) throw new Error(`Missing host result for ${prepared.contract.step.id}`);
  state = (await runtime.submitStepResult(state.runId, hostResult)).state;
}

if (state.status !== "completed") throw new Error(`Unexpected status: ${state.status}`);
console.log(`host-native run completed with ${state.traces.length} traces`);
