import fs from "fs/promises";
import path from "path";
import { BehavioralRuntime } from "../../runtime/behavioral-runtime.js";
import type { RuntimeStateStore } from "../../runtime/state-store.js";
import type { RuntimeRunState } from "../../runtime/types.js";
import type { RunId, ProtocolRuntimeSpecification } from "../../spec/index.js";
import { AntigravityHostAdapter } from "./adapter.js";
import { AntigravityHookServer, type WebhookPayload } from "./server.js";

export class LocalFileStateStore implements RuntimeStateStore {
  readonly #dir: string;

  constructor(baseDir: string = ".behavioral-runtime/runs") {
    this.#dir = baseDir;
  }

  async get(runId: RunId): Promise<RuntimeRunState | undefined> {
    try {
      const filePath = path.join(this.#dir, `${runId}.json`);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as RuntimeRunState;
    } catch {
      return undefined;
    }
  }

  async save(state: RuntimeRunState): Promise<void> {
    await fs.mkdir(this.#dir, { recursive: true });
    const filePath = path.join(this.#dir, `${state.runId}.json`);
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
  }

  async has(runId: RunId): Promise<boolean> {
    try {
      const filePath = path.join(this.#dir, `${runId}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export interface AntigravityPluginOptions {
  readonly specification: ProtocolRuntimeSpecification;
  readonly baseDir?: string;
}

export class AntigravityPlugin {
  readonly runtime: BehavioralRuntime;
  readonly adapter: AntigravityHostAdapter;
  readonly server: AntigravityHookServer;
  readonly #store: LocalFileStateStore;

  constructor(options: AntigravityPluginOptions) {
    const baseDir = options.baseDir ?? ".behavioral-runtime";
    this.#store = new LocalFileStateStore(path.join(baseDir, "runs"));
    
    this.adapter = new AntigravityHostAdapter({
      onInstruction: async (input) => {
        console.log(`[Plugin] Injected instructions for step: ${input.contract.step.id}`);
      },
      onModelOutput: async (input) => {
        console.log(`[Plugin] Observed model output for step: ${input.stepId}`);
        return { result: { output: {} } };
      },
      onToolCall: async (input) => {
        console.log(`[Plugin] Observed tool call: ${input.toolName}`);
        return { observed: true };
      },
      onBlockToolCall: async (input) => {
        console.log(`[Plugin] Deciding on tool call: ${input.toolName}`);
        return { action: "allow" };
      },
    });

    this.runtime = new BehavioralRuntime({
      specification: options.specification,
      hostAdapter: this.adapter,
      stateStore: this.#store,
    });

    this.server = new AntigravityHookServer((payload) => this.handleWebhook(payload));
  }

  async start(port: number): Promise<void> {
    await this.server.start(port);
    console.log(`[Plugin] Antigravity Plugin Hook Server active on 127.0.0.1:${port}`);
  }

  async stop(): Promise<void> {
    await this.server.stop();
    console.log("[Plugin] Antigravity Plugin Hook Server stopped");
  }

  async handleWebhook(data: WebhookPayload): Promise<any> {
    const runId = data.worktreeId ?? "default-run";
    const event = data.hook_event_name;

    switch (event) {
      case "PreInvocation": {
        if (!(await this.#store.has(runId))) {
          await this.runtime.startRun({
            runId,
            phaseId: data.payload?.phaseId ?? "execution",
            categoryId: data.payload?.categoryId ?? "task_execution",
            objective: data.payload?.objective ?? "Antigravity task execution",
            context: data.payload?.context ?? {},
          });
        }
        return await this.runtime.prepareCurrentStep(runId);
      }

      case "PostToolUse": {
        console.log(`[Webhook] Tool used: ${data.payload?.toolName}`);
        return { status: "logged" };
      }

      case "Stop": {
        const stepResult = await this.runtime.submitStepResult(runId, {
          output: data.payload?.output ?? {},
          evidence: data.payload?.evidence,
          completedCriteria: data.payload?.completedCriteria,
        });
        return stepResult;
      }

      case "PostInvocation": {
        console.log(`[Webhook] Invocation completed`);
        return { status: "done" };
      }

      default:
        throw new Error(`Unknown hook event: ${event}`);
    }
  }
}
