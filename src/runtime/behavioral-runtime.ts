import type {
  EffectiveProtocol,
  EffectiveStepContract,
  ExecutionTrace,
  ModelExecutor,
  ModelExecutionResult,
  ProtocolRuntimeSpecification,
  RunId,
  TransitionTrace,
  ValidationResult,
  WorkflowStep,
  HostAdapter,
  HostCapabilities,
  EnforcementLevel,
  PermissionPolicy,
  ExecutionResult,
  JsonObject,
} from "../spec/index.js";
import { ConstraintExtractor, ConstraintRegistry } from "../constraints/index.js";
import { InvalidRunStateError, RunNotFoundError, ExecutorNotConfiguredError } from "./errors.js";
import { ProtocolRegistry } from "./protocol-registry.js";
import {
  InMemoryRuntimeStateStore,
  type RuntimeStateStore,
} from "./state-store.js";
import { StepCompiler } from "./step-compiler.js";
import { TransitionResolver } from "./transition-resolver.js";
import { TurnResolver, type ClassificationResult } from "./turn-resolver.js";
import type {
  RuntimeClock,
  RuntimeRunState,
  RuntimeStepResult,
  PhaseTransitionInput,
  StartRunInput,
  PreparedStep,
} from "./types.js";
import {
  ConstraintValidatorHandler,
  SchemaValidatorHandler,
  ValidationPipeline,
  type ValidatorHandler,
} from "./validation.js";
import {
  NO_HOST_CAPABILITIES,
  resolveEnforcementLevel,
} from "./host-governance.js";

export interface BehavioralRuntimeOptions {
  readonly specification: ProtocolRuntimeSpecification;
  readonly executor?: ModelExecutor;
  readonly hostAdapter?: HostAdapter;
  readonly stateStore?: RuntimeStateStore;
  readonly validators?: readonly ValidatorHandler[];
  readonly clock?: RuntimeClock;
  readonly turnResolver?: TurnResolver;
}

const systemClock: RuntimeClock = {
  now: () => new Date().toISOString(),
};

const NO_EXECUTION_PERMISSION: PermissionPolicy = Object.freeze({
  execution: "none",
});

export class BehavioralRuntime {
  readonly #executor: ModelExecutor | undefined;
  readonly #hostCapabilities: HostCapabilities;
  readonly #enforcementLevel: EnforcementLevel;
  readonly #store: RuntimeStateStore;
  readonly #registry: ProtocolRegistry;
  readonly #constraints = new ConstraintRegistry();
  readonly #extractor = new ConstraintExtractor();
  readonly #compiler: StepCompiler;
  readonly #validation: ValidationPipeline;
  readonly #transitions = new TransitionResolver();
  readonly #clock: RuntimeClock;
  readonly #turnResolver: TurnResolver;

  constructor(options: BehavioralRuntimeOptions) {
    this.#executor = options.executor;
    this.#hostCapabilities = options.hostAdapter?.capabilities ?? NO_HOST_CAPABILITIES;
    this.#enforcementLevel = resolveEnforcementLevel(this.#hostCapabilities);
    this.#store = options.stateStore ?? new InMemoryRuntimeStateStore();
    this.#registry = new ProtocolRegistry(options.specification);
    this.#compiler = new StepCompiler(this.#registry, this.#constraints);
    this.#clock = options.clock ?? systemClock;
    this.#validation = new ValidationPipeline([
      new SchemaValidatorHandler(),
      new ConstraintValidatorHandler(),
      ...(options.validators ?? []),
    ]);
    this.#turnResolver = options.turnResolver ?? new TurnResolver({
      executor: this.#executor,
      categories: [
        { id: "discussion", keywords: ["discuss", "talk", "chat", "explain", "why", "what", "how", "question", "ask"] },
        { id: "coding_task", keywords: ["code", "implement", "write", "fix", "refactor", "bug", "build", "develop", "test"] },
        { id: "task_execution", keywords: ["run", "execute", "do", "perform", "start", "proceed", "make", "generate"] },
      ],
      modifiers: [
        { id: "concise", keywords: ["concise", "short", "brief", "quick"] },
        { id: "exploratory", keywords: ["explore", "research", "analyze", "study", "survey"] },
        { id: "critical", keywords: ["critical", "urgent", "must", "important"] },
      ],
    });
  }

  async resolveTurn(turn: string, context?: JsonObject): Promise<ClassificationResult> {
    return this.#turnResolver.resolve(turn, context);
  }

  registerValidator(handler: ValidatorHandler): void {
    this.#validation.register(handler);
  }

  async startRun(input: StartRunInput): Promise<RuntimeRunState> {
    if (await this.#store.has(input.runId)) {
      throw new InvalidRunStateError(`Runtime run already exists: ${input.runId}`);
    }

    const modifierIds = input.modifierIds ?? [];
    const explicitConstraints = (input.explicitConstraints ?? []).map((constraint) =>
      this.#extractor.extract(constraint),
    );
    const userConstraints = input.userConstraints ?? [];
    const protocol = this.#registry.resolveEffectiveProtocol(
      input.categoryId,
      modifierIds,
      [],
    );
    let constraintRegistry = this.#constraints.empty();
    constraintRegistry = this.#constraints.register(
      constraintRegistry,
      protocol.modifiers.flatMap((modifier) => modifier.constraints ?? []),
      input.phaseId,
    );
    constraintRegistry = this.#constraints.register(
      constraintRegistry,
      input.userConstraints ?? [],
      input.phaseId,
    );
    constraintRegistry = this.#constraints.register(
      constraintRegistry,
      explicitConstraints,
      input.phaseId,
    );
    const persistentConstraintIds = this.#constraints.resolveRegisteredIds(
      constraintRegistry,
      [...userConstraints, ...explicitConstraints],
    );

    const state: RuntimeRunState = {
      runId: input.runId,
      phaseId: input.phaseId,
      categoryId: input.categoryId,
      objective: input.objective,
      modifierIds,
      userConstraints,
      constraintRegistry,
      persistentConstraintIds,
      currentStepId: protocol.category.workflow.entryStep,
      status: "active",
      context: input.context,
      attemptsByStep: {},
      retriesByStep: {},
      traces: [],
      permissionPolicy: input.permissionPolicy ?? NO_EXECUTION_PERMISSION,
    };

    await this.#store.save(state);
    return state;
  }

  async getState(runId: RunId): Promise<RuntimeRunState> {
    const state = await this.#store.get(runId);
    if (!state) {
      throw new RunNotFoundError(runId);
    }
    const permissionPolicy = state.permissionPolicy ?? NO_EXECUTION_PERMISSION;
    if (state.constraintRegistry && Array.isArray(state.persistentConstraintIds)) {
      const constraintRegistry = this.#constraints.normalize(state.constraintRegistry);
      const persistentConstraintIds = this.#constraints.resolveConstraintIds(
        constraintRegistry,
        state.persistentConstraintIds,
      );
      const persistentIdsMatch =
        persistentConstraintIds.length === state.persistentConstraintIds.length &&
        persistentConstraintIds.every(
          (constraintId, index) => constraintId === state.persistentConstraintIds[index],
        );
      const permissionMatches = state.permissionPolicy === permissionPolicy;
      if (
        constraintRegistry === state.constraintRegistry &&
        persistentIdsMatch &&
        permissionMatches
      ) {
        return state;
      }
      const normalized = {
        ...state,
        constraintRegistry,
        persistentConstraintIds,
        permissionPolicy,
      };
      await this.#store.save(normalized);
      return normalized;
    }

    const protocol = this.#registry.resolveEffectiveProtocol(
      state.categoryId,
      state.modifierIds,
      [],
    );
    const modifierConstraints = protocol.modifiers.flatMap(
      (modifier) => modifier.constraints ?? [],
    );
    const userConstraints = state.userConstraints ?? [];
    let constraintRegistry = this.#constraints.empty();
    constraintRegistry = this.#constraints.register(
      constraintRegistry,
      modifierConstraints,
      state.phaseId,
    );
    constraintRegistry = this.#constraints.register(
      constraintRegistry,
      userConstraints,
      state.phaseId,
    );
    const persistentConstraintIds = this.#constraints.resolveRegisteredIds(
      constraintRegistry,
      userConstraints,
    );
    constraintRegistry = this.#constraints.activate(constraintRegistry, [
      ...persistentConstraintIds,
      ...this.#constraints.resolveRegisteredIds(
        constraintRegistry,
        modifierConstraints,
      ),
    ]);
    const hydrated: RuntimeRunState = {
      ...state,
      userConstraints,
      constraintRegistry,
      persistentConstraintIds,
      permissionPolicy,
    };
    await this.#store.save(hydrated);
    return hydrated;
  }

  async transitionPhase(
    runId: RunId,
    input: PhaseTransitionInput,
  ): Promise<RuntimeRunState> {
    const state = await this.getState(runId);
    if (state.status !== "completed") {
      throw new InvalidRunStateError(
        `Cannot transition run '${runId}' until the prior phase is completed`,
      );
    }

    const modifierIds = input.modifierIds ?? state.modifierIds;
    const protocol = this.#registry.resolveEffectiveProtocol(
      input.categoryId,
      modifierIds,
      [],
    );
    const explicitConstraints = (input.explicitConstraints ?? []).map((constraint) =>
      this.#extractor.extract(constraint),
    );
    const addedPersistentConstraints = [
      ...(input.userConstraints ?? []),
      ...explicitConstraints,
    ];
    const modifierConstraints = protocol.modifiers.flatMap(
      (modifier) => modifier.constraints ?? [],
    );
    let constraintRegistry = state.constraintRegistry;
    if (input.modifierIds !== undefined) {
      constraintRegistry = this.#constraints.register(
        constraintRegistry,
        modifierConstraints,
        input.phaseId,
      );
    }
    constraintRegistry = this.#constraints.register(
      constraintRegistry,
      input.userConstraints ?? [],
      input.phaseId,
    );
    constraintRegistry = this.#constraints.register(
      constraintRegistry,
      explicitConstraints,
      input.phaseId,
    );
    const persistentConstraintIds = [
      ...new Set([
        ...state.persistentConstraintIds,
        ...this.#constraints.resolveRegisteredIds(
          constraintRegistry,
          addedPersistentConstraints,
        ),
      ]),
    ];
    const modifierConstraintIds = this.#constraints.resolveRegisteredIds(
      constraintRegistry,
      modifierConstraints,
    );
    constraintRegistry = this.#constraints.activate(constraintRegistry, [
      ...persistentConstraintIds,
      ...modifierConstraintIds,
    ]);

    const { blockedReason: _blockedReason, ...preserved } = state;
    const transitioned: RuntimeRunState = {
      ...preserved,
      phaseId: input.phaseId,
      categoryId: input.categoryId,
      objective: input.objective,
      modifierIds,
      userConstraints: [...state.userConstraints, ...(input.userConstraints ?? [])],
      constraintRegistry,
      persistentConstraintIds,
      currentStepId: protocol.category.workflow.entryStep,
      status: "active",
      attemptsByStep: {},
      retriesByStep: {},
      permissionPolicy: input.permissionPolicy ?? state.permissionPolicy,
    };
    await this.#store.save(transitioned);
    return transitioned;
  }

  async prepareCurrentStep(runId: RunId): Promise<PreparedStep> {
    const state = await this.getState(runId);
    if (state.status !== "active") {
      throw new InvalidRunStateError(
        `Cannot prepare run '${runId}' while status is '${state.status}'`,
      );
    }

    const { protocol, step } = this.#resolveCurrent(state);
    const contract = this.#compiler.compile(protocol, step, state.constraintRegistry);
    const inputValidation = this.#validateInput(step, state, contract);
    const prepared: PreparedStep = {
      runId: state.runId,
      phaseId: state.phaseId,
      contract,
      context: state.context,
      permissionPolicy: state.permissionPolicy,
      hostCapabilities: this.#hostCapabilities,
      enforcementLevel: this.#enforcementLevel,
      readyForExecution: inputValidation.status === "passed",
      inputValidation,
    };

    if (prepared.readyForExecution) return prepared;

    const transition: TransitionTrace = {
      action: "block",
      reason: "Current context does not satisfy the step input contract",
    };
    const blocked = this.#applyBlockedTransition(state, transition.reason);
    const trace = this.#createTrace(blocked, contract, inputValidation, transition);
    await this.#store.save({ ...blocked, traces: [...blocked.traces, trace] });
    return prepared;
  }

  async compileCurrentStep(runId: RunId): Promise<EffectiveStepContract> {
    const state = await this.getState(runId);
    const { protocol, step } = this.#resolveCurrent(state);
    return this.#compiler.compile(protocol, step, state.constraintRegistry);
  }

  async submitStepResult(
    runId: RunId,
    execution: ExecutionResult,
  ): Promise<RuntimeStepResult> {
    const state = await this.getState(runId);
    if (state.status !== "active") {
      throw new InvalidRunStateError(
        `Cannot submit a result for run '${runId}' while status is '${state.status}'`,
      );
    }

    const { protocol, step } = this.#resolveCurrent(state);
    const contract = this.#compiler.compile(protocol, step, state.constraintRegistry);
    const inputValidation = this.#validateInput(step, state, contract);
    if (inputValidation.status !== "passed") {
      const transition: TransitionTrace = {
        action: "block",
        reason: "Current context does not satisfy the step input contract",
      };
      const blocked = this.#applyBlockedTransition(state, transition.reason);
      const trace = this.#createTrace(blocked, contract, inputValidation, transition);
      const saved = { ...blocked, traces: [...blocked.traces, trace] };
      await this.#store.save(saved);
      return { state: saved, contract, validation: inputValidation, transition };
    }

    const attemptsByStep = {
      ...state.attemptsByStep,
      [step.id]: (state.attemptsByStep[step.id] ?? 0) + 1,
    };
    const executingState: RuntimeRunState = { ...state, attemptsByStep };
    const validation = await this.#validation.validate({
      step,
      constraints: contract.constraints,
      ignoredConstraints: contract.ignoredConstraints,
      constraintIdAliases: contract.constraintIdAliases,
      execution,
    });
    const transition = this.#transitions.resolve({
      step,
      execution,
      validation,
      retriesUsed: state.retriesByStep[step.id] ?? 0,
    });
    const transitioned = this.#applyTransition(
      executingState,
      step,
      execution,
      transition,
    );
    const trace = this.#createTrace(
      transitioned,
      contract,
      validation,
      transition,
      execution,
    );
    const saved = { ...transitioned, traces: [...transitioned.traces, trace] };
    await this.#store.save(saved);
    return { state: saved, contract, execution, validation, transition };
  }

  async executeCurrentStep(runId: RunId): Promise<RuntimeStepResult> {
    if (!this.#executor) throw new ExecutorNotConfiguredError();

    const prepared = await this.prepareCurrentStep(runId);
    if (!prepared.readyForExecution) {
      const state = await this.getState(runId);
      const transition: TransitionTrace = {
        action: "block",
        reason: state.blockedReason ?? "Current step is not ready for execution",
      };
      return {
        state,
        contract: prepared.contract,
        validation: prepared.inputValidation,
        transition,
      };
    }

    const execution = await this.#executor.execute({
      runId: prepared.runId,
      phaseId: prepared.phaseId,
      contract: prepared.contract,
      context: prepared.context,
    });
    return this.submitStepResult(runId, execution);
  }

  #resolveCurrent(state: RuntimeRunState): {
    readonly protocol: EffectiveProtocol;
    readonly step: WorkflowStep;
  } {
    const protocol = this.#registry.resolveEffectiveProtocol(
      state.categoryId,
      state.modifierIds,
      [],
    );
    const step = this.#registry.getWorkflowStep(
      state.categoryId,
      state.currentStepId,
    );
    return { protocol, step };
  }

  #validateInput(
    step: WorkflowStep,
    state: RuntimeRunState,
    contract: EffectiveStepContract,
  ): ValidationResult {
    const required = step.inputContract.requiredFields ?? [];
    const missing = required.filter(
      (field) => !Object.prototype.hasOwnProperty.call(state.context, field),
    );

    const constraintCompliance = [
      ...contract.constraints.map((constraint) => ({
        constraintId: constraint.id,
        status: "inconclusive" as const,
        explanation: "Step did not execute, so compliance is unavailable",
      })),
      ...contract.ignoredConstraints.map((selection) => ({
        constraintId: selection.constraintId,
        status: "not_applicable" as const,
        explanation: selection.reason,
      })),
    ];

    return missing.length === 0
      ? {
          status: "passed",
          checks: [
            {
              validatorId: "runtime.input_contract",
              status: "passed",
              message: "Required input fields are present",
            },
          ],
          constraintCompliance,
        }
      : {
          status: "failed",
          checks: [
            {
              validatorId: "runtime.input_contract",
              status: "failed",
              message: `Missing required input fields: ${missing.join(", ")}`,
            },
          ],
          constraintCompliance,
        };
  }

  #applyTransition(
    state: RuntimeRunState,
    step: WorkflowStep,
    execution: ModelExecutionResult,
    transition: TransitionTrace,
  ): RuntimeRunState {
    switch (transition.action) {
      case "continue": {
        if (!transition.to) {
          return this.#applyBlockedTransition(
            state,
            `Continue transition from '${step.id}' has no target step`,
          );
        }
        return {
          ...state,
          currentStepId: transition.to,
          context: { ...state.context, ...execution.output },
        };
      }
      case "retry": {
        const target = transition.to ?? step.id;
        return {
          ...state,
          currentStepId: target,
          retriesByStep: {
            ...state.retriesByStep,
            [step.id]: (state.retriesByStep[step.id] ?? 0) + 1,
          },
        };
      }
      case "block":
        return this.#applyBlockedTransition(state, transition.reason);
      case "complete":
        return {
          ...state,
          status: "completed",
          context: { ...state.context, ...execution.output },
        };
      case "replan":
        return this.#applyBlockedTransition(
          state,
          "Replan was requested, but Phase 2 does not implement automatic replanning",
        );
    }
  }

  #applyBlockedTransition(
    state: RuntimeRunState,
    reason: string,
  ): RuntimeRunState {
    return {
      ...state,
      status: "blocked",
      blockedReason: reason,
    };
  }

  #createTrace(
    state: RuntimeRunState,
    contract: EffectiveStepContract,
    validation: ValidationResult,
    transition: TransitionTrace,
    execution?: ModelExecutionResult,
  ): ExecutionTrace {
    const base = {
      runId: state.runId,
      phaseId: state.phaseId,
      stepId: contract.step.id,
      protocol: {
        categoryId: contract.categoryId,
        modifierIds: contract.modifierIds,
        constraintIds: contract.constraints.map((constraint) => constraint.id),
        reasoningStrategyIds: contract.reasoning.strategies.map(
          (strategy) => strategy.definition.id,
        ),
      },
      validation,
      transition,
      timestamp: this.#clock.now(),
      governance: {
        hostCapabilities: this.#hostCapabilities,
        enforcementLevel: this.#enforcementLevel,
        permissionPolicy: state.permissionPolicy,
      },
    };

    return execution ? { ...base, execution } : base;
  }
}
