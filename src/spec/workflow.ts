import type { ConstraintSelector } from "./constraints.js";
import type {
  JsonValue,
  SpecificationMetadata,
  StepId,
} from "./primitives.js";
import type { ReasoningStrategyRef } from "./reasoning.js";
import type { ValidationContract, ValidationStatus } from "./validation.js";

export type StepKind = "reasoning" | "action" | "validation" | "control";

export interface DataContract {
  readonly description: string;
  readonly schema?: JsonValue;
  readonly requiredFields?: readonly string[];
}

export interface CompletionCriterion {
  readonly id: string;
  readonly description: string;
  readonly required: boolean;
}

export type TransitionAction = "continue" | "retry" | "replan" | "block" | "complete";

export interface TransitionCondition {
  readonly validationStatus?: readonly ValidationStatus[];
  readonly completionCriteria?: readonly string[];
  readonly description?: string;
}

export interface Transition {
  readonly action: TransitionAction;
  readonly to?: StepId;
  readonly when?: TransitionCondition;
}

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly retryOn?: readonly ValidationStatus[];
}

export interface WorkflowStep extends SpecificationMetadata {
  readonly id: StepId;
  readonly kind: StepKind;
  readonly objective: string;
  readonly reasoning?: readonly ReasoningStrategyRef[];
  readonly inputContract: DataContract;
  readonly outputContract: DataContract;
  readonly relevantConstraints?: ConstraintSelector;
  readonly validationContract?: ValidationContract;
  readonly completionCriteria: readonly CompletionCriterion[];
  readonly allowedTransitions: readonly Transition[];
  readonly retryPolicy?: RetryPolicy;
}

export interface WorkflowDefinition extends SpecificationMetadata {
  readonly entryStep: StepId;
  readonly steps: readonly WorkflowStep[];
}
