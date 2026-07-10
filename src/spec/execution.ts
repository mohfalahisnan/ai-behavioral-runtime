import type {
  Constraint,
  ConstraintCompliance,
  IgnoredConstraintSelection,
} from "./constraints.js";
import type {
  CategoryId,
  ConstraintId,
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
  readonly ignoredConstraints: readonly IgnoredConstraintSelection[];
  readonly constraintIdAliases: Readonly<Record<ConstraintId, ConstraintId>>;
}

export interface ModelExecutionInput {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly contract: EffectiveStepContract;
  readonly context: JsonObject;
}

export interface ExecutionResult {
  readonly output: JsonObject;
  readonly evidence?: readonly string[];
  readonly warnings?: readonly string[];
  readonly completedCriteria?: readonly string[];
  readonly constraintCompliance?: readonly ConstraintCompliance[];
}

/** @deprecated Use ExecutionResult at the host-neutral boundary. */
export type ModelExecutionResult = ExecutionResult;

/**
 * Core execution abstraction.
 *
 * The specification intentionally does not require model routing, multiple models,
 * provider-specific APIs, or multi-agent execution.
 */
export interface ModelExecutor {
  execute(input: ModelExecutionInput): Promise<ExecutionResult>;
}
