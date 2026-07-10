import type {
  ConstraintRegistrySnapshot,
  EffectiveProtocol,
  EffectiveStepContract,
  ReasoningProtocol,
  WorkflowStep,
} from "../spec/index.js";
import { ConstraintRegistry } from "../constraints/index.js";
import { ProtocolRegistry } from "./protocol-registry.js";

export class StepCompiler {
  constructor(
    private readonly registry: ProtocolRegistry,
    private readonly constraints = new ConstraintRegistry(),
  ) {}

  compile(
    protocol: EffectiveProtocol,
    step: WorkflowStep,
    snapshot?: ConstraintRegistrySnapshot,
  ): EffectiveStepContract {
    const protocolConstraints = snapshot
      ? undefined
      : this.registry.resolveConstraints(protocol);
    const activeSnapshot = snapshot ?? {
      constraints: protocolConstraints ?? [],
      registeredConstraints: protocolConstraints ?? [],
      history: [],
    };
    const selection = this.constraints.select(
      activeSnapshot,
      step.relevantConstraints,
      step.id,
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
      constraints: selection.relevant,
      ignoredConstraints: selection.ignored,
    };
  }
}
