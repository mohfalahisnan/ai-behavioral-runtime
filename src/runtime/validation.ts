import type {
  Constraint,
  ConstraintCompliance,
  IgnoredConstraintSelection,
  ModelExecutionResult,
  ValidationCheckResult,
  ValidationResult,
  ValidationRule,
  ValidationStatus,
  ValidatorKind,
  WorkflowStep,
} from "../spec/index.js";

export interface ValidationContext {
  readonly step: WorkflowStep;
  readonly constraints: readonly Constraint[];
  readonly ignoredConstraints: readonly IgnoredConstraintSelection[];
  readonly execution: ModelExecutionResult;
}

export interface ValidatorHandler {
  readonly kind: ValidatorKind;
  validate(rule: ValidationRule, context: ValidationContext): Promise<ValidationCheckResult>;
}

interface ComplianceAnalysis {
  readonly checks: readonly ValidationCheckResult[];
  readonly compliance: readonly ConstraintCompliance[];
}

export class ValidationPipeline {
  readonly #handlers = new Map<ValidatorKind, ValidatorHandler>();

  constructor(handlers: readonly ValidatorHandler[] = []) {
    for (const handler of handlers) {
      this.#handlers.set(handler.kind, handler);
    }
  }

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const compliance = this.#analyzeCompliance(context);
    const checks: ValidationCheckResult[] = [
      this.#validateRequiredOutputFields(context),
      this.#validateCompletionCriteria(context),
      ...compliance.checks,
    ];

    for (const rule of context.step.validationContract?.rules ?? []) {
      const handler = this.#handlers.get(rule.kind);
      if (!handler) {
        checks.push({
          validatorId: rule.id,
          status: rule.required ? "inconclusive" : "passed",
          message: `No validator handler registered for kind '${rule.kind}'`,
        });
        continue;
      }

      checks.push(await handler.validate(rule, context));
    }

    return {
      status: this.#aggregateStatus(checks),
      checks,
      constraintCompliance: compliance.compliance,
    };
  }

  #analyzeCompliance(context: ValidationContext): ComplianceAnalysis {
    const reported = context.execution.constraintCompliance ?? [];
    const knownIds = new Set([
      ...context.constraints.map((constraint) => constraint.id),
      ...context.ignoredConstraints.map((selection) => selection.constraintId),
    ]);
    const firstById = new Map<string, ConstraintCompliance>();
    const duplicateIds = new Set<string>();
    const unknownIds = new Set<string>();
    const invalidStatusEntries = new Set<string>();
    const validStatuses = new Set<unknown>([
      "satisfied",
      "violated",
      "not_applicable",
      "inconclusive",
    ]);

    for (const item of reported) {
      const reportedStatus: unknown = item.status;
      const normalizedItem: ConstraintCompliance = validStatuses.has(reportedStatus)
        ? item
        : {
            ...item,
            status: "inconclusive",
            explanation: `Invalid executor compliance status '${String(reportedStatus)}'`,
          };
      if (!validStatuses.has(reportedStatus)) {
        invalidStatusEntries.add(`${item.constraintId}=${String(reportedStatus)}`);
      }
      if (firstById.has(item.constraintId)) {
        duplicateIds.add(item.constraintId);
      } else {
        firstById.set(item.constraintId, normalizedItem);
      }
      if (!knownIds.has(item.constraintId)) {
        unknownIds.add(item.constraintId);
      }
    }

    const compareIds = (left: string, right: string): number =>
      left < right ? -1 : left > right ? 1 : 0;
    const sortedDuplicates = [...duplicateIds].sort(compareIds);
    const sortedUnknown = [...unknownIds].sort(compareIds);
    const sortedInvalidStatuses = [...invalidStatusEntries].sort(compareIds);
    const integrityMessages = [
      ...(sortedDuplicates.length > 0
        ? [`Duplicate constraint compliance IDs: ${sortedDuplicates.join(", ")}`]
        : []),
      ...(sortedUnknown.length > 0
        ? [`Unknown constraint compliance IDs: ${sortedUnknown.join(", ")}`]
        : []),
      ...(sortedInvalidStatuses.length > 0
        ? [`Invalid constraint compliance statuses: ${sortedInvalidStatuses.join(", ")}`]
        : []),
    ];

    const relevantCompliance = context.constraints.map((constraint) => {
      const item = firstById.get(constraint.id);
      return item ?? {
        constraintId: constraint.id,
        status: "inconclusive" as const,
        explanation: "Executor did not report compliance for this relevant constraint",
      };
    });
    const ignoredCompliance: ConstraintCompliance[] = context.ignoredConstraints.map(
      (selection) => ({
        constraintId: selection.constraintId,
        status: "not_applicable",
        explanation: selection.reason,
      }),
    );
    const hardConstraintIds = new Set(
      context.constraints
        .filter((constraint) => constraint.kind !== "preference")
        .map((constraint) => constraint.id),
    );
    const violatedHard = relevantCompliance
      .filter(
        (item) => hardConstraintIds.has(item.constraintId) && item.status === "violated",
      )
      .map((item) => item.constraintId);
    const inconclusiveHard = relevantCompliance
      .filter(
        (item) =>
          hardConstraintIds.has(item.constraintId) &&
          (item.status === "inconclusive" || item.status === "not_applicable"),
      )
      .map((item) => item.constraintId);

    const integrityCheck: ValidationCheckResult = integrityMessages.length === 0
      ? {
          validatorId: "runtime.constraint_compliance_ids",
          status: "passed",
          message: "Constraint compliance IDs are unique and known",
        }
      : {
          validatorId: "runtime.constraint_compliance_ids",
          status: "failed",
          message: integrityMessages.join("; "),
        };
    const complianceCheck: ValidationCheckResult = violatedHard.length > 0
      ? {
          validatorId: "runtime.constraint_compliance",
          status: "failed",
          message: `Violated hard constraints: ${violatedHard.join(", ")}`,
        }
      : inconclusiveHard.length > 0
        ? {
            validatorId: "runtime.constraint_compliance",
            status: "inconclusive",
            message: `Inconclusive relevant hard constraints: ${inconclusiveHard.join(", ")}`,
          }
        : {
            validatorId: "runtime.constraint_compliance",
            status: "passed",
            message: "Relevant hard constraints have conclusive compliance records",
          };

    return {
      checks: [integrityCheck, complianceCheck],
      compliance: [...relevantCompliance, ...ignoredCompliance],
    };
  }

  #validateRequiredOutputFields(context: ValidationContext): ValidationCheckResult {
    const requiredFields = context.step.outputContract.requiredFields ?? [];
    const missing = requiredFields.filter(
      (field) => !Object.prototype.hasOwnProperty.call(context.execution.output, field),
    );

    return missing.length === 0
      ? {
          validatorId: "runtime.output_contract",
          status: "passed",
          message: "Required output fields are present",
        }
      : {
          validatorId: "runtime.output_contract",
          status: "failed",
          message: `Missing required output fields: ${missing.join(", ")}`,
        };
  }

  #validateCompletionCriteria(context: ValidationContext): ValidationCheckResult {
    const required = context.step.completionCriteria
      .filter((criterion) => criterion.required)
      .map((criterion) => criterion.id);
    const completed = new Set(context.execution.completedCriteria ?? []);
    const missing = required.filter((criterionId) => !completed.has(criterionId));

    return missing.length === 0
      ? {
          validatorId: "runtime.completion_criteria",
          status: "passed",
          message: "Required completion criteria were reported",
        }
      : {
          validatorId: "runtime.completion_criteria",
          status: "failed",
          message: `Missing completion criteria: ${missing.join(", ")}`,
        };
  }

  #aggregateStatus(checks: readonly ValidationCheckResult[]): ValidationStatus {
    if (checks.some((check) => check.status === "failed")) return "failed";
    if (checks.some((check) => check.status === "requires_human_review")) {
      return "requires_human_review";
    }
    if (checks.some((check) => check.status === "inconclusive")) return "inconclusive";
    return "passed";
  }
}

export class SchemaValidatorHandler implements ValidatorHandler {
  readonly kind = "schema" as const;

  async validate(
    rule: ValidationRule,
    context: ValidationContext,
  ): Promise<ValidationCheckResult> {
    const requiredFields = context.step.outputContract.requiredFields ?? [];
    const missing = requiredFields.filter(
      (field) => !Object.prototype.hasOwnProperty.call(context.execution.output, field),
    );

    return missing.length === 0
      ? {
          validatorId: rule.id,
          status: "passed",
          message: "Output satisfies required field contract",
        }
      : {
          validatorId: rule.id,
          status: "failed",
          message: `Missing required output fields: ${missing.join(", ")}`,
        };
  }
}

export class ConstraintValidatorHandler implements ValidatorHandler {
  readonly kind = "constraint" as const;

  async validate(
    rule: ValidationRule,
    context: ValidationContext,
  ): Promise<ValidationCheckResult> {
    if (context.constraints.length === 0) {
      return {
        validatorId: rule.id,
        status: "passed",
        message: "No relevant constraints require compliance evidence",
      };
    }

    const compliance = new Map(
      (context.execution.constraintCompliance ?? []).map((result) => [result.constraintId, result]),
    );
    const hardConstraints = context.constraints.filter(
      (constraint) => constraint.kind !== "preference",
    );
    const missing = hardConstraints.filter((constraint) => !compliance.has(constraint.id));
    if (missing.length > 0) {
      return {
        validatorId: rule.id,
        status: "inconclusive",
        message: `Missing compliance evidence for constraints: ${missing.map((item) => item.id).join(", ")}`,
      };
    }

    const violated = hardConstraints.filter(
      (constraint) => compliance.get(constraint.id)?.status === "violated",
    );
    if (violated.length > 0) {
      return {
        validatorId: rule.id,
        status: "failed",
        message: `Violated constraints: ${violated.map((item) => item.id).join(", ")}`,
      };
    }

    const inconclusive = hardConstraints.filter((constraint) => {
      const status = compliance.get(constraint.id)?.status;
      return status === "inconclusive" || status === "not_applicable";
    });
    return inconclusive.length > 0
      ? {
          validatorId: rule.id,
          status: "inconclusive",
          message: `Inconclusive constraints: ${inconclusive.map((item) => item.id).join(", ")}`,
        }
      : {
          validatorId: rule.id,
          status: "passed",
          message: "Relevant hard constraints are satisfied",
        };
  }
}
