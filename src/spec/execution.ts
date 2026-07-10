import type { Constraint } from "./constraints.js";
import type {
  CategoryId,
  JsonValue,
  PhaseId,
  RunId,
  StepId,
} from "./primitives.js";
import type { ReasoningProtocol } from "./reasoning.js";
import type { WorkflowStep } from "./workflow.js";

export interface ModelExecutionInput {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly categoryId: CategoryId;
  readonly step: WorkflowStep;
  readonly reasoning: ReasoningProtocol;
  readonly constraints: readonly Constraint[];
  readonly context: JsonValue;
}

export interface ModelExecutionResult {
  readonly stepId: StepId;
  readonly output: JsonValue;
  readonly evidence?: readonly string[];
  readonly warnings?: readonly string[];
}

/**
 * Core execution abstraction.
 *
 * The specification intentionally does not require model routing, multiple models,
 * provider-specific APIs, or multi-agent execution.
 */
export interface ModelExecutor {
  execute(input: ModelExecutionInput): Promise<ModelExecutionResult>;
}
