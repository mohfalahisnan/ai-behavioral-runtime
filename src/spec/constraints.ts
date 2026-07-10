import type { ConstraintId, PhaseId, StepId } from "./primitives.js";

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

export interface ConstraintOrigin {
  readonly originalInstruction: string;
  readonly normalizedInstruction: string;
}

export interface Constraint {
  readonly id: ConstraintId;
  readonly kind: ConstraintKind;
  readonly rule: string;
  readonly source: ConstraintSource;
  readonly priority: number;
  readonly overridable: boolean;
  readonly appliesTo?: readonly StepId[];
  readonly origin?: ConstraintOrigin;
}

export interface ExtractedConstraint extends Constraint {
  readonly origin: ConstraintOrigin;
}

/** Structured caller input. The runtime does not infer kind or intent. */
export interface ExplicitConstraintInput {
  readonly instruction: string;
  readonly kind: ConstraintKind;
  readonly source: ConstraintSource;
  readonly priority?: number;
  readonly overridable?: boolean;
  readonly appliesTo?: readonly StepId[];
}

export type ConstraintHistoryAction = "registered" | "reaffirmed";

export interface ConstraintHistoryEntry {
  readonly sequence: number;
  readonly constraintId: ConstraintId;
  readonly phaseId: PhaseId;
  readonly action: ConstraintHistoryAction;
  readonly origin?: ConstraintOrigin;
}

export interface ConstraintRegistrySnapshot {
  /** Constraints active for the current phase. */
  readonly constraints: readonly Constraint[];
  /** All constraints known to the run, including inactive prior-phase modifiers. */
  readonly registeredConstraints: readonly Constraint[];
  readonly history: readonly ConstraintHistoryEntry[];
}

export type IgnoredConstraintReason =
  | "explicitly_excluded"
  | "not_applicable_to_step"
  | "include_all_applicable_disabled";

export interface IgnoredConstraintSelection {
  readonly constraintId: ConstraintId;
  readonly reason: IgnoredConstraintReason;
}

export interface ConstraintSelection {
  readonly relevant: readonly Constraint[];
  readonly ignored: readonly IgnoredConstraintSelection[];
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
