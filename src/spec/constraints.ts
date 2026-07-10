import type { ConstraintId, StepId } from "./primitives.js";

export type ConstraintKind =
  | "must"
  | "must_not"
  | "preference"
  | "permission"
  | "sequence";

export type ConstraintSource =
  | "user"
  | "system"
  | "category"
  | "modifier"
  | "runtime";

export interface Constraint {
  readonly id: ConstraintId;
  readonly kind: ConstraintKind;
  readonly rule: string;
  readonly source: ConstraintSource;
  readonly priority: number;
  readonly overridable: boolean;
  readonly appliesTo?: readonly StepId[];
}

export interface ConstraintRegistry {
  readonly constraints: readonly Constraint[];
}

export type ConstraintComplianceStatus =
  | "satisfied"
  | "violated"
  | "not_applicable"
  | "inconclusive";

export interface ConstraintCompliance {
  readonly constraintId: ConstraintId;
  readonly status: ConstraintComplianceStatus;
  readonly evidence?: readonly string[];
  readonly explanation?: string;
}

export interface ConstraintSelector {
  readonly include?: readonly ConstraintId[];
  readonly exclude?: readonly ConstraintId[];
  readonly includeAllApplicable?: boolean;
}
