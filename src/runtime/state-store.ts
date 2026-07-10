import type { RunId } from "../spec/index.js";
import type { RuntimeRunState } from "./types.js";

export interface RuntimeStateStore {
  get(runId: RunId): Promise<RuntimeRunState | undefined>;
  save(state: RuntimeRunState): Promise<void>;
  has(runId: RunId): Promise<boolean>;
}

/**
 * Minimal Phase 2 state store. The interface intentionally allows a durable
 * implementation to replace it without changing the runtime.
 */
export class InMemoryRuntimeStateStore implements RuntimeStateStore {
  readonly #states = new Map<RunId, RuntimeRunState>();

  async get(runId: RunId): Promise<RuntimeRunState | undefined> {
    return this.#states.get(runId);
  }

  async save(state: RuntimeRunState): Promise<void> {
    this.#states.set(state.runId, state);
  }

  async has(runId: RunId): Promise<boolean> {
    return this.#states.has(runId);
  }
}
