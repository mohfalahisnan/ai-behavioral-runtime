# Phase 3 Initial Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship declarative `discussion`, `task_execution`, and `coding_task` category protocols that execute through the unchanged generic behavioral runtime.

**Architecture:** Move reusable protocol definitions out of the example layer into `src/protocol/`. Each category is data: rules, reasoning rules, workflow steps, contracts, validation, completion criteria, and transitions. A single exported runtime specification registers all three categories; tests drive every category through the same `BehavioralRuntime` with one generic deterministic executor.

**Tech Stack:** TypeScript 5.8, Node.js ESM, existing dependency-free build/runtime scripts.

## Global Constraints

- The core must work with `One Runtime + One Protocol System + One Model`.
- No provider-specific concepts, model routing, or multi-agent concepts may enter core protocol or runtime APIs.
- Categories must differ through declarative protocol definitions; do not add category switches or category-specific code to `src/runtime/`.
- Start with only `discussion`, `task_execution`, and `coding_task`.
- Preserve the existing Phase 2 runtime behavior and public exports.
- Do not implement Phase 4 constraint extraction, Phase 5's full strategy library, Phase 6's validator framework expansion, or automatic category resolution.
- Tests for registered categories must assert each required category by name and uniqueness, not pin the full registry to an exact array/count.
- Follow TDD: add the Phase 3 tests, run them and capture the expected failure, then add production protocol definitions.

---

### Task 1: Implement Phase 3 declarative categories

**Files:**

- Create: `src/protocol/base.ts`
- Create: `src/protocol/strategies.ts`
- Create: `src/protocol/categories/discussion.ts`
- Create: `src/protocol/categories/task-execution.ts`
- Create: `src/protocol/categories/coding-task.ts`
- Create: `src/protocol/specification.ts`
- Create: `src/protocol/index.ts`
- Create: `tests/phase3-categories.test.ts`
- Create: `tests/json-types.test.ts`
- Create: `docs/protocols/README.md`
- Modify: `src/index.ts`
- Modify: `examples/discussion.protocol.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `README.md`
- Modify: `PROGRESS.md`

**Interfaces:**

- Produces: `universalBaseProtocol: BaseProtocol`
- Produces: `constraintAnalysisStrategy: ReasoningStrategy`
- Produces: `tradeoffAnalysisStrategy: ReasoningStrategy`
- Produces: `discussionCategory: CategoryProtocol`
- Produces: `taskExecutionCategory: CategoryProtocol`
- Produces: `codingTaskCategory: CategoryProtocol`
- Produces: `initialRuntimeSpecification: ProtocolRuntimeSpecification`
- Preserves: `exampleRuntimeSpecification` and the existing named example exports by re-export/alias from `examples/discussion.protocol.ts`
- Consumes without modification: `BehavioralRuntime`, `ProtocolRegistry`, `StepCompiler`, `TransitionResolver`, and existing spec interfaces

- [ ] **Step 1: Add the failing Phase 3 tests and test scripts**

Add `tests/**/*.ts` to `tsconfig.json`. Add these scripts to `package.json`:

```json
{
  "test": "npm run test:phase3",
  "test:phase3": "npm run typecheck && npm run build && node dist/tests/phase3-categories.test.js"
}
```

`tests/phase3-categories.test.ts` must import `initialRuntimeSpecification` from `../src/protocol/index.js` and test real runtime behavior with no test library dependency. Use small local assertion helpers and one generic `ModelExecutor` that:

```ts
async execute(input: ModelExecutionInput): Promise<ModelExecutionResult> {
  const output = Object.fromEntries(
    (input.contract.step.outputContract.requiredFields ?? []).map((field) => [
      field,
      `${input.contract.categoryId}:${input.contract.step.id}:${field}`,
    ]),
  );

  return {
    output,
    completedCriteria: input.contract.step.completionCriteria
      .filter((criterion) => criterion.required)
      .map((criterion) => criterion.id),
  };
}
```

The test must prove:

- each required category ID occurs exactly once by checking that specific ID, without asserting the complete registry array or total count;
- the three workflows have different ordered step-ID sequences;
- one `BehavioralRuntime` implementation and one generic executor complete one run for each category;
- each completed run emits one trace per workflow step;
- every trace records the selected category ID;
- category selection remains manual through `StartRunInput.categoryId`.

`tests/json-types.test.ts` must close the Phase 2 deferred type-test item with valid nested `JsonObject`/`JsonArray` assignments plus `@ts-expect-error` cases for function, `undefined`, and mutable non-JSON object values.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm run test:phase3
```

Expected: FAIL during TypeScript compilation because `src/protocol/index.ts` and `initialRuntimeSpecification` do not exist yet. Record the command, failing output, and expected reason in the task report.

- [ ] **Step 3: Add shared base protocol and the two already-established strategies**

Move the existing `universalBaseProtocol`, `constraintAnalysisStrategy`, and `tradeoffAnalysisStrategy` definitions from `examples/discussion.protocol.ts` into `src/protocol/base.ts` and `src/protocol/strategies.ts` without changing their IDs or semantics. Do not add the remaining Phase 5 strategy library.

- [ ] **Step 4: Add the three declarative categories**

Keep the existing discussion workflow and semantics. Define the other workflows with these exact ordered steps and kinds:

| Category | Step ID | Kind |
| --- | --- | --- |
| `discussion` | `understand-position` | `reasoning` |
| `discussion` | `analyze-and-challenge` | `reasoning` |
| `discussion` | `respond` | `action` |
| `task_execution` | `understand-task` | `reasoning` |
| `task_execution` | `plan-execution` | `reasoning` |
| `task_execution` | `execute-task` | `action` |
| `task_execution` | `validate-result` | `validation` |
| `task_execution` | `report` | `action` |
| `coding_task` | `understand-requirement` | `reasoning` |
| `coding_task` | `inspect-codebase` | `action` |
| `coding_task` | `diagnose` | `reasoning` |
| `coding_task` | `design-solution` | `reasoning` |
| `coding_task` | `security-check` | `validation` |
| `coding_task` | `implement` | `action` |
| `coding_task` | `static-validation` | `validation` |
| `coding_task` | `runtime-validation` | `validation` |
| `coding_task` | `regression-check` | `validation` |
| `coding_task` | `review-diff` | `reasoning` |
| `coding_task` | `report` | `action` |

For every step:

- define non-empty objective, input contract, output contract, at least one required completion criterion, and legal transitions;
- make each non-terminal step continue to the next listed step only after `validationStatus: ["passed"]`;
- make each terminal `report` step complete only after its required completion criterion is present;
- add a required schema validation rule to reasoning/validation steps whose output feeds a later step;
- use only `constraint_analysis` and `tradeoff_analysis` where useful; do not invent Phase 5 strategies early;
- keep workflows as plain `CategoryProtocol` data with no executable category branches.

- [ ] **Step 5: Register and export the initial specification**

`src/protocol/specification.ts` must define:

```ts
export const initialRuntimeSpecification: ProtocolRuntimeSpecification = {
  version: "0.3.0",
  description: "Phase 3 runtime specification with three declarative categories.",
  baseProtocol: universalBaseProtocol,
  categories: [discussionCategory, taskExecutionCategory, codingTaskCategory],
  modifiers: [],
  reasoningStrategies: [constraintAnalysisStrategy, tradeoffAnalysisStrategy],
};
```

Export the protocol layer from `src/protocol/index.ts` and the package root `src/index.ts`. Convert `examples/discussion.protocol.ts` into compatibility re-exports and set:

```ts
export { initialRuntimeSpecification as exampleRuntimeSpecification } from "../src/protocol/specification.js";
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
npm run test:phase3
```

Expected: PASS with all three category runs completed and clean output.

- [ ] **Step 7: Document Phase 3 and update progress**

Create `docs/protocols/README.md` describing the three workflows, their declarative-only boundary, manual category selection, and deferred later-phase features. Update `README.md` to Phase 3. Update `PROGRESS.md` so Phase 3 is completed and Phase 4 is next; include test/build evidence and close the deferred `JsonObject`/`JsonArray` type-test item.

- [ ] **Step 8: Run the full verification gate**

Run:

```bash
npm test
npm run typecheck
npm run smoke
git diff --check
```

Expected: all commands exit 0 with no warnings or whitespace errors.

- [ ] **Step 9: Self-review and commit**

Confirm `src/runtime/` is unchanged, all required exports work, no category-specific runtime branches exist, and no later-phase behavior was added. Then commit all Phase 3 files:

```bash
git add .gitignore package.json tsconfig.json src examples tests docs README.md PROGRESS.md
git commit -m "feat(protocol): add phase 3 category workflows"
```
