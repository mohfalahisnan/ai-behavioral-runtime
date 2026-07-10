# Reasoning Strategy Library

Phase 6 provides eight reusable, host-neutral reasoning strategies:

| Strategy | Observable purpose |
|---|---|
| `constraint_analysis` | Identify applicable rules, conflicts, permissions, and sequence. |
| `evidence_gathering` | Collect relevant evidence and expose assumptions and gaps. |
| `hypothesis_testing` | Compare testable explanations using discriminating checks. |
| `root_cause_analysis` | Connect symptoms to an evidence-backed causal fault. |
| `tradeoff_analysis` | Compare viable options against explicit criteria. |
| `risk_analysis` | Assess failure modes, likelihood, impact, mitigation, and residual risk. |
| `adversarial_review` | Seek counterexamples, boundary failures, and unsupported claims. |
| `verification` | Check claims and completion criteria using reproducible evidence. |

Every strategy defines:

- an objective,
- recommended behaviors,
- required checks,
- prohibited shortcuts,
- evidence expectations.

`ProtocolRegistry` rejects blank or empty definitions. `StepCompiler` resolves selected definitions into `EffectiveStepContract.reasoning.strategies`, so host-native and optional direct-executor paths receive the same contract.

## Observable boundary

Strategies standardize behavior that can be inspected through contracts, structured outputs, completion criteria, validation rules, evidence, and traces. They do not request or store hidden chain-of-thought, private scratch work, or a narrative reasoning transcript.

The host returns normal `ExecutionResult` output and optional evidence. Phase 6 does not add model-authored strategy compliance reports. Phase 7 expands evidence enforcement through validators.

## Workflow mapping rule

Use strategies only where judgment is material. Mechanical execution and reporting steps do not receive ceremonial reasoning instructions. Strategy composition changes the effective step contract, not category workflow order or runtime transitions.
