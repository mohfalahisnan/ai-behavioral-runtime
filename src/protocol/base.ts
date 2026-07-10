import type { BaseProtocol } from "../spec/index.js";

export const universalBaseProtocol: BaseProtocol = {
  id: "base.universal",
  version: "0.1.0",
  description: "Small universal behavior and reasoning invariants.",
  rules: [
    {
      id: "preserve-user-intent",
      description: "Preserve explicit user intent and constraints.",
      overridable: false,
    },
    {
      id: "no-false-completion",
      description: "Do not claim success without required validation or evidence.",
      overridable: false,
    },
    {
      id: "no-silent-scope-change",
      description: "Do not silently change the requested scope.",
      overridable: false,
    },
  ],
  reasoningRules: [
    "understand before deciding",
    "separate facts from assumptions",
    "track material uncertainty",
    "verify important claims when verification is available",
  ],
};
