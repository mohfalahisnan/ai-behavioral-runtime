# Host-Native Runtime Lifecycle

The plugin owns behavioral governance. The host owns model execution.

## Turn lifecycle

1. Plugin receives or observes the user turn.
2. Plugin starts or resumes a local runtime run.
3. Plugin calls `prepareCurrentStep(runId)`.
4. If `readyForExecution` is false, the plugin does not invoke the host model.
5. Plugin injects only `PreparedStep.contract` plus required host context.
6. Host executes its configured model with host-owned credentials and tools.
7. Plugin converts observed output to `ExecutionResult`.
8. Plugin calls `submitStepResult(runId, result)`.
9. Runtime validates, authorizes the transition, and persists state and trace.
10. Plugin requests another host turn only when its declared capabilities allow it.

## Local persistence boundary

`RuntimeStateStore` is the persistence port. The core ships with `InMemoryRuntimeStateStore`; a host adapter may provide host-native storage, a local file store, or SQLite without changing protocol semantics.

Allowed by default:

- memory inside the plugin process,
- host-owned plugin data directories,
- local files,
- local SQLite.

Not required:

- hosted database,
- cloud session storage,
- user account,
- central orchestration service,
- external telemetry service.

Persisted state contains workflow state, explicit permissions, constraint registry, attempts, retries, and traces. Missing legacy permission state migrates to `execution: "none"`.

## Enforcement honesty

The trace records host capabilities and the derived enforcement level. Partial tool interception is `interceptable`; full governance additionally requires complete tool interception and the ability to suppress invalid model output before exposure.

## Optional direct execution

`executeCurrentStep()` is a convenience adapter and test helper. It requires an explicitly configured `ModelExecutor` and internally uses the same prepare/submit path. It is not the product's required architecture.
