import type { ReasoningStrategy } from "../spec/index.js";

export const constraintAnalysisStrategy: ReasoningStrategy = {
  id: "constraint_analysis",
  version: "0.2.0",
  objective: "Identify applicable requirements, prohibitions, permissions, priorities, conflicts, and sequencing constraints.",
  behaviors: [
    "identify explicit requirements, prohibitions, permissions, priorities, and sequencing constraints",
    "separate hard constraints from preferences and assumptions",
    "surface conflicts and unresolved constraint ambiguity",
  ],
  requiredChecks: [
    "confirm every relevant explicit constraint is represented",
    "check for conflicting constraints and authority or priority",
    "check that execution permission and ordering are explicit",
  ],
  prohibitedShortcuts: [
    "infer execution permission from the topic or requested outcome",
    "silently discard a constraint because it is inconvenient",
    "treat a preference as a hard requirement without evidence",
  ],
  evidenceExpectations: [
    "reference relevant constraint IDs or source instructions when available",
    "record unresolved conflicts and the basis for any precedence decision",
  ],
};

export const tradeoffAnalysisStrategy: ReasoningStrategy = {
  id: "tradeoff_analysis",
  version: "0.2.0",
  objective: "Compare viable alternatives against explicit decision criteria and current constraints.",
  behaviors: [
    "identify materially distinct viable alternatives",
    "compare benefits, costs, assumptions, and constraints using explicit criteria",
    "prefer the simplest option that satisfies the current constraints",
  ],
  requiredChecks: [
    "confirm compared options are genuinely viable",
    "check that the same material criteria are applied to each option",
    "identify decisive constraints and assumptions behind the recommendation",
  ],
  prohibitedShortcuts: [
    "force false balance when only one option is viable",
    "hide a decisive downside or constraint violation",
    "converge before meaningful alternatives are compared",
  ],
  evidenceExpectations: [
    "record the comparison criteria and material facts behind each tradeoff",
    "state unsupported assumptions and evidence gaps affecting the recommendation",
  ],
};

export const evidenceGatheringStrategy: ReasoningStrategy = {
  id: "evidence_gathering",
  version: "0.1.0",
  objective: "Collect relevant evidence, distinguish facts from assumptions, and expose material evidence gaps.",
  behaviors: [
    "gather evidence that can change or support the current decision",
    "distinguish direct observations from inference and assumption",
    "include contradictory evidence and material unknowns",
  ],
  requiredChecks: [
    "check that each material item is relevant to the objective",
    "check source or artifact provenance when available",
    "identify missing evidence that limits confidence",
  ],
  prohibitedShortcuts: [
    "treat an unsupported assertion as evidence",
    "substitute evidence volume for relevance or quality",
    "omit contradictory evidence without explanation",
  ],
  evidenceExpectations: [
    "reference inspected artifacts, tool results, sources, or observations",
    "record material missing evidence and its effect on confidence",
  ],
};

export const hypothesisTestingStrategy: ReasoningStrategy = {
  id: "hypothesis_testing",
  version: "0.1.0",
  objective: "Evaluate testable candidate explanations by seeking discriminating and falsifying evidence.",
  behaviors: [
    "form materially distinct candidate explanations when alternatives are plausible",
    "derive observations or checks that distinguish candidates",
    "attempt to falsify the leading candidate before accepting it",
  ],
  requiredChecks: [
    "check at least one credible alternative when the evidence permits one",
    "check that proposed tests can distinguish between candidates",
    "record the outcome of each performed check",
  ],
  prohibitedShortcuts: [
    "accept the first plausible explanation without testing",
    "seek only evidence that confirms the preferred candidate",
    "reject a candidate without a relevant observation or check",
  ],
  evidenceExpectations: [
    "record candidate hypotheses, discriminating checks, and observed outcomes",
    "identify candidates that remain untested or inconclusive",
  ],
};

export const rootCauseAnalysisStrategy: ReasoningStrategy = {
  id: "root_cause_analysis",
  version: "0.1.0",
  objective: "Identify the underlying causal fault and distinguish it from symptoms and contributing conditions.",
  behaviors: [
    "separate observed symptoms from candidate causes",
    "trace a causal chain from evidence to the underlying fault",
    "distinguish the root cause from contributing conditions",
  ],
  requiredChecks: [
    "check that evidence supports each material causal link",
    "check that the proposed cause can explain the observed symptoms",
    "check credible alternatives before finalizing the root cause",
  ],
  prohibitedShortcuts: [
    "relabel a symptom as the root cause",
    "treat correlation or timing alone as proof of causation",
    "assume a single cause before considering contributing conditions",
  ],
  evidenceExpectations: [
    "record the evidence chain connecting symptoms to the proposed root cause",
    "record rejected alternatives and the observations that weakened them",
  ],
};

export const riskAnalysisStrategy: ReasoningStrategy = {
  id: "risk_analysis",
  version: "0.1.0",
  objective: "Identify credible failure modes and assess likelihood, impact, mitigation, and residual risk.",
  behaviors: [
    "identify credible failure modes across relevant trust and operational boundaries",
    "assess likelihood and impact using explicit evidence or assumptions",
    "define mitigations and state the remaining residual risk",
  ],
  requiredChecks: [
    "check high-impact and high-likelihood risks first",
    "check assumptions behind qualitative or quantitative ratings",
    "check whether proposed mitigations are feasible and verifiable",
  ],
  prohibitedShortcuts: [
    "equate lack of observed failure with absence of risk",
    "use vague severity labels without a stated basis",
    "ignore residual risk after naming a mitigation",
  ],
  evidenceExpectations: [
    "record the basis for material likelihood and impact assessments",
    "record mitigation evidence, ownership assumptions, and residual risk",
  ],
};

export const adversarialReviewStrategy: ReasoningStrategy = {
  id: "adversarial_review",
  version: "0.1.0",
  objective: "Challenge a candidate result by seeking counterexamples, boundary failures, unsafe assumptions, and unsupported claims.",
  behaviors: [
    "test material claims against counterexamples and edge conditions",
    "inspect scope, trust boundaries, failure paths, and hidden assumptions",
    "separate actionable findings from speculative concerns",
  ],
  requiredChecks: [
    "check the highest-impact assumptions and failure surfaces",
    "check whether the result changes scope or violates a constraint",
    "record the disposition of each material finding",
  ],
  prohibitedShortcuts: [
    "perform an approval-only or ceremonial review",
    "attack irrelevant details while ignoring material failure paths",
    "equate no discovered issue with proof of safety or correctness",
  ],
  evidenceExpectations: [
    "record reviewed attack surfaces, counterexamples, or boundary cases",
    "attach evidence for findings and state coverage limits when no issue is found",
  ],
};

export const verificationStrategy: ReasoningStrategy = {
  id: "verification",
  version: "0.1.0",
  objective: "Check claims and completion criteria against reproducible evidence and report limitations honestly.",
  behaviors: [
    "translate material claims and completion criteria into explicit checks",
    "prefer deterministic, tool, test, or external evidence over self-evaluation",
    "record actual outcomes, failures, and limitations",
  ],
  requiredChecks: [
    "check every required completion claim",
    "check that reported verification was actually executed",
    "check that evidence is current, relevant, and attributable",
  ],
  prohibitedShortcuts: [
    "claim success from intention, plausibility, or an unexecuted check",
    "hide a failed or inconclusive verification result",
    "use model self-assessment when stronger objective evidence is available",
  ],
  evidenceExpectations: [
    "record commands, tools, tests, outputs, or external artifacts used for verification",
    "record failed, skipped, and inconclusive checks with their impact",
  ],
};

export const reasoningStrategies: readonly ReasoningStrategy[] = [
  constraintAnalysisStrategy,
  evidenceGatheringStrategy,
  hypothesisTestingStrategy,
  rootCauseAnalysisStrategy,
  tradeoffAnalysisStrategy,
  riskAnalysisStrategy,
  adversarialReviewStrategy,
  verificationStrategy,
];
