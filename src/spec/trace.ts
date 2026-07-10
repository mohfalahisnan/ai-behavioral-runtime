import type { ModelExecutionResult } from "./execution.js";
import type { ConstraintId } from "./primitives.js";
import type {
  CategoryId,
  ModifierId,
  PhaseId,
  RunId,
  StepId,
  StrategyId,
} from "./primitives.js";
import type { ValidationResult } from "./validation.js";
import type { TransitionAction } from "./workflow.js";

export interface EffectiveProtocolTrace {
  readonly categoryId: CategoryId;
  readonly modifierIds: readonly ModifierId[];
  readonly constraintIds: readonly ConstraintId[];
  readonly reasoningStrategyIds: readonly StrategyId[];
}

export interface TransitionTrace {
  readonly action: TransitionAction;
  readonly to?: StepId;
  readonly reason: string;
}

import type { HostCapabilities, EnforcementLevel } from "./host.js";
import type { PermissionPolicy } from "./permissions.js";

export interface HostGovernanceTrace {
  readonly hostCapabilities: HostCapabilities;
  readonly enforcementLevel: EnforcementLevel;
  readonly permissionPolicy: PermissionPolicy;
}

export interface ExecutionTrace {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly stepId: StepId;
  readonly protocol: EffectiveProtocolTrace;
  readonly execution?: ModelExecutionResult;
  readonly validation?: ValidationResult;
  readonly transition?: TransitionTrace;
  readonly timestamp: string;
  readonly governance: HostGovernanceTrace;
}
