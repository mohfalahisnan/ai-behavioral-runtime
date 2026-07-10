import type { Constraint, ConstraintCompliance } from "./constraints.js";
import type {
  CategoryId,
  JsonObject,
  ModifierId,
  PhaseId,
  RunId,
} from "./primitives.js";
import type { ProtocolRule } from "./protocol.js";
import type { ReasoningProtocol } from "./reasoning.js";
import type { WorkflowStep } from "./workflow.js";

/**
 * Minimal step-specific contract compiled by the runtime.
 * The model receives this contract instead of the full protocol library.
 */
export interface EffectiveStepContract {
  readonly categoryId: CategoryId;
  readonly modifierIds: readonly ModifierId[];
  readonly rules: readonly ProtocolRule[];
  readonly step: WorkflowStep;
  readonly reasoning: ReasoningProtocol;
  readonly constraints: readonly Constraint[];
}

export interface ModelExecutionInput {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly contract: EffectiveStepContract;
  readonly context: JsonObject;
}

export interface ModelExecutionResult {
  readonly output: JsonObject;
  readonly evidence?: readonly string[];
  readonly warnings?: readonly string[];
  readonly completedCriteria?: readonly string[];
  readonly constraintCompliance?: readonly ConstraintCompliance[];
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
