import path from "path";
import { BehavioralRuntime } from "../../runtime/behavioral-runtime.js";
import type { ProtocolRuntimeSpecification, RunId } from "../../spec/index.js";
import { ClaudeCodeHostAdapter } from "./adapter.js";
import { LocalFileStateStore } from "../antigravity/plugin.js";

export interface ClaudeCodeHookInput {
  readonly session_id: string;
  readonly transcript_path?: string;
  readonly cwd?: string;
  readonly permission_mode?: string;
  readonly hook_event_name: string;
  readonly tool_name?: string;
  readonly tool_input?: Record<string, unknown>;
  readonly last_assistant_message?: string;
}

export interface ClaudeCodePluginOptions {
  readonly specification: ProtocolRuntimeSpecification;
  readonly dataDir?: string;
}

export class ClaudeCodePlugin {
  readonly runtime: BehavioralRuntime;
  readonly adapter: ClaudeCodeHostAdapter;
  readonly #store: LocalFileStateStore;

  constructor(options: ClaudeCodePluginOptions) {
    const dataDir = options.dataDir ?? process.env.CLAUDE_PLUGIN_DATA ?? ".behavioral-runtime";
    this.#store = new LocalFileStateStore(path.join(dataDir, "runs"));

    this.adapter = new ClaudeCodeHostAdapter();

    this.runtime = new BehavioralRuntime({
      specification: options.specification,
      hostAdapter: this.adapter,
      stateStore: this.#store,
    });
  }

  async handleSessionStart(input: ClaudeCodeHookInput): Promise<{ systemMessage?: string }> {
    const runId: RunId = input.session_id;

    const hasExisting = await this.#store.has(runId);
    if (!hasExisting) {
      await this.runtime.startRun({
        runId,
        phaseId: "session",
        categoryId: "task_execution",
        objective: "Claude Code session execution",
        context: {
          cwd: input.cwd ?? "",
          permissionMode: input.permission_mode ?? "default",
        },
      });
    }

    const prepared = await this.runtime.prepareCurrentStep(runId);
    const contractSummary = this.#formatContract(prepared);

    return {
      systemMessage: contractSummary,
    };
  }

  async handlePreToolUse(input: ClaudeCodeHookInput): Promise<{
    hookSpecificOutput?: { permissionDecision: string };
    systemMessage?: string;
  }> {
    const runId: RunId = input.session_id;

    try {
      const state = await this.runtime.getState(runId);
      if (state.status !== "active") {
        return { hookSpecificOutput: { permissionDecision: "allow" } };
      }

      // Log tool observation through the adapter
      await this.adapter.observeToolCall({
        runId,
        phaseId: state.phaseId,
        stepId: state.currentStepId,
        toolName: input.tool_name ?? "unknown",
        arguments: (input.tool_input ?? {}) as Record<string, unknown> & { [key: string]: import("../../spec/index.js").JsonObject[string] },
      });

      return {
        hookSpecificOutput: { permissionDecision: "allow" },
      };
    } catch {
      // If run doesn't exist yet, allow the tool call
      return { hookSpecificOutput: { permissionDecision: "allow" } };
    }
  }

  async handlePostToolUse(input: ClaudeCodeHookInput): Promise<Record<string, unknown>> {
    const runId: RunId = input.session_id;

    try {
      const state = await this.runtime.getState(runId);
      if (state.status === "active") {
        // Log tool execution via adapter observation
        await this.adapter.observeToolCall({
          runId,
          phaseId: state.phaseId,
          stepId: state.currentStepId,
          toolName: input.tool_name ?? "unknown",
          arguments: (input.tool_input ?? {}) as Record<string, unknown> & { [key: string]: import("../../spec/index.js").JsonObject[string] },
        });
      }
    } catch {
      // Silently ignore if run doesn't exist
    }

    return {};
  }

  async handleStop(input: ClaudeCodeHookInput): Promise<{
    decision: string;
    reason?: string;
    systemMessage?: string;
  }> {
    const runId: RunId = input.session_id;

    try {
      const state = await this.runtime.getState(runId);
      if (state.status !== "active") {
        return { decision: "approve" };
      }

      const stepResult = await this.runtime.submitStepResult(runId, {
        output: {
          assistantMessage: input.last_assistant_message ?? "",
        },
        completedCriteria: [],
      });

      const transition = stepResult.transition.action;
      if (transition === "complete" || transition === "continue") {
        return { decision: "approve" };
      }

      const reason = stepResult.transition.reason ?? `Step validation requires: ${transition}`;
      return {
        decision: "block",
        reason,
        systemMessage: `Behavioral runtime blocked stop: ${reason}`,
      };
    } catch {
      // If any error occurs, approve to avoid blocking the user
      return { decision: "approve" };
    }
  }

  async handleSessionEnd(input: ClaudeCodeHookInput): Promise<Record<string, unknown>> {
    // Session end is a notification-only event; state is already persisted
    return {};
  }

  #formatContract(prepared: import("../../runtime/types.js").PreparedStep): string {
    const step = prepared.contract.step;
    const constraints = prepared.contract.constraints;
    const rules = prepared.contract.rules;

    const lines: string[] = [
      `[Behavioral Runtime] Active step: ${step.id}`,
      `Objective: ${step.objective}`,
      `Step kind: ${step.kind}`,
    ];

    if (rules.length > 0) {
      lines.push(`Active rules: ${rules.map((r) => r.description ?? r.id).join(", ")}`);
    }

    if (constraints.length > 0) {
      lines.push(`Active constraints: ${constraints.map((c) => `${c.kind}: ${c.rule}`).join("; ")}`);
    }

    const criteria = step.completionCriteria;
    if (criteria.length > 0) {
      lines.push(`Completion criteria: ${criteria.map((c) => c.description).join(", ")}`);
    }

    lines.push(`Enforcement: ${prepared.enforcementLevel}`);

    return lines.join("\n");
  }
}
