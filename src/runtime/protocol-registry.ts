import type {
  BehaviorModifier,
  CategoryId,
  CategoryProtocol,
  Constraint,
  EffectiveProtocol,
  ModifierId,
  ProtocolRule,
  ProtocolRuntimeSpecification,
  ReasoningStrategy,
  StrategyId,
  WorkflowStep,
} from "../spec/index.js";
import { SpecificationError } from "./errors.js";

export class ProtocolRegistry {
  readonly #specification: ProtocolRuntimeSpecification;
  readonly #categories = new Map<CategoryId, CategoryProtocol>();
  readonly #modifiers = new Map<ModifierId, BehaviorModifier>();
  readonly #strategies = new Map<StrategyId, ReasoningStrategy>();

  constructor(specification: ProtocolRuntimeSpecification) {
    this.#specification = specification;
    this.#indexUnique(specification.categories, this.#categories, "category");
    this.#indexUnique(specification.modifiers, this.#modifiers, "modifier");
    this.#indexUnique(specification.reasoningStrategies, this.#strategies, "reasoning strategy");
    this.#validateReasoningStrategies();
    this.#validateWorkflows();
  }

  get specification(): ProtocolRuntimeSpecification {
    return this.#specification;
  }

  getCategory(categoryId: CategoryId): CategoryProtocol {
    const category = this.#categories.get(categoryId);
    if (!category) {
      throw new SpecificationError(`Unknown category: ${categoryId}`);
    }
    return category;
  }

  getModifier(modifierId: ModifierId): BehaviorModifier {
    const modifier = this.#modifiers.get(modifierId);
    if (!modifier) {
      throw new SpecificationError(`Unknown modifier: ${modifierId}`);
    }
    return modifier;
  }

  getReasoningStrategy(strategyId: StrategyId): ReasoningStrategy {
    const strategy = this.#strategies.get(strategyId);
    if (!strategy) {
      throw new SpecificationError(`Unknown reasoning strategy: ${strategyId}`);
    }
    return strategy;
  }

  getWorkflowStep(categoryId: CategoryId, stepId: string): WorkflowStep {
    const category = this.getCategory(categoryId);
    const step = category.workflow.steps.find((candidate) => candidate.id === stepId);
    if (!step) {
      throw new SpecificationError(`Unknown step '${stepId}' in category '${categoryId}'`);
    }
    return step;
  }

  resolveEffectiveProtocol(
    categoryId: CategoryId,
    modifierIds: readonly ModifierId[],
    userConstraints: readonly Constraint[],
  ): EffectiveProtocol {
    const category = this.getCategory(categoryId);
    const modifiers = modifierIds.map((modifierId) => this.getModifier(modifierId));

    this.#assertUniqueIds(modifierIds, "modifier activation");
    this.#mergeRules([
      ...this.#specification.baseProtocol.rules,
      ...category.rules,
      ...modifiers.flatMap((modifier) => modifier.rules),
    ]);
    this.#mergeConstraints([
      ...modifiers.flatMap((modifier) => modifier.constraints ?? []),
      ...userConstraints,
    ]);

    return {
      base: this.#specification.baseProtocol,
      category,
      modifiers,
      userConstraints,
    };
  }

  resolveRules(protocol: EffectiveProtocol): readonly ProtocolRule[] {
    return this.#mergeRules([
      ...protocol.base.rules,
      ...protocol.category.rules,
      ...protocol.modifiers.flatMap((modifier) => modifier.rules),
    ]);
  }

  resolveConstraints(protocol: EffectiveProtocol): readonly Constraint[] {
    return this.#mergeConstraints([
      ...protocol.modifiers.flatMap((modifier) => modifier.constraints ?? []),
      ...protocol.userConstraints,
    ]);
  }

  #validateReasoningStrategies(): void {
    const listFields = [
      "behaviors",
      "requiredChecks",
      "prohibitedShortcuts",
      "evidenceExpectations",
    ] as const;

    for (const strategy of this.#specification.reasoningStrategies) {
      if (strategy.objective.trim().length === 0) {
        throw new SpecificationError(
          `Reasoning strategy '${strategy.id}' field 'objective' must be a non-blank string`,
        );
      }

      for (const field of listFields) {
        const entries = strategy[field];
        if (entries.length === 0) {
          throw new SpecificationError(
            `Reasoning strategy '${strategy.id}' field '${field}' must contain at least one entry`,
          );
        }
        entries.forEach((entry, index) => {
          if (entry.trim().length === 0) {
            throw new SpecificationError(
              `Reasoning strategy '${strategy.id}' field '${field}' entry ${index} must be a non-blank string`,
            );
          }
        });
      }
    }
  }

  #validateWorkflows(): void {
    for (const category of this.#specification.categories) {
      const stepIds = category.workflow.steps.map((step) => step.id);
      this.#assertUniqueIds(stepIds, `steps in category '${category.id}'`);

      if (!stepIds.includes(category.workflow.entryStep)) {
        throw new SpecificationError(
          `Entry step '${category.workflow.entryStep}' does not exist in category '${category.id}'`,
        );
      }

      for (const step of category.workflow.steps) {
        for (const strategyRef of step.reasoning ?? []) {
          this.getReasoningStrategy(strategyRef.strategyId);
        }

        for (const transition of step.allowedTransitions) {
          if (transition.to && !stepIds.includes(transition.to)) {
            throw new SpecificationError(
              `Transition from '${step.id}' targets unknown step '${transition.to}' in category '${category.id}'`,
            );
          }
        }
      }
    }
  }

  #indexUnique<T extends { readonly id: string }>(
    values: readonly T[],
    target: Map<string, T>,
    label: string,
  ): void {
    for (const value of values) {
      if (target.has(value.id)) {
        throw new SpecificationError(`Duplicate ${label} id: ${value.id}`);
      }
      target.set(value.id, value);
    }
  }

  #assertUniqueIds(ids: readonly string[], label: string): void {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        throw new SpecificationError(`Duplicate id '${id}' in ${label}`);
      }
      seen.add(id);
    }
  }

  #mergeRules(rules: readonly ProtocolRule[]): readonly ProtocolRule[] {
    const merged = new Map<string, ProtocolRule>();

    for (const rule of rules) {
      const existing = merged.get(rule.id);
      if (existing && !existing.overridable) {
        throw new SpecificationError(`Rule '${rule.id}' is invariant and cannot be overridden`);
      }
      merged.set(rule.id, rule);
    }

    return [...merged.values()];
  }

  #mergeConstraints(constraints: readonly Constraint[]): readonly Constraint[] {
    const merged = new Map<string, Constraint>();

    for (const constraint of constraints) {
      const existing = merged.get(constraint.id);
      if (!existing) {
        merged.set(constraint.id, constraint);
        continue;
      }

      if (!existing.overridable) {
        throw new SpecificationError(
          `Constraint '${constraint.id}' is invariant and cannot be overridden`,
        );
      }

      if (constraint.priority >= existing.priority) {
        merged.set(constraint.id, constraint);
      }
    }

    return [...merged.values()];
  }
}
