import type {
  Constraint,
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
  readonly execution: ModelExecutionResult;
}

export interface ValidatorHandler {
  readonly kind: ValidatorKind;
  validate(rule: ValidationRule, context: ValidationContext): Promise<ValidationCheckResult>;
}

export class ValidationPipeline {
  readonly #handlers = new Map<ValidatorKind, ValidatorHandler>();

  constructor(handlers: readonly ValidatorHandler[] = []) {
    for (const handler of handlers) {
      this.#handlers.set(handler.kind, handler);
    }
  }

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const checks: ValidationCheckResult[] = [
      this.#validateRequiredOutputFields(context),
      this.#validateCompletionCriteria(context),
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

    const constraintCompliance = context.execution.constraintCompliance;
    return constraintCompliance
      ? {
          status: this.#aggregateStatus(checks),
          checks,
          constraintCompliance,
        }
      : {
          status: this.#aggregateStatus(checks),
          checks,
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
    if (checks.some((check) => check.status === "failed")) {
      return "failed";
    }
    if (checks.some((check) => check.status === "requires_human_review")) {
      return "requires_human_review";
    }
    if (checks.some((check) => check.status === "inconclusive")) {
      return "inconclusive";
    }
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

    const inconclusive = hardConstraints.filter(
      (constraint) => compliance.get(constraint.id)?.status === "inconclusive",
    );
    if (inconclusive.length > 0) {
      return {
        validatorId: rule.id,
        status: "inconclusive",
        message: `Inconclusive constraints: ${inconclusive.map((item) => item.id).join(", ")}`,
      };
    }

    return {
      validatorId: rule.id,
      status: "passed",
      message: "Relevant hard constraints are satisfied",
    };
  }
}
