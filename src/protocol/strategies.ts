import type { ReasoningStrategy } from "../spec/index.js";

export const constraintAnalysisStrategy: ReasoningStrategy = {
  id: "constraint_analysis",
  version: "0.1.0",
  objective: "Identify explicit requirements, prohibitions, permissions, and sequencing constraints.",
  behaviors: [
    "extract explicit constraints",
    "separate hard constraints from preferences",
    "preserve execution boundaries",
  ],
  prohibitedShortcuts: ["infer execution permission from topic alone"],
};

export const tradeoffAnalysisStrategy: ReasoningStrategy = {
  id: "tradeoff_analysis",
  version: "0.1.0",
  objective: "Compare meaningful alternatives without forcing premature convergence.",
  behaviors: [
    "identify at least one meaningful upside and downside when alternatives exist",
    "make assumptions explicit",
    "prefer the simplest design that satisfies current constraints",
  ],
};
