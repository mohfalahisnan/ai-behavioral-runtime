import type {
  HostAdapter,
  HostCapabilities,
  HostInstructionInput,
  HostObservationInput,
  HostModelOutput,
  HostToolCallInput,
  HostToolCallObservation,
  HostToolCallDecision,
} from "../../spec/index.js";

export const ANTIGRAVITY_HOST_CAPABILITIES: HostCapabilities = {
  canInjectInstructions: true,
  canObserveModelOutput: true,
  canObserveToolCalls: true,
  canBlockToolCalls: true,
  canTriggerAdditionalTurns: true,
  canPersistLocalState: true,
  canSelectModel: true,
  supportsStructuredOutput: true,
  canBlockModelOutput: true,
  toolCallInterceptionScope: "complete",
  capabilityNotes: ["Antigravity host allows complete interception and governance over execution lifecycle"],
};

export class AntigravityHostAdapter implements HostAdapter {
  readonly capabilities: HostCapabilities = ANTIGRAVITY_HOST_CAPABILITIES;
  readonly #onInstruction: ((input: HostInstructionInput) => Promise<void>) | undefined;
  readonly #onModelOutput: ((input: HostObservationInput) => Promise<HostModelOutput>) | undefined;
  readonly #onToolCall: ((input: HostToolCallInput) => Promise<HostToolCallObservation>) | undefined;
  readonly #onBlockToolCall: ((input: HostToolCallInput) => Promise<HostToolCallDecision>) | undefined;

  constructor(callbacks?: {
    onInstruction?: (input: HostInstructionInput) => Promise<void>;
    onModelOutput?: (input: HostObservationInput) => Promise<HostModelOutput>;
    onToolCall?: (input: HostToolCallInput) => Promise<HostToolCallObservation>;
    onBlockToolCall?: (input: HostToolCallInput) => Promise<HostToolCallDecision>;
  }) {
    this.#onInstruction = callbacks?.onInstruction;
    this.#onModelOutput = callbacks?.onModelOutput;
    this.#onToolCall = callbacks?.onToolCall;
    this.#onBlockToolCall = callbacks?.onBlockToolCall;
  }

  async injectInstructions(input: HostInstructionInput): Promise<void> {
    if (this.#onInstruction) {
      await this.#onInstruction(input);
    }
  }

  async observeModelOutput(input: HostObservationInput): Promise<HostModelOutput> {
    if (this.#onModelOutput) {
      return await this.#onModelOutput(input);
    }
    return {
      result: {
        output: {},
      },
    };
  }

  async observeToolCall(input: HostToolCallInput): Promise<HostToolCallObservation> {
    if (this.#onToolCall) {
      return await this.#onToolCall(input);
    }
    return { observed: false };
  }

  async blockToolCall(input: HostToolCallInput): Promise<HostToolCallDecision> {
    if (this.#onBlockToolCall) {
      return await this.#onBlockToolCall(input);
    }
    return { action: "allow" };
  }
}
