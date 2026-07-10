import {
  BehavioralRuntime,
  ConstraintCollisionError,
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
  RuntimeRunState,
  RuntimeStateStore,
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

async function assertRejectsExactly(
  operation: () => unknown | Promise<unknown>,
  expectedMessage: string,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    assert(error instanceof Error, "rejection must be an Error");
    assertEqual(error.message, expectedMessage, "rejection message must be deterministic");
    return;
  }
  throw new Error(`expected rejection '${expectedMessage}'`);
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

function makeAliasMap(
  entries: readonly (readonly [string, string])[],
): Readonly<Record<string, string>> {
  const aliases = Object.create(null) as Record<string, string>;
  for (const [alias, target] of entries) aliases[alias] = target;
  return Object.freeze(aliases);
}

const canonicalLegacyA: Constraint = {
  ...makeConstraint("legacy-canonical-a"),
  rule: "Preserve the same legacy semantic rule",
};
const canonicalLegacyB: Constraint = {
  ...canonicalLegacyA,
  id: "legacy-canonical-b",
};
let canonicalSnapshot = registry.register(
  registry.empty(),
  [canonicalLegacyA],
  "phase-canonical-one",
);
canonicalSnapshot = registry.register(
  canonicalSnapshot,
  [canonicalLegacyB],
  "phase-canonical-two",
);
assertEqual(
  canonicalSnapshot.constraints.length,
  1,
  "same canonical constraints with different IDs must deduplicate active state",
);
assertEqual(
  canonicalSnapshot.registeredConstraints.length,
  1,
  "same canonical constraints with different IDs must deduplicate the catalog",
);
assertEqual(
  canonicalSnapshot.history.at(-1)?.action,
  "reaffirmed",
  "same canonical constraints with different IDs must reaffirm history",
);
assertEqual(
  canonicalSnapshot.history.at(-1)?.constraintId,
  canonicalLegacyA.id,
  "canonical reaffirmation history must reference the registered constraint ID",
);
await assertRejects(
  () => registry.register(
    canonicalSnapshot,
    [{ ...canonicalLegacyB, rule: "Different semantic reuse of the alias ID" }],
    "phase-canonical-collision",
  ),
  "collision",
);
const canonicalConflictC: Constraint = {
  ...makeConstraint("legacy-canonical-c"),
  rule: "Different registered canonical rule",
};
const canonicalConflictBase = registry.register(
  registry.empty(),
  [canonicalLegacyA, canonicalConflictC],
  "phase-canonical-conflict",
);
const conflictingCanonicalAliasSnapshot = {
  ...canonicalConflictBase,
  constraintIdAliases: makeAliasMap([
    [canonicalLegacyA.id, canonicalConflictC.id],
    [canonicalConflictC.id, canonicalConflictC.id],
  ]),
};
await assertRejectsExactly(
  () => registry.normalize(conflictingCanonicalAliasSnapshot),
  `Canonical constraint ID '${canonicalLegacyA.id}' cannot alias '${canonicalConflictC.id}'`,
);

const persistedDuplicateCatalog = {
  constraints: Object.freeze([canonicalLegacyA]),
  registeredConstraints: Object.freeze([canonicalLegacyA, canonicalLegacyB]),
  constraintIdAliases: makeAliasMap([
    [canonicalLegacyA.id, canonicalLegacyA.id],
    [canonicalLegacyB.id, canonicalLegacyB.id],
  ]),
  history: canonicalSnapshot.history,
};
const normalizedDuplicateCatalog = registry.normalize(persistedDuplicateCatalog);
assertEqual(
  normalizedDuplicateCatalog.constraintIdAliases[canonicalLegacyA.id],
  canonicalLegacyA.id,
  "first registered canonical ID must retain its self-map",
);
assertEqual(
  normalizedDuplicateCatalog.constraintIdAliases[canonicalLegacyB.id],
  canonicalLegacyA.id,
  "stale duplicate identity alias must repair to the first canonical ID",
);

await assertRejectsExactly(
  () => registry.normalize({
    ...canonicalSnapshot,
    constraints: Object.freeze([canonicalConflictC]),
  }),
  `Active constraint '${canonicalConflictC.id}' is not present in the registered constraint catalog`,
);

try {
  registry.normalize({
    ...canonicalSnapshot,
    constraints: Object.freeze([
      { ...canonicalLegacyA, rule: "Different active semantic reuse of registered ID" },
    ]),
  });
  throw new Error("expected active constraint ID collision");
} catch (error) {
  assert(
    error instanceof ConstraintCollisionError,
    "active registered-ID semantic reuse must throw ConstraintCollisionError",
  );
  assertEqual(
    error.message,
    `Constraint ID collision detected for '${canonicalLegacyA.id}'`,
    "active registered-ID collision message must be deterministic",
  );
}

const activeAliasHistory = canonicalSnapshot.history;
const normalizedActiveAlias = registry.normalize({
  ...canonicalSnapshot,
  constraints: Object.freeze([canonicalLegacyB]),
  registeredConstraints: Object.freeze([canonicalLegacyA]),
  constraintIdAliases: makeAliasMap([
    [canonicalLegacyA.id, canonicalLegacyA.id],
    [canonicalLegacyB.id, canonicalLegacyB.id],
  ]),
  history: activeAliasHistory,
});
assertEqual(
  normalizedActiveAlias.constraints[0]?.id,
  canonicalLegacyA.id,
  "active alias with registered semantics must activate the canonical constraint",
);
assertEqual(
  normalizedActiveAlias.constraintIdAliases[canonicalLegacyB.id],
  canonicalLegacyA.id,
  "active alias absent from catalog must repair to the canonical ID",
);
assertEqual(
  normalizedActiveAlias.history,
  activeAliasHistory,
  "active alias repair must preserve history",
);

const aliasChainBase = registry.register(
  registry.empty(),
  [canonicalConflictC],
  "phase-alias-chain",
);
for (const entries of [
  [["legacy-alias-x", "legacy-alias-y"], ["legacy-alias-y", canonicalConflictC.id]],
  [["legacy-alias-y", canonicalConflictC.id], ["legacy-alias-x", "legacy-alias-y"]],
] as const) {
  const normalizedChain = registry.normalize({
    ...aliasChainBase,
    constraintIdAliases: makeAliasMap(entries),
  });
  assertEqual(
    normalizedChain.constraintIdAliases["legacy-alias-x"],
    canonicalConflictC.id,
    "alias chain head must normalize to the canonical ID independent of insertion order",
  );
  assertEqual(
    normalizedChain.constraintIdAliases["legacy-alias-y"],
    canonicalConflictC.id,
    "alias chain target must normalize to the canonical ID independent of insertion order",
  );
  assertEqual(
    normalizedChain.constraintIdAliases[canonicalConflictC.id],
    canonicalConflictC.id,
    "canonical registered IDs must always self-map",
  );
}

for (const entries of [
  [["legacy-cycle-x", "legacy-cycle-y"], ["legacy-cycle-y", "legacy-cycle-x"]],
  [["legacy-cycle-y", "legacy-cycle-x"], ["legacy-cycle-x", "legacy-cycle-y"]],
] as const) {
  await assertRejectsExactly(
    () => registry.normalize({
      ...aliasChainBase,
      constraintIdAliases: makeAliasMap(entries),
    }),
    "Constraint alias cycle detected: legacy-cycle-x -> legacy-cycle-y -> legacy-cycle-x",
  );
}

await assertRejectsExactly(
  () => registry.normalize({
    ...aliasChainBase,
    constraintIdAliases: makeAliasMap([
      ["legacy-dangling-x", "legacy-dangling-target"],
    ]),
  }),
  "Constraint alias 'legacy-dangling-x' targets unknown constraint ID 'legacy-dangling-target'",
);
let aliasSelection = registry.select(
  canonicalSnapshot,
  {
    include: [canonicalLegacyA.id],
    exclude: [canonicalLegacyB.id],
  },
  "target-step",
);
assertEqual(
  aliasSelection.relevant.length,
  0,
  "exclude alias must beat canonical include",
);
assertEqual(
  aliasSelection.ignored[0]?.reason,
  "explicitly_excluded",
  "exclude alias must produce the explicit exclusion reason",
);
aliasSelection = registry.select(
  canonicalSnapshot,
  {
    include: [canonicalLegacyB.id],
    includeAllApplicable: false,
  },
  "target-step",
);
assertEqual(
  aliasSelection.relevant[0]?.id,
  canonicalLegacyA.id,
  "include alias must select the canonical constraint when defaults are disabled",
);

const protoConstraint: Constraint = {
  ...makeConstraint("__proto__"),
  rule: "Preserve prototype-named legacy constraint",
};
const constructorConstraint: Constraint = {
  ...makeConstraint("constructor"),
  rule: "Preserve constructor-named legacy constraint",
};
const specialIdSnapshot = registry.register(
  registry.empty(),
  [protoConstraint, constructorConstraint],
  "phase-special-ids",
);
assertEqual(
  Object.getPrototypeOf(specialIdSnapshot.constraintIdAliases),
  null,
  "alias storage must have a null prototype",
);
assert(
  Object.prototype.hasOwnProperty.call(
    specialIdSnapshot.constraintIdAliases,
    "__proto__",
  ),
  "prototype-named constraint ID must be an own alias key",
);
assertEqual(
  specialIdSnapshot.constraintIdAliases["__proto__"],
  "__proto__",
  "prototype-named alias must never become an object prototype",
);
assertEqual(
  specialIdSnapshot.constraintIdAliases["constructor"],
  "constructor",
  "constructor-named alias must remain a string ID",
);
assertEqual(
  registry.resolveConstraintIds(specialIdSnapshot, ["__proto__", "constructor"])
    .join(","),
  "__proto__,constructor",
  "special IDs must resolve without inherited-key interference",
);
const specialIdSelection = registry.select(
  specialIdSnapshot,
  { include: ["__proto__"], includeAllApplicable: false },
  "target-step",
);
assertEqual(
  specialIdSelection.relevant[0]?.id,
  "__proto__",
  "prototype-named alias must select its canonical constraint",
);
assertEqual(
  registry.activate(specialIdSnapshot, ["constructor"]).constraints[0]?.id,
  "constructor",
  "constructor-named alias must activate its canonical constraint",
);

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

const unsafeCompletionSpecification: ProtocolRuntimeSpecification = {
  ...initialRuntimeSpecification,
  categories: [
    ...initialRuntimeSpecification.categories,
    {
      id: "unsafe_completion",
      label: "Unsafe Completion",
      version: "0.1.0",
      rules: [],
      reasoningRules: [],
      workflow: {
        entryStep: "unsafe-complete",
        version: "0.1.0",
        steps: [
          {
            id: "unsafe-complete",
            kind: "action",
            version: "0.1.0",
            objective: "Attempt completion despite failed validation",
            inputContract: { description: "No input required" },
            outputContract: {
              description: "Required result",
              requiredFields: ["requiredResult"],
            },
            completionCriteria: [
              {
                id: "unsafe-result-reported",
                description: "Required result was reported",
                required: true,
              },
            ],
            allowedTransitions: [
              { action: "complete", when: { validationStatus: ["failed"] } },
            ],
          },
        ],
      },
    },
  ],
};
const unsafeCompletionRuntime = new BehavioralRuntime({
  specification: unsafeCompletionSpecification,
  executor: {
    async execute(): Promise<ModelExecutionResult> {
      return { output: {}, completedCriteria: [] };
    },
  },
});
await unsafeCompletionRuntime.startRun({
  runId: "phase4-unsafe-completion",
  phaseId: "phase-unsafe-completion",
  categoryId: "unsafe_completion",
  objective: "Never complete failed validation",
  context: {},
});
const unsafeCompletionResult = await unsafeCompletionRuntime.executeCurrentStep(
  "phase4-unsafe-completion",
);
assertEqual(
  unsafeCompletionResult.validation.status,
  "failed",
  "malicious completion regression must fail validation",
);
assertEqual(
  unsafeCompletionResult.transition.action,
  "block",
  "failed validation must not authorize complete",
);
assertEqual(
  unsafeCompletionResult.state.status,
  "blocked",
  "failed validation must not create completed state",
);

const aliasComplianceRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new ComplianceExecutor(() => [
    { constraintId: canonicalLegacyB.id, status: "satisfied" },
  ]),
});
await aliasComplianceRuntime.startRun({
  runId: "phase4-alias-compliance",
  phaseId: "phase-alias-compliance",
  categoryId: "discussion",
  objective: "Accept compliance through a known alias",
  context: initialContext,
  userConstraints: [canonicalLegacyA, canonicalLegacyB],
});
const aliasComplianceContract = await aliasComplianceRuntime.compileCurrentStep(
  "phase4-alias-compliance",
);
assertEqual(
  aliasComplianceContract.constraintIdAliases[canonicalLegacyB.id],
  canonicalLegacyA.id,
  "compiled contract must expose canonical alias resolution to the executor",
);
const aliasComplianceResult = await aliasComplianceRuntime.executeCurrentStep(
  "phase4-alias-compliance",
);
assertEqual(
  aliasComplianceResult.validation.status,
  "passed",
  "known alias compliance must satisfy the canonical constraint",
);
assertEqual(
  aliasComplianceResult.validation.constraintCompliance?.[0]?.constraintId,
  canonicalLegacyA.id,
  "returned compliance must report the canonical constraint ID",
);

const duplicateAliasComplianceRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new ComplianceExecutor(() => [
    { constraintId: canonicalLegacyA.id, status: "satisfied" },
    { constraintId: canonicalLegacyB.id, status: "satisfied" },
  ]),
});
await duplicateAliasComplianceRuntime.startRun({
  runId: "phase4-duplicate-alias-compliance",
  phaseId: "phase-duplicate-alias-compliance",
  categoryId: "discussion",
  objective: "Reject canonical and alias duplicate compliance",
  context: initialContext,
  userConstraints: [canonicalLegacyA, canonicalLegacyB],
});
const duplicateAliasComplianceResult =
  await duplicateAliasComplianceRuntime.executeCurrentStep(
    "phase4-duplicate-alias-compliance",
  );
assertEqual(
  duplicateAliasComplianceResult.validation.status,
  "failed",
  "canonical and alias compliance must be a duplicate failure",
);
assert(
  duplicateAliasComplianceResult.validation.checks
    .find((check) => check.validatorId === "runtime.constraint_compliance_ids")
    ?.message?.includes(`Duplicate constraint compliance IDs: ${canonicalLegacyA.id}`),
  "canonical and alias duplicate must report the canonical ID",
);

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
assertEqual(
  missingPreferenceResult.validation.checks.find(
    (check) => check.validatorId === "runtime.constraint_compliance",
  )?.message,
  "Relevant hard constraints have conclusive compliance records",
  "passed compliance diagnostics must describe only the hard-constraint gate",
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

const invalidStatusRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: {
    async execute(input: ModelExecutionInput): Promise<ModelExecutionResult> {
      return {
        output: Object.fromEntries(
          (input.contract.step.outputContract.requiredFields ?? []).map((field) => [field, field]),
        ),
        completedCriteria: input.contract.step.completionCriteria
          .filter((criterion) => criterion.required)
          .map((criterion) => criterion.id),
        constraintCompliance: [
          { constraintId: relevantId, status: "bogus" },
        ],
      } as unknown as ModelExecutionResult;
    },
  },
});
await invalidStatusRuntime.startRun({
  runId: "phase4-invalid-compliance-status",
  phaseId: "phase-invalid-compliance-status",
  categoryId: "discussion",
  objective: "Reject untrusted compliance statuses",
  context: initialContext,
  explicitConstraints: [relevantInput],
});
const invalidStatusResult = await invalidStatusRuntime.executeCurrentStep(
  "phase4-invalid-compliance-status",
);
assertEqual(
  invalidStatusResult.validation.status,
  "failed",
  "invalid executor compliance status must fail validation",
);
const invalidStatusMessage = invalidStatusResult.validation.checks
  .find((check) => check.validatorId === "runtime.constraint_compliance_ids")
  ?.message ?? "";
assert(
  invalidStatusMessage.includes(`Invalid constraint compliance statuses: ${relevantId}=bogus`),
  "invalid executor compliance status must be visible deterministically",
);
assertEqual(
  invalidStatusResult.validation.constraintCompliance?.find(
    (item) => item.constraintId === relevantId,
  )?.status,
  "inconclusive",
  "invalid executor compliance status must normalize to a public status",
);

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

const canonicalRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  executor: new ComplianceExecutor((input) =>
    input.contract.constraints.map((constraint) => ({
      constraintId: constraint.id,
      status: "satisfied",
    })),
  ),
});
let canonicalRuntimeState = await canonicalRuntime.startRun({
  runId: "phase4-canonical-persistence",
  phaseId: "canonical-runtime-one",
  categoryId: "discussion",
  objective: "Persist one canonical legacy constraint",
  userConstraints: [canonicalLegacyA, canonicalLegacyB],
  context: initialContext,
});
while (canonicalRuntimeState.status === "active") {
  canonicalRuntimeState = (
    await canonicalRuntime.executeCurrentStep(canonicalRuntimeState.runId)
  ).state;
}
const canonicalTransitioned = await canonicalRuntime.transitionPhase(
  canonicalRuntimeState.runId,
  {
    phaseId: "canonical-runtime-two",
    categoryId: "task_execution",
    objective: "Keep the canonical legacy constraint active",
  },
);
assertEqual(
  canonicalTransitioned.constraintRegistry.constraints.length,
  1,
  "canonical legacy constraint must remain singly active after transition",
);
assertEqual(
  canonicalTransitioned.constraintRegistry.registeredConstraints.length,
  1,
  "canonical legacy constraint catalog must remain deduplicated",
);
assertEqual(
  canonicalTransitioned.persistentConstraintIds.length,
  1,
  "persistent constraint IDs must resolve to the canonical registered ID",
);
assertEqual(
  canonicalTransitioned.persistentConstraintIds[0],
  canonicalLegacyA.id,
  "persistent constraint ID must use the first registered canonical ID",
);

class SeededStateStore implements RuntimeStateStore {
  readonly #states = new Map<string, RuntimeRunState>();

  constructor(states: readonly RuntimeRunState[]) {
    for (const state of states) this.#states.set(state.runId, state);
  }

  async get(runId: string): Promise<RuntimeRunState | undefined> {
    return this.#states.get(runId);
  }

  async save(state: RuntimeRunState): Promise<void> {
    this.#states.set(state.runId, state);
  }

  async has(runId: string): Promise<boolean> {
    return this.#states.has(runId);
  }
}

const legacyActiveState = {
  runId: "phase4-legacy-active-state",
  phaseId: "legacy-active-phase",
  categoryId: "discussion",
  objective: "Hydrate active legacy state",
  modifierIds: ["temporary-modifier"],
  userConstraints: [canonicalLegacyA],
  currentStepId: "understand-position",
  status: "active",
  context: initialContext,
  attemptsByStep: {},
  retriesByStep: {},
  traces: [],
} as unknown as RuntimeRunState;
const legacyCompletedState = {
  ...legacyActiveState,
  runId: "phase4-legacy-completed-state",
  phaseId: "legacy-completed-phase",
  objective: "Hydrate completed legacy state",
  currentStepId: "respond",
  status: "completed",
} as unknown as RuntimeRunState;
const legacyStateStore = new SeededStateStore([
  legacyActiveState,
  legacyCompletedState,
]);
const legacyRuntime = new BehavioralRuntime({
  specification: modifierSpecification,
  stateStore: legacyStateStore,
  executor: new ComplianceExecutor((input) =>
    input.contract.constraints.map((constraint) => ({
      constraintId: constraint.id,
      status: "satisfied",
    })),
  ),
});
const hydratedLegacyContract = await legacyRuntime.compileCurrentStep(
  legacyActiveState.runId,
);
assert(
  hydratedLegacyContract.constraints.some(
    (constraint) => constraint.id === canonicalLegacyA.id,
  ),
  "hydrated legacy active state must retain user constraints",
);
assert(
  hydratedLegacyContract.constraints.some(
    (constraint) => constraint.id === temporaryModifierConstraint.id,
  ),
  "hydrated legacy active state must restore modifier constraints",
);
const hydratedLegacyStep = await legacyRuntime.executeCurrentStep(
  legacyActiveState.runId,
);
assertEqual(
  hydratedLegacyStep.validation.status,
  "passed",
  "hydrated legacy active state must validate normally",
);
const savedHydratedState = await legacyStateStore.get(legacyActiveState.runId);
assert(savedHydratedState?.constraintRegistry, "hydrated state must be saved with a registry");
assert(
  savedHydratedState?.persistentConstraintIds.includes(canonicalLegacyA.id),
  "hydrated state must save persistent user constraint IDs",
);
const transitionedLegacyState = await legacyRuntime.transitionPhase(
  legacyCompletedState.runId,
  {
    phaseId: "legacy-transitioned-phase",
    categoryId: "task_execution",
    objective: "Transition hydrated legacy state",
    modifierIds: [],
  },
);
assert(
  transitionedLegacyState.constraintRegistry.constraints.some(
    (constraint) => constraint.id === canonicalLegacyA.id,
  ),
  "hydrated completed state must retain user constraints across transition",
);
assert(
  !transitionedLegacyState.constraintRegistry.constraints.some(
    (constraint) => constraint.id === temporaryModifierConstraint.id,
  ),
  "hydrated completed state must deactivate removed modifiers",
);

const preservedPhase4Trace = transitioned.traces[0];
assert(preservedPhase4Trace, "phase 4 snapshot migration needs a trace fixture");
const phase4SnapshotWithoutAliases = {
  ...legacyActiveState,
  runId: "phase4-snapshot-without-aliases",
  phaseId: "phase4-snapshot-migration",
  modifierIds: [],
  userConstraints: [canonicalLegacyA, canonicalLegacyB],
  constraintRegistry: {
    constraints: [canonicalLegacyA, canonicalLegacyB],
    registeredConstraints: [canonicalLegacyA, canonicalLegacyB],
    history: [
      {
        sequence: 1,
        constraintId: canonicalLegacyA.id,
        phaseId: "phase4-snapshot-migration",
        action: "registered",
      },
      {
        sequence: 2,
        constraintId: canonicalLegacyB.id,
        phaseId: "phase4-snapshot-migration",
        action: "reaffirmed",
      },
    ],
  },
  persistentConstraintIds: [canonicalLegacyB.id],
  traces: [preservedPhase4Trace],
} as unknown as RuntimeRunState;
const phase4SnapshotStore = new SeededStateStore([phase4SnapshotWithoutAliases]);
const phase4SnapshotRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  stateStore: phase4SnapshotStore,
  executor: new ComplianceExecutor(() => [
    { constraintId: canonicalLegacyB.id, status: "satisfied" },
  ]),
});
const normalizedPhase4Snapshot = await phase4SnapshotRuntime.getState(
  phase4SnapshotWithoutAliases.runId,
);
assertEqual(
  normalizedPhase4Snapshot.constraintRegistry.registeredConstraints.length,
  1,
  "persisted Phase 4 catalog must canonically deduplicate",
);
assertEqual(
  normalizedPhase4Snapshot.constraintRegistry.constraints.length,
  1,
  "persisted Phase 4 active constraints must canonically deduplicate",
);
assertEqual(
  normalizedPhase4Snapshot.constraintRegistry.constraintIdAliases[
    canonicalLegacyB.id
  ],
  canonicalLegacyA.id,
  "persisted Phase 4 alias map must be restored",
);
assertEqual(
  normalizedPhase4Snapshot.persistentConstraintIds[0],
  canonicalLegacyA.id,
  "persisted Phase 4 persistent IDs must normalize to canonical IDs",
);
assertEqual(
  normalizedPhase4Snapshot.constraintRegistry.history.length,
  2,
  "persisted Phase 4 history must be preserved",
);
assertEqual(
  normalizedPhase4Snapshot.traces[0],
  preservedPhase4Trace,
  "persisted Phase 4 traces must be preserved",
);
assertEqual(
  await phase4SnapshotStore.get(phase4SnapshotWithoutAliases.runId),
  normalizedPhase4Snapshot,
  "normalized Phase 4 snapshot must be saved through the state store",
);
const normalizedPhase4Execution = await phase4SnapshotRuntime.executeCurrentStep(
  phase4SnapshotWithoutAliases.runId,
);
assertEqual(
  normalizedPhase4Execution.validation.status,
  "passed",
  "normalized Phase 4 snapshot must validate alias compliance",
);

const oldAliasMap = Object.fromEntries([
  ["__proto__", "__proto__"],
  ["constructor", "constructor"],
]);
const oldAliasSnapshotState = {
  ...legacyActiveState,
  runId: "phase4-old-alias-map",
  phaseId: "phase4-old-alias-map-phase",
  modifierIds: [],
  userConstraints: [protoConstraint, constructorConstraint],
  constraintRegistry: {
    constraints: [protoConstraint, constructorConstraint],
    registeredConstraints: [protoConstraint, constructorConstraint],
    constraintIdAliases: oldAliasMap,
    history: [],
  },
  persistentConstraintIds: ["__proto__", "constructor"],
} as unknown as RuntimeRunState;
const oldAliasStore = new SeededStateStore([oldAliasSnapshotState]);
const oldAliasRuntime = new BehavioralRuntime({
  specification: initialRuntimeSpecification,
  stateStore: oldAliasStore,
  executor: new ComplianceExecutor(() => []),
});
const normalizedOldAliasState = await oldAliasRuntime.getState(
  oldAliasSnapshotState.runId,
);
assertEqual(
  Object.getPrototypeOf(
    normalizedOldAliasState.constraintRegistry.constraintIdAliases,
  ),
  null,
  "persisted ordinary-object alias maps must migrate to null-prototype maps",
);
assertEqual(
  normalizedOldAliasState.constraintRegistry.constraintIdAliases["__proto__"],
  "__proto__",
  "persisted prototype-named aliases must survive migration",
);
assertEqual(
  await oldAliasStore.get(oldAliasSnapshotState.runId),
  normalizedOldAliasState,
  "prototype-safe alias migration must persist through the state store",
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
