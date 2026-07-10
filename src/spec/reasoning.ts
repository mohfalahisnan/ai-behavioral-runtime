import type { SpecificationMetadata, StrategyId } from "./primitives.js";

export interface ReasoningStrategy extends SpecificationMetadata {
  readonly id: StrategyId;
  readonly objective: string;
  readonly behaviors: readonly string[];
  readonly requiredChecks: readonly string[];
  readonly prohibitedShortcuts: readonly string[];
  readonly evidenceExpectations: readonly string[];
}

export interface ReasoningStrategyRef {
  readonly strategyId: StrategyId;
  readonly parameters?: Readonly<Record<string, string | number | boolean>>;
}

export interface ResolvedReasoningStrategy {
  readonly definition: ReasoningStrategy;
  readonly parameters?: Readonly<Record<string, string | number | boolean>>;
}

export interface ReasoningProtocol {
  /** Universal reasoning principles shared by every category. */
  readonly universal: readonly string[];

  /** Reasoning rules contributed by the active category and modifiers. */
  readonly category: readonly string[];

  /** Fully resolved reusable strategies selected for the current step. */
  readonly strategies: readonly ResolvedReasoningStrategy[];
}
