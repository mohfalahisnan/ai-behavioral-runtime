import {
  BehavioralRuntime,
  ConstraintExtractor,
  ConstraintRegistry,
} from "../src/index.js";
import { initialRuntimeSpecification } from "../src/protocol/index.js";
import type {
  Constraint,
  ConstraintIdGenerator,
  ConstraintSelection,
  ExplicitConstraintInput,
  ModelExecutionInput,
  ModelExecutionResult,
  ModelExecutor,
  ProtocolRuntimeSpecification,
} from "../src/index.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

async function assertRejects(
  operation: () => unknown | Promise<unknown>,
  expectedMessage: string,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    assert(error instanceof Error, "rejection must be an Error");
    assert(
      error.message.includes(expectedMessage),
      `expected error containing '${expectedMessage}', received '${error.message}'`,
    );
    return;
  }
  throw new Error(`expected rejection containing '${expectedMessage}'`);
}

const extractor = new ConstraintExtractor();
const whitespaceA = extractor.extract({
  instruction: "  Preserve   public\n APIs  ",
  kind: "must",
  source: "user",
});
const whitespaceB = extractor.extract({
  instruction: "Preserve public APIs",
  kind: "must",
  source: "user",
});
const changed = extractor.extract({
  instruction: "Preserve private APIs",
  kind: "must",
  source: "user",
});
assertEqual(whitespaceA.id, whitespaceB.id, "normalized semantics must have a stable ID");
assertEqual(whitespaceA.rule, "Preserve public APIs", "rule must be normalized");
assertEqual(
  whitespaceA.origin.originalInstruction,
  "  Preserve   public\n APIs  ",
  "original instruction must remain traceable",
);
assert(changed.id !== whitespaceA.id, "changed semantics must change the ID");
await assertRejects(
  () => extractor.extract({ instruction: " \n\t ", kind: "must", source: "user" }),
  "empty",
);

const forcedId: ConstraintIdGenerator = () => "constraint_forced_collision";
const collisionExtractor = new ConstraintExtractor(forcedId);
const registry = new ConstraintRegistry();
let snapshot = registry.empty();
snapshot = registry.register(snapshot, [
  collisionExtractor.extract({ instruction: "First rule", kind: "must", source: "user" }),
], "phase-collision-one");
await assertRejects(
  () => registry.register(snapshot, [
    collisionExtractor.extract({ instruction: "Different rule", kind: "must", source: "user" }),
  ], "phase-collision-two"),
  "collision",
);

snapshot = registry.empty();
snapshot = registry.register(snapshot, [whitespaceA], "phase-registry-one");
const reaffirmed = registry.register(snapshot, [whitespaceB], "phase-registry-two");
assertEqual(reaffirmed.constraints.length, 1, "semantic duplicates must deduplicate");
assertEqual(reaffirmed.history.length, 2, "duplicate registration must append history");
assertEqual(reaffirmed.history[1]?.action, "reaffirmed", "duplicate must be reaffirmed");
assertEqual(
  snapshot.history[0]?.phaseId,
  "phase-registry-one",
  "registration history must record its phase",
);
assertEqual(
  reaffirmed.history[1]?.phaseId,
  "phase-registry-two",
  "reaffirmation history must record its phase",
);
assertEqual(snapshot.history.length, 1, "registration must not mutate the prior snapshot");

function makeConstraint(
  id: string,
  appliesTo?: readonly string[],
): Constraint {
  return {
    id,
    kind: "must",
    rule: id,
    source: "user",
    priority: 100,
    overridable: false,
    ...(appliesTo ? { appliesTo } : {}),
  };
}

const selectionSnapshot = registry.register(registry.empty(), [
  makeConstraint("excluded-and-included"),
  makeConstraint("included-outside-applicability", ["other-step"]),
  makeConstraint("applicable", ["target-step"]),
  makeConstraint("not-applicable", ["other-step"]),
], "phase-selection");
let selection: ConstraintSelection = registry.select(
  selectionSnapshot,
  {
    include: ["excluded-and-included", "included-outside-applicability"],
    exclude: ["excluded-and-included"],
  },
  "target-step",
);
assertEqual(selection.relevant.length, 2, "include and applicability must select two constraints");
assert(
  selection.relevant.some((item) => item.id === "included-outside-applicability"),
  "explicit include must beat applicability",
);
assertEqual(
  selection.ignored.find((item) => item.constraintId === "excluded-and-included")?.reason,
  "explicitly_excluded",
  "exclude must beat include",
);
assertEqual(
  selection.ignored.find((item) => item.constraintId === "not-applicable")?.reason,
  "not_applicable_to_step",
  "default applicability must explain ignored constraints",
);
selection = registry.select(
  selectionSnapshot,
  { includeAllApplicable: false },
  "target-step",
);
assertEqual(selection.relevant.length, 0, "disabled default applicability must select none");
assert(
  selection.ignored.every((item) => item.reason === "include_all_applicable_disabled"),
  "disabled applicability must provide an explicit reason",
);

const initialContext = {
  userTurn: "Discuss this position",
  conversationContext: "Relevant conversation context",
  task: "Execute this task",
  taskContext: "Relevant task context",
  requirement: "Implement this requirement",
  codebaseContext: "Relevant codebase context",
} as const;

class ComplianceExecutor implements ModelExecutor {
  constructor(
    private readonly compliance: (
      input: ModelExecutionInput,
    ) => ModelExecutionResult["constraintCompliance"],
  ) {}

  async execute(input: ModelExecutionInput): Promise<ModelExecutionResult> {
    const constraintCompliance = this.compliance(input);
    return {
      output: Object.fromEntries(
        (input.contract.step.outputContract.requiredFields ?? []).map((field) => [field, field]),
      ),
      completedCriteria: input.contract.step.completionCriteria
        .filter((criterion) => criterion.required)
        .map((criterion) => criterion.id),
      ...(constraintCompliance ? { constraintCompliance } : {}),
    };
  }
}

const relevantInput: ExplicitConstraintInput = {
  instruction: "Always cite evidence",
  kind: "must",
  source: "user",
};
const ignoredInput: ExplicitConstraintInput = {
  instruction: "Only applies later",
  kind: "must",
  source: "user",
  appliesTo: ["respond"],
};
const relevantId = extractor.extract(relevantInput).id;
const ignoredId = extractor.extract(ignoredInput).id;

const preservingRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new ComplianceExecutor(() => [
    { constraintId: relevantId, status: "satisfied", evidence: ["citation:1"] },
  ]),
});
await preservingRuntime.startRun({
  runId: "phase4-contract-and-compliance",
  phaseId: "phase-discussion",
  categoryId: "discussion",
  objective: "Compile and validate constraints",
  context: initialContext,
  explicitConstraints: [relevantInput, ignoredInput],
});
const compiled = await preservingRuntime.compileCurrentStep("phase4-contract-and-compliance");
assertEqual(compiled.constraints.length, 1, "contract must contain only relevant constraints");
assertEqual(compiled.constraints[0]?.id, relevantId, "contract must expose relevant ID");
assertEqual(compiled.ignoredConstraints.length, 1, "contract must expose ignored metadata");
assertEqual(compiled.ignoredConstraints[0]?.constraintId, ignoredId, "ignored ID must be visible");
const preservedResult = await preservingRuntime.executeCurrentStep(
  "phase4-contract-and-compliance",
);
assertEqual(
  preservedResult.validation.constraintCompliance?.find(
    (item) => item.constraintId === relevantId,
  )?.status,
  "satisfied",
  "executor compliance for relevant constraints must be preserved",
);
assertEqual(
  preservedResult.validation.constraintCompliance?.find(
    (item) => item.constraintId === ignoredId,
  )?.status,
  "not_applicable",
  "ignored constraints must be accounted for",
);
assertEqual(
  preservedResult.validation.constraintCompliance?.find(
    (item) => item.constraintId === ignoredId,
  )?.explanation,
  "not_applicable_to_step",
  "ignored compliance must retain selection reason",
);

const missingRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new ComplianceExecutor(() => undefined),
});
await missingRuntime.startRun({
  runId: "phase4-missing-compliance",
  phaseId: "phase-discussion",
  categoryId: "discussion",
  objective: "Reject missing hard compliance",
  context: initialContext,
  explicitConstraints: [relevantInput],
});
const missingResult = await missingRuntime.executeCurrentStep("phase4-missing-compliance");
assertEqual(missingResult.validation.status, "inconclusive", "missing hard compliance must not pass");
assertEqual(
  missingResult.validation.constraintCompliance?.[0]?.status,
  "inconclusive",
  "missing relevant compliance must become inconclusive",
);

const preferenceInput: ExplicitConstraintInput = {
  instruction: "Prefer concise prose",
  kind: "preference",
  source: "user",
};
const preferenceId = extractor.extract(preferenceInput).id;
const missingPreferenceRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new ComplianceExecutor(() => undefined),
});
await missingPreferenceRuntime.startRun({
  runId: "phase4-missing-preference-compliance",
  phaseId: "phase-discussion",
  categoryId: "discussion",
  objective: "Report but do not gate on missing preference compliance",
  context: initialContext,
  explicitConstraints: [preferenceInput],
});
const missingPreferenceResult = await missingPreferenceRuntime.executeCurrentStep(
  "phase4-missing-preference-compliance",
);
assertEqual(
  missingPreferenceResult.validation.status,
  "passed",
  "missing preference compliance must not gate validation",
);
assertEqual(
  missingPreferenceResult.validation.constraintCompliance?.find(
    (item) => item.constraintId === preferenceId,
  )?.status,
  "inconclusive",
  "missing preference compliance must remain visible as inconclusive",
);

const violatedRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new ComplianceExecutor(() => [
    { constraintId: relevantId, status: "violated", explanation: "No citation" },
  ]),
});
await violatedRuntime.startRun({
  runId: "phase4-violated-compliance",
  phaseId: "phase-discussion",
  categoryId: "discussion",
  objective: "Fail violated hard compliance",
  context: initialContext,
  explicitConstraints: [relevantInput],
});
const violatedResult = await violatedRuntime.executeCurrentStep("phase4-violated-compliance");
assertEqual(violatedResult.validation.status, "failed", "violated hard constraint must fail");

const badEvidenceRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new ComplianceExecutor(() => [
    { constraintId: relevantId, status: "satisfied" },
    { constraintId: relevantId, status: "satisfied" },
    { constraintId: "unknown-constraint", status: "satisfied" },
  ]),
});
await badEvidenceRuntime.startRun({
  runId: "phase4-bad-compliance-ids",
  phaseId: "phase-discussion",
  categoryId: "discussion",
  objective: "Reject duplicate and unknown compliance IDs",
  context: initialContext,
  explicitConstraints: [relevantInput],
});
const badEvidenceResult = await badEvidenceRuntime.executeCurrentStep(
  "phase4-bad-compliance-ids",
);
assertEqual(badEvidenceResult.validation.status, "failed", "bad compliance IDs must fail");
const badEvidenceMessage = badEvidenceResult.validation.checks
  .map((check) => check.message ?? "")
  .join("\n");
assert(badEvidenceMessage.includes("Duplicate"), "duplicate compliance IDs must be visible");
assert(badEvidenceMessage.includes("Unknown"), "unknown compliance IDs must be visible");

const transitionRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new ComplianceExecutor((input) =>
    input.contract.constraints.map((constraint) => ({
      constraintId: constraint.id,
      status: "satisfied",
    })),
  ),
});
let phaseState = await transitionRuntime.startRun({
  runId: "phase4-transition",
  phaseId: "phase-one",
  categoryId: "discussion",
  objective: "Complete discussion",
  context: initialContext,
  explicitConstraints: [relevantInput],
});
await assertRejects(
  () => transitionRuntime.transitionPhase("phase4-transition", {
    phaseId: "too-early",
    categoryId: "task_execution",
    objective: "Must reject active transition",
  }),
  "completed",
);
while (phaseState.status === "active") {
  phaseState = (await transitionRuntime.executeCurrentStep(phaseState.runId)).state;
}
assertEqual(phaseState.status, "completed", "first phase must complete");
const priorTraceCount = phaseState.traces.length;
const priorHistoryCount = phaseState.constraintRegistry.history.length;
const transitioned = await transitionRuntime.transitionPhase("phase4-transition", {
  phaseId: "phase-two",
  categoryId: "task_execution",
  objective: "Execute second phase",
  explicitConstraints: [
    { ...relevantInput, instruction: "  Always   cite evidence " },
    { instruction: "Keep changes narrow", kind: "preference", source: "user" },
  ],
});
assertEqual(transitioned.phaseId, "phase-two", "transition must activate caller phase ID");
assertEqual(transitioned.categoryId, "task_execution", "transition must use caller category");
assertEqual(transitioned.currentStepId, "understand-task", "transition must use category entry");
assertEqual(transitioned.status, "active", "new phase must start active");
assertEqual(Object.keys(transitioned.attemptsByStep).length, 0, "attempt counters must reset");
assertEqual(Object.keys(transitioned.retriesByStep).length, 0, "retry counters must reset");
assertEqual(transitioned.traces.length, priorTraceCount, "traces must survive transition");
assertEqual(transitioned.context.userTurn, initialContext.userTurn, "context must survive");
assertEqual(transitioned.constraintRegistry.constraints.length, 2, "new constraints add and dedupe");
assertEqual(
  transitioned.constraintRegistry.history.length,
  priorHistoryCount + 2,
  "full history must survive and record reaffirmation plus registration",
);
assertEqual(
  transitioned.constraintRegistry.history.at(-2)?.action,
  "reaffirmed",
  "repeated explicit constraint must be reaffirmed across phases",
);
assertEqual(
  transitioned.constraintRegistry.history.at(-2)?.phaseId,
  "phase-two",
  "transition reaffirmation history must record the new phase",
);
assertEqual(
  transitioned.constraintRegistry.history.at(-1)?.phaseId,
  "phase-two",
  "transition registration history must record the new phase",
);
assert(
  transitioned.constraintRegistry.constraints.some((constraint) => constraint.id === relevantId),
  "stable constraint ID must survive transition",
);

const temporaryModifierConstraint: Constraint = {
  ...makeConstraint("temporary-modifier-constraint"),
  source: "modifier",
};
const legacyPersistentConstraint = makeConstraint("legacy-persistent-constraint");
const modifierSpecification: ProtocolRuntimeSpecification = {
  ...initialRuntimeSpecification,
  modifiers: [
    ...initialRuntimeSpecification.modifiers,
    {
      id: "temporary-modifier",
      version: "0.1.0",
      rules: [],
      constraints: [temporaryModifierConstraint],
    },
  ],
};
const modifierRuntime = new BehavioralRuntime({
  specification: modifierSpecification,
  executor: new ComplianceExecutor((input) =>
    input.contract.constraints.map((constraint) => ({
      constraintId: constraint.id,
      status: "satisfied",
    })),
  ),
});
let modifierState = await modifierRuntime.startRun({
  runId: "phase4-remove-modifier",
  phaseId: "modifier-phase-one",
  categoryId: "discussion",
  objective: "Complete a phase with a temporary modifier",
  modifierIds: ["temporary-modifier"],
  userConstraints: [legacyPersistentConstraint],
  explicitConstraints: [relevantInput],
  context: initialContext,
});
while (modifierState.status === "active") {
  modifierState = (await modifierRuntime.executeCurrentStep(modifierState.runId)).state;
}
assertEqual(modifierState.status, "completed", "modifier phase must complete");
assert(
  modifierState.constraintRegistry.constraints.some(
    (constraint) => constraint.id === temporaryModifierConstraint.id,
  ),
  "activated modifier constraint must be active in its phase",
);
const modifierHistoryCount = modifierState.constraintRegistry.history.length;
const withoutModifier = await modifierRuntime.transitionPhase(modifierState.runId, {
  phaseId: "modifier-phase-two",
  categoryId: "task_execution",
  objective: "Continue without the temporary modifier",
  modifierIds: [],
});
assert(
  !withoutModifier.constraintRegistry.constraints.some(
    (constraint) => constraint.id === temporaryModifierConstraint.id,
  ),
  "removed modifier constraint must stop being active",
);
assert(
  withoutModifier.constraintRegistry.constraints.some(
    (constraint) => constraint.id === legacyPersistentConstraint.id,
  ),
  "legacy user constraints must remain active",
);
assert(
  withoutModifier.constraintRegistry.constraints.some(
    (constraint) => constraint.id === relevantId,
  ),
  "explicit constraints must remain active",
);
assertEqual(
  withoutModifier.constraintRegistry.history.length,
  modifierHistoryCount,
  "modifier removal must preserve registry history",
);
assertEqual(
  withoutModifier.constraintRegistry.history.find(
    (entry) => entry.constraintId === temporaryModifierConstraint.id,
  )?.phaseId,
  "modifier-phase-one",
  "removed modifier history must retain its registration phase",
);
const withoutModifierContract = await modifierRuntime.compileCurrentStep(
  withoutModifier.runId,
);
assert(
  !withoutModifierContract.constraints.some(
    (constraint) => constraint.id === temporaryModifierConstraint.id,
  ),
  "removed modifier constraint must not be selected",
);

const blockedRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new ComplianceExecutor(() => []),
});
await blockedRuntime.startRun({
  runId: "phase4-blocked-transition",
  phaseId: "phase-blocked",
  categoryId: "discussion",
  objective: "Block due to missing input",
  context: {},
});
await blockedRuntime.executeCurrentStep("phase4-blocked-transition");
await assertRejects(
  () => blockedRuntime.transitionPhase("phase4-blocked-transition", {
    phaseId: "not-authorized",
    categoryId: "task_execution",
    objective: "Must reject blocked transition",
  }),
  "completed",
);

console.log("Phase 4 constraint registry tests passed");
