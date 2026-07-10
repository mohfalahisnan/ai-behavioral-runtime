# Initial Category Protocols

Phase 3 adds three declarative category workflows to the same generic runtime.

## Workflows

### `discussion`

```text
understand-position
→ analyze-and-challenge
→ respond
```

This workflow understands a position, exposes assumptions and tradeoffs, then produces a response without implying execution permission.

### `task_execution`

```text
understand-task
→ plan-execution
→ execute-task
→ validate-result
→ report
```

This workflow bounds a task, plans and performs it, validates the result, then reports the validated outcome.

### `coding_task`

```text
understand-requirement
→ inspect-codebase
→ diagnose
→ design-solution
→ security-check
→ implement
→ static-validation
→ runtime-validation
→ regression-check
→ review-diff
→ report
```

This workflow makes inspection, diagnosis, security review, implementation, validation, regression checking, and final diff review explicit.

## Declarative boundary

All category differences live in plain `CategoryProtocol` data: rules, reasoning guidance, workflow steps, contracts, completion criteria, validation rules, and transitions. The runtime contains no category-specific branches. One `BehavioralRuntime` and one generic `ModelExecutor` can run every category.

Category selection remains manual. The caller supplies `StartRunInput.categoryId`; Phase 3 does not add automatic classification or routing.

## Deferred features

Later phases may add more category protocols, modifiers, strategy definitions, automatic category inference, model routing, multi-agent orchestration, or provider integration. None of those are part of Phase 3.
