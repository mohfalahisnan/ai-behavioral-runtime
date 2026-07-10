import type { EffectiveStepContract, ExecutionResult } from "./execution.js";
import type { PermissionPolicy } from "./permissions.js";
import type {
  JsonObject,
  PhaseId,
  RunId,
  StepId,
} from "./primitives.js";

export type EnforcementLevel =
  | "prompt_only"
  | "observable"
  | "interceptable"
  | "fully_governed";

export type ToolCallInterceptionScope = "none" | "partial" | "complete";

export interface HostCapabilities {
  readonly canInjectInstructions: boolean;
  readonly canObserveModelOutput: boolean;
  readonly canObserveToolCalls: boolean;
  readonly canBlockToolCalls: boolean;
  readonly canTriggerAdditionalTurns: boolean;
  readonly canPersistLocalState: boolean;
  readonly canSelectModel?: boolean;
  readonly supportsStructuredOutput?: boolean;
  readonly canBlockModelOutput?: boolean;
  readonly toolCallInterceptionScope?: ToolCallInterceptionScope;
  readonly capabilityNotes?: readonly string[];
}

export interface HostInstructionInput {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly contract: EffectiveStepContract;
  readonly context: JsonObject;
  readonly permissionPolicy: PermissionPolicy;
  readonly enforcementLevel: EnforcementLevel;
}

export interface HostObservationInput {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly stepId: StepId;
  readonly rawOutput: unknown;
}

export interface HostModelOutput {
  readonly result: ExecutionResult;
}

export interface HostToolCallInput {
  readonly runId: RunId;
  readonly phaseId: PhaseId;
  readonly stepId: StepId;
  readonly toolName: string;
  readonly arguments: JsonObject;
}

export interface HostToolCallObservation {
  readonly observed: boolean;
  readonly metadata?: JsonObject;
}

export type HostToolCallDecision =
  | { readonly action: "allow" }
  | { readonly action: "block"; readonly reason: string };

export interface HostAdapter {
  readonly capabilities: HostCapabilities;
  injectInstructions?(input: HostInstructionInput): Promise<void>;
  observeModelOutput?(input: HostObservationInput): Promise<HostModelOutput>;
  observeToolCall?(input: HostToolCallInput): Promise<HostToolCallObservation>;
  blockToolCall?(input: HostToolCallInput): Promise<HostToolCallDecision>;
}
