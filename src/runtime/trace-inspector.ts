import type { ExecutionTrace, RunId, StepId, ValidationStatus } from "../spec/index.js";
import type { BehavioralRuntime } from "./behavioral-runtime.js";

export interface ReplayStepResult {
  readonly stepId: StepId;
  readonly expectedValidationStatus: ValidationStatus;
  readonly actualValidationStatus: ValidationStatus;
  readonly expectedTransitionAction: string;
  readonly actualTransitionAction: string;
  readonly matched: boolean;
}

export interface ReplayResult {
  readonly runId: RunId;
  readonly success: boolean;
  readonly steps: readonly ReplayStepResult[];
}

export class TraceInspector {
  readonly #traces: readonly ExecutionTrace[];

  constructor(traces: readonly ExecutionTrace[]) {
    this.#traces = traces;
  }

  get traces(): readonly ExecutionTrace[] {
    return this.#traces;
  }

  filterByRun(runId: RunId): TraceInspector {
    return new TraceInspector(this.#traces.filter((t) => t.runId === runId));
  }

  filterByStep(stepId: StepId): TraceInspector {
    return new TraceInspector(this.#traces.filter((t) => t.stepId === stepId));
  }

  filterByValidationStatus(status: ValidationStatus): TraceInspector {
    return new TraceInspector(this.#traces.filter((t) => t.validation?.status === status));
  }

  async replayRun(
    runtime: BehavioralRuntime,
    initialRunState: Parameters<BehavioralRuntime["startRun"]>[0],
  ): Promise<ReplayResult> {
    const runId = initialRunState.runId;
    const runTraces = this.#traces.filter((t) => t.runId === runId);

    if (runTraces.length === 0) {
      return { runId, success: false, steps: [] };
    }

    // Initialize state
    await runtime.startRun(initialRunState);

    const steps: ReplayStepResult[] = [];
    let success = true;

    for (const trace of runTraces) {
      if (!trace.execution) {
        await runtime.prepareCurrentStep(runId);
        const currentState = await runtime.getState(runId);
        const expectedAction = trace.transition?.action ?? "block";
        const actualAction = currentState.status === "blocked" ? "block" : "continue";
        const matched = expectedAction === actualAction;

        steps.push({
          stepId: trace.stepId,
          expectedValidationStatus: trace.validation?.status ?? "passed",
          actualValidationStatus: trace.validation?.status ?? "passed",
          expectedTransitionAction: expectedAction,
          actualTransitionAction: actualAction,
          matched,
        });

        if (!matched) success = false;
        continue;
      }

      await runtime.prepareCurrentStep(runId);
      const stepResult = await runtime.submitStepResult(runId, trace.execution);

      const expectedValidationStatus = trace.validation?.status ?? "passed";
      const actualValidationStatus = stepResult.validation.status;
      const expectedTransitionAction = trace.transition?.action ?? "continue";
      const actualTransitionAction = stepResult.transition.action;
      const matched =
        expectedValidationStatus === actualValidationStatus &&
        expectedTransitionAction === actualTransitionAction;

      steps.push({
        stepId: trace.stepId,
        expectedValidationStatus,
        actualValidationStatus,
        expectedTransitionAction,
        actualTransitionAction,
        matched,
      });

      if (!matched) success = false;
    }

    return { runId, success, steps };
  }
}
