import type {
  ModelExecutionResult,
  Transition,
  TransitionTrace,
  ValidationResult,
  WorkflowStep,
} from "../spec/index.js";

export interface TransitionResolutionContext {
  readonly step: WorkflowStep;
  readonly execution: ModelExecutionResult;
  readonly validation: ValidationResult;
  readonly retriesUsed: number;
}

export class TransitionResolver {
  resolve(context: TransitionResolutionContext): TransitionTrace {
    const matching = context.step.allowedTransitions.find((transition) =>
      this.#matches(transition, context),
    );

    if (!matching) {
      return {
        action: "block",
        reason: `No legal transition matched validation status '${context.validation.status}'`,
      };
    }

    if (matching.action === "retry") {
      const retryPolicy = context.step.retryPolicy;
      if (!retryPolicy) {
        return {
          action: "block",
          reason: "Retry transition selected but the step has no retry policy",
        };
      }

      if (context.retriesUsed >= retryPolicy.maxAttempts) {
        return {
          action: "block",
          reason: `Retry limit exhausted after ${context.retriesUsed} retries`,
        };
      }

      if (
        retryPolicy.retryOn &&
        !retryPolicy.retryOn.includes(context.validation.status)
      ) {
        return {
          action: "block",
          reason: `Retry is not allowed for validation status '${context.validation.status}'`,
        };
      }
    }

    return matching.to
      ? {
          action: matching.action,
          to: matching.to,
          reason: this.#reason(matching, context),
        }
      : {
          action: matching.action,
          reason: this.#reason(matching, context),
        };
  }

  #matches(
    transition: Transition,
    context: TransitionResolutionContext,
  ): boolean {
    const condition = transition.when;
    if (!condition) {
      return true;
    }

    if (
      condition.validationStatus &&
      !condition.validationStatus.includes(context.validation.status)
    ) {
      return false;
    }

    if (condition.completionCriteria) {
      const completed = new Set(context.execution.completedCriteria ?? []);
      if (!condition.completionCriteria.every((criterionId) => completed.has(criterionId))) {
        return false;
      }
    }

    return true;
  }

  #reason(
    transition: Transition,
    context: TransitionResolutionContext,
  ): string {
    return (
      transition.when?.description ??
      `Matched '${transition.action}' transition for validation status '${context.validation.status}'`
    );
  }
}
