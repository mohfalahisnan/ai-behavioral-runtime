import type {
  CategoryId,
  Constraint,
  ConstraintId,
  ConstraintRegistrySnapshot,
  ExecutionTrace,
  ExplicitConstraintInput,
  JsonObject,
  ModelExecutionResult,
  ModifierId,
  PhaseId,
  RunId,
  StepId,
  TransitionTrace,
  ValidationResult,
  EnforcementLevel,
  HostCapabilities,
  PermissionPolicy,
} from "../spec/index.js";
import type { EffectiveStepContract } from "../spec/execution.js";

export type RunStatus = "active" | "blocked" | "completed";

export interface PreparedStep {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly contract: EffectiveStepContract;
  readonly context: JsonObject;
  readonly permissionPolicy: PermissionPolicy;
  readonly hostCapabilities: HostCapabilities;
  readonly enforcementLevel: EnforcementLevel;
  readonly readyForExecution: boolean;
  readonly inputValidation: ValidationResult;
}

export interface RuntimeRunState {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly categoryId: CategoryId;
  readonly objective: string;
  readonly modifierIds: readonly ModifierId[];
  readonly userConstraints: readonly Constraint[];
  readonly constraintRegistry: ConstraintRegistrySnapshot;
  readonly persistentConstraintIds: readonly ConstraintId[];
  readonly currentStepId: StepId;
  readonly status: RunStatus;
  readonly context: JsonObject;
  readonly attemptsByStep: Readonly<Record<string, number>>;
  readonly retriesByStep: Readonly<Record<string, number>>;
  readonly traces: readonly ExecutionTrace[];
  readonly blockedReason?: string;
  readonly permissionPolicy: PermissionPolicy;
}

export interface StartRunInput {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly categoryId: CategoryId;
  readonly objective: string;
  readonly modifierIds?: readonly ModifierId[];
  readonly userConstraints?: readonly Constraint[];
  readonly explicitConstraints?: readonly ExplicitConstraintInput[];
  readonly context: JsonObject;
  readonly permissionPolicy?: PermissionPolicy;
}

export interface PhaseTransitionInput {
  readonly phaseId: PhaseId;
  readonly categoryId: CategoryId;
  readonly objective: string;
  readonly modifierIds?: readonly ModifierId[];
  readonly userConstraints?: readonly Constraint[];
  readonly explicitConstraints?: readonly ExplicitConstraintInput[];
  readonly permissionPolicy?: PermissionPolicy;
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
