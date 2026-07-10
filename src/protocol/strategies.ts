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
