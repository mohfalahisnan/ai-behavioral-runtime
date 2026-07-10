import type { Constraint } from "./constraints.js";
import type {
  CategoryId,
  ModifierId,
  ProtocolId,
  SpecificationMetadata,
} from "./primitives.js";
import type { ReasoningStrategy } from "./reasoning.js";
import type { WorkflowDefinition } from "./workflow.js";

export interface ProtocolRule {
  readonly id: string;
  readonly description: string;
  readonly overridable: boolean;
}

export interface BaseProtocol extends SpecificationMetadata {
  readonly id: ProtocolId;
  readonly rules: readonly ProtocolRule[];
  readonly reasoningRules: readonly string[];
}

export interface CategoryProtocol extends SpecificationMetadata {
  readonly id: CategoryId;
  readonly label: string;
  readonly rules: readonly ProtocolRule[];
  readonly reasoningRules: readonly string[];
  readonly workflow: WorkflowDefinition;
}

export interface BehaviorModifier extends SpecificationMetadata {
  readonly id: ModifierId;
  readonly rules: readonly ProtocolRule[];
  readonly reasoningRules?: readonly string[];
  readonly constraints?: readonly Constraint[];
}

export interface EffectiveProtocol {
  readonly base: BaseProtocol;
  readonly category: CategoryProtocol;
  readonly modifiers: readonly BehaviorModifier[];
  readonly userConstraints: readonly Constraint[];
}

export interface ProtocolRuntimeSpecification extends SpecificationMetadata {
  readonly baseProtocol: BaseProtocol;
  readonly categories: readonly CategoryProtocol[];
  readonly modifiers: readonly BehaviorModifier[];
  readonly reasoningStrategies: readonly ReasoningStrategy[];
}
