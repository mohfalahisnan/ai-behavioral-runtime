# Codebase Dependencies: Validation and Transitions

This document lists the internal and external dependencies for components involved in Phases 7-10.

## 1. External Dependencies
The runtime maintains a zero-dependency design for its core engine, avoiding heavy agent or routing frameworks:
* **TypeScript** (`^5.8.3`): Used for strict type enforcement and compilation.
* **Node.js**: The project executes ES Modules directly (compiled output in `dist/` using `node`).
* **Mocha/Chai/Vitest equivalent**: The tests in `tests/` use custom assertion helpers (`assert`, `assertEqual`) and execute directly with `node dist/tests/....js`, avoiding dependency on external test frameworks.

## 2. Internal Module Dependencies
The upcoming validation framework and automatic resolution components will interact with:
* **Spec Layer** (`src/spec/`):
  * `validation.ts`: Declares `ValidatorKind`, `ValidationRule`, `ValidationContract`, and `ValidationResult`.
  * `workflow.ts`: Defines workflow step shape and allowed transitions.
  * `trace.ts`: Defines trace structures that validation results must compile into.
  * `host.ts` and `permissions.ts`: Used to enforce boundaries between resolution/validation and host execution permissions.
* **Runtime Layer** (`src/runtime/`):
  * `behavioral-runtime.ts`: The central orchestration engine. It will need to call new validator registration methods, new automatic classification helpers, and enhanced trace recorders.
  * `transition-resolver.ts`: Interacts directly with validation status to decide step transitions.
  * `validation.ts`: Contains the main validation pipeline and built-in validator handlers.
  * `errors.ts`: Contains core error definitions (will need new validator-specific and resolver-specific errors).
