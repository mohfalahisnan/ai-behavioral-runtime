import type {
  CategoryId,
  Constraint,
  ExecutionTrace,
  JsonObject,
  ModelExecutionResult,
  ModifierId,
  PhaseId,
  RunId,
  StepId,
  TransitionTrace,
  ValidationResult,
} from "../spec/index.js";
import type { EffectiveStepContract } from "../spec/execution.js";

export type RunStatus = "active" | "blocked" | "completed";

export interface RuntimeRunState {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly categoryId: CategoryId;
  readonly objective: string;
  readonly modifierIds: readonly ModifierId[];
  readonly userConstraints: readonly Constraint[];
  readonly currentStepId: StepId;
  readonly status: RunStatus;
  readonly context: JsonObject;
  readonly attemptsByStep: Readonly<Record<string, number>>;
  readonly retriesByStep: Readonly<Record<string, number>>;
  readonly traces: readonly ExecutionTrace[];
  readonly blockedReason?: string;
}

export interface StartRunInput {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly categoryId: CategoryId;
  readonly objective: string;
  readonly modifierIds?: readonly ModifierId[];
  readonly userConstraints?: readonly Constraint[];
  readonly context: JsonObject;
}

export interface RuntimeStepResult {
  readonly state: RuntimeRunState;
  readonly contract: EffectiveStepContract;
  readonly execution?: ModelExecutionResult;
  readonly validation: ValidationResult;
  readonly transition: TransitionTrace;
}

export interface RuntimeClock {
  now(): string;
}
