import type {
  Constraint,
  EffectiveProtocol,
  EffectiveStepContract,
  ReasoningProtocol,
  WorkflowStep,
} from "../spec/index.js";
import { ProtocolRegistry } from "./protocol-registry.js";

export class StepCompiler {
  constructor(private readonly registry: ProtocolRegistry) {}

  compile(protocol: EffectiveProtocol, step: WorkflowStep): EffectiveStepContract {
    const constraints = this.#selectConstraints(
      this.registry.resolveConstraints(protocol),
      step,
    );

    const reasoning: ReasoningProtocol = {
      universal: protocol.base.reasoningRules,
      category: [
        ...protocol.category.reasoningRules,
        ...protocol.modifiers.flatMap((modifier) => modifier.reasoningRules ?? []),
      ],
      strategies: (step.reasoning ?? []).map((reference) => {
        const definition = this.registry.getReasoningStrategy(reference.strategyId);
        return reference.parameters
          ? { definition, parameters: reference.parameters }
          : { definition };
      }),
    };

    return {
      categoryId: protocol.category.id,
      modifierIds: protocol.modifiers.map((modifier) => modifier.id),
      rules: this.registry.resolveRules(protocol),
      step,
      reasoning,
      constraints,
    };
  }

  #selectConstraints(
    constraints: readonly Constraint[],
    step: WorkflowStep,
  ): readonly Constraint[] {
    const selector = step.relevantConstraints;
    const include = new Set(selector?.include ?? []);
    const exclude = new Set(selector?.exclude ?? []);
    const includeAllApplicable = selector?.includeAllApplicable ?? true;

    return constraints.filter((constraint) => {
      if (exclude.has(constraint.id)) {
        return false;
      }

      if (include.has(constraint.id)) {
        return true;
      }

      if (!includeAllApplicable) {
        return false;
      }

      return !constraint.appliesTo || constraint.appliesTo.includes(step.id);
    });
  }
}
