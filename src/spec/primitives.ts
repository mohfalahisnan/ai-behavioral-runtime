/** Stable identifiers make traces, validation results, and transitions replayable. */
export type ProtocolId = string;
export type CategoryId = string;
export type ModifierId = string;
export type PhaseId = string;
export type StepId = string;
export type StrategyId = string;
export type ConstraintId = string;
export type ValidatorId = string;
export type RunId = string;

export type Confidence = number;

export interface SpecificationMetadata {
  readonly version: string;
  readonly description?: string;
  readonly tags?: readonly string[];
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };
