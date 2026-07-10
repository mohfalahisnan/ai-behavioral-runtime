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

/**
 * Claude Code host capabilities.
 *
 * Claude Code is classified as `interceptable`, not `fully_governed`.
 * Key caveats:
 * - `@file` references bypass `PreToolUse(Read)` and require Read deny rules.
 * - Stop continuation is capped after eight consecutive blocks.
 * - Users or administrators may disable or restrict hooks.
 * - Final text observation does not imply the plugin can always suppress already-visible text.
 * - Tool-family coverage is partial; newer tool families may not be fully covered.
 */
export const CLAUDE_CODE_HOST_CAPABILITIES: HostCapabilities = {
  canInjectInstructions: true,
  canObserveModelOutput: true,
  canObserveToolCalls: true,
  canBlockToolCalls: true,
  canTriggerAdditionalTurns: true,
  canPersistLocalState: true,
  canSelectModel: false,
  supportsStructuredOutput: false,
  canBlockModelOutput: false,
  toolCallInterceptionScope: "partial",
  capabilityNotes: [
    "@file references bypass PreToolUse(Read) and require Read deny rules",
    "Stop continuation is capped after eight consecutive blocks",
    "Users or administrators may disable or restrict hooks",
    "Final text observation does not imply the plugin can always suppress already-visible text",
    "Tool-family coverage is partial; newer tool families may not be fully covered",
  ],
};

export class ClaudeCodeHostAdapter implements HostAdapter {
  readonly capabilities: HostCapabilities = CLAUDE_CODE_HOST_CAPABILITIES;
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
