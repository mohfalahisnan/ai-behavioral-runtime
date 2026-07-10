export class BehavioralRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BehavioralRuntimeError";
  }
}

export class SpecificationError extends BehavioralRuntimeError {
  constructor(message: string) {
    super(message);
    this.name = "SpecificationError";
  }
}

export class RunNotFoundError extends BehavioralRuntimeError {
  constructor(runId: string) {
    super(`Runtime run not found: ${runId}`);
    this.name = "RunNotFoundError";
  }
}

export class InvalidRunStateError extends BehavioralRuntimeError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRunStateError";
  }
}

export class ExecutorNotConfiguredError extends BehavioralRuntimeError {
  constructor() {
    super("Cannot execute current step because no ModelExecutor is configured");
    this.name = "ExecutorNotConfiguredError";
  }
}
