import type {
  ConstraintCompliance,
  ConstraintSelector,
} from "./constraints.js";
import type {
  JsonValue,
  SpecificationMetadata,
  ValidatorId,
} from "./primitives.js";

export type ValidatorKind =
  | "schema"
  | "constraint"
  | "completion_criteria"
  | "deterministic"
  | "tool_result"
  | "test"
  | "external_evidence"
  | "model"
  | "human";

export interface ValidationRule {
  readonly id: ValidatorId;
  readonly kind: ValidatorKind;
  readonly description: string;
  readonly required: boolean;
  readonly configuration?: JsonValue;
}

export interface ValidationContract extends SpecificationMetadata {
  readonly rules: readonly ValidationRule[];
  readonly constraints?: ConstraintSelector;
  readonly requireEvidence?: boolean;
}

export type ValidationStatus =
  | "passed"
  | "failed"
  | "inconclusive"
  | "requires_human_review";

export interface ValidationCheckResult {
  readonly validatorId: ValidatorId;
  readonly status: ValidationStatus;
  readonly evidence?: readonly string[];
  readonly message?: string;
}

export interface ValidationResult {
  readonly status: ValidationStatus;
  readonly checks: readonly ValidationCheckResult[];
  readonly constraintCompliance?: readonly ConstraintCompliance[];
}
