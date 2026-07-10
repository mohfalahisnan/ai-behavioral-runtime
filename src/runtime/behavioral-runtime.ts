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
} from "../spec/index.js";
import { ConstraintExtractor, ConstraintRegistry } from "../constraints/index.js";
import { InvalidRunStateError, RunNotFoundError } from "./errors.js";
import { ProtocolRegistry } from "./protocol-registry.js";
import {
  InMemoryRuntimeStateStore,
  type RuntimeStateStore,
} from "./state-store.js";
import { StepCompiler } from "./step-compiler.js";
import { TransitionResolver } from "./transition-resolver.js";
import type {
  RuntimeClock,
  RuntimeRunState,
  RuntimeStepResult,
  PhaseTransitionInput,
  StartRunInput,
} from "./types.js";
import {
  ConstraintValidatorHandler,
  SchemaValidatorHandler,
  ValidationPipeline,
  type ValidatorHandler,
} from "./validation.js";

export interface BehavioralRuntimeOptions {
  readonly specification: ProtocolRuntimeSpecification;
  readonly executor: ModelExecutor;
  readonly stateStore?: RuntimeStateStore;
  readonly validators?: readonly ValidatorHandler[];
  readonly clock?: RuntimeClock;
}

const systemClock: RuntimeClock = {
  now: () => new Date().toISOString(),
};

export class BehavioralRuntime {
  readonly #executor: ModelExecutor;
  readonly #store: RuntimeStateStore;
  readonly #registry: ProtocolRegistry;
  readonly #constraints = new ConstraintRegistry();
  readonly #extractor = new ConstraintExtractor();
  readonly #compiler: StepCompiler;
  readonly #validation: ValidationPipeline;
  readonly #transitions = new TransitionResolver();
  readonly #clock: RuntimeClock;

  constructor(options: BehavioralRuntimeOptions) {
    this.#executor = options.executor;
    this.#store = options.stateStore ?? new InMemoryRuntimeStateStore();
    this.#registry = new ProtocolRegistry(options.specification);
    this.#compiler = new StepCompiler(this.#registry, this.#constraints);
    this.#clock = options.clock ?? systemClock;
    this.#validation = new ValidationPipeline([
      new SchemaValidatorHandler(),
      new ConstraintValidatorHandler(),
      ...(options.validators ?? []),
    ]);
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
    );
    constraintRegistry = this.#constraints.register(
      constraintRegistry,
      input.userConstraints ?? [],
    );
    constraintRegistry = this.#constraints.register(
      constraintRegistry,
      explicitConstraints,
    );

    const state: RuntimeRunState = {
      runId: input.runId,
      phaseId: input.phaseId,
      categoryId: input.categoryId,
      objective: input.objective,
      modifierIds,
      userConstraints,
      constraintRegistry,
      currentStepId: protocol.category.workflow.entryStep,
      status: "active",
      context: input.context,
      attemptsByStep: {},
      retriesByStep: {},
      traces: [],
    };

    await this.#store.save(state);
    return state;
  }

  async getState(runId: RunId): Promise<RuntimeRunState> {
    const state = await this.#store.get(runId);
    if (!state) {
      throw new RunNotFoundError(runId);
    }
    return state;
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
    let constraintRegistry = state.constraintRegistry;
    if (input.modifierIds !== undefined) {
      constraintRegistry = this.#constraints.register(
        constraintRegistry,
        protocol.modifiers.flatMap((modifier) => modifier.constraints ?? []),
      );
    }
    constraintRegistry = this.#constraints.register(
      constraintRegistry,
      input.userConstraints ?? [],
    );
    constraintRegistry = this.#constraints.register(
      constraintRegistry,
      explicitConstraints,
    );

    const { blockedReason: _blockedReason, ...preserved } = state;
    const transitioned: RuntimeRunState = {
      ...preserved,
      phaseId: input.phaseId,
      categoryId: input.categoryId,
      objective: input.objective,
      modifierIds,
      userConstraints: [...state.userConstraints, ...(input.userConstraints ?? [])],
      constraintRegistry,
      currentStepId: protocol.category.workflow.entryStep,
      status: "active",
      attemptsByStep: {},
      retriesByStep: {},
    };
    await this.#store.save(transitioned);
    return transitioned;
  }

  async compileCurrentStep(runId: RunId): Promise<EffectiveStepContract> {
    const state = await this.getState(runId);
    const { protocol, step } = this.#resolveCurrent(state);
    return this.#compiler.compile(protocol, step, state.constraintRegistry);
  }

  async executeCurrentStep(runId: RunId): Promise<RuntimeStepResult> {
    const state = await this.getState(runId);
    if (state.status !== "active") {
      throw new InvalidRunStateError(
        `Cannot execute run '${runId}' while status is '${state.status}'`,
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
      const trace = this.#createTrace(
        blocked,
        contract,
        inputValidation,
        transition,
      );
      const saved = { ...blocked, traces: [...blocked.traces, trace] };
      await this.#store.save(saved);

      return {
        state: saved,
        contract,
        validation: inputValidation,
        transition,
      };
    }

    const attemptsByStep = {
      ...state.attemptsByStep,
      [step.id]: (state.attemptsByStep[step.id] ?? 0) + 1,
    };
    const executingState: RuntimeRunState = { ...state, attemptsByStep };

    const execution = await this.#executor.execute({
      runId: state.runId,
      phaseId: state.phaseId,
      contract,
      context: state.context,
    });

    const validation = await this.#validation.validate({
      step,
      constraints: contract.constraints,
      ignoredConstraints: contract.ignoredConstraints,
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

    return {
      state: saved,
      contract,
      execution,
      validation,
      transition,
    };
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
    };

    return execution ? { ...base, execution } : base;
  }
}
