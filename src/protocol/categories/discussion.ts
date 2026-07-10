import type { CategoryProtocol } from "../../spec/index.js";

export const discussionCategory: CategoryProtocol = {
  id: "discussion",
  label: "Discussion",
  version: "0.1.0",
  description: "Explores, challenges, and refines ideas without implying execution.",
  rules: [
    {
      id: "discussion-no-implicit-execution",
      description: "Discussion does not authorize external execution or mutation.",
      overridable: false,
    },
    {
      id: "discussion-challenge-when-useful",
      description: "Challenge weak assumptions when doing so improves the result.",
      overridable: true,
    },
  ],
  reasoningRules: [
    "understand the user's current position",
    "identify assumptions and unresolved tradeoffs",
    "challenge weak points where useful",
    "extend promising ideas",
    "avoid premature finalization",
  ],
  workflow: {
    entryStep: "understand-position",
    version: "0.1.0",
    description: "Lightweight discussion workflow with no execution side effects.",
    steps: [
      {
        id: "understand-position",
        kind: "reasoning",
        version: "0.1.0",
        objective: "Build an accurate representation of the user's current position and constraints.",
        reasoning: [{ strategyId: "constraint_analysis" }],
        inputContract: {
          description: "Current user turn plus relevant conversation context.",
          requiredFields: ["userTurn", "conversationContext"],
        },
        outputContract: {
          description: "Structured position, assumptions, constraints, and unresolved questions.",
          requiredFields: ["position", "constraints", "assumptions"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [
            {
              id: "discussion-position-output-shape",
              kind: "schema",
              description: "Required position sections are present.",
              required: true,
            },
          ],
        },
        completionCriteria: [
          {
            id: "position-understood",
            description: "The user's position is represented without inventing unsupported intent.",
            required: true,
          },
        ],
        allowedTransitions: [
          {
            action: "continue",
            to: "analyze-and-challenge",
            when: { validationStatus: ["passed"] },
          },
          {
            action: "block",
            when: {
              description: "Required context is missing and a best-effort answer would be materially unsafe or misleading.",
            },
          },
        ],
      },
      {
        id: "analyze-and-challenge",
        kind: "reasoning",
        version: "0.1.0",
        objective: "Analyze the idea, expose tradeoffs, and challenge weak assumptions.",
        reasoning: [{ strategyId: "tradeoff_analysis" }],
        inputContract: {
          description: "Structured position from the previous step.",
          requiredFields: ["position", "constraints", "assumptions"],
        },
        outputContract: {
          description: "Analysis containing strengths, weaknesses, tradeoffs, and refinements.",
          requiredFields: ["strengths", "weaknesses", "tradeoffs", "refinements"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [
            {
              id: "discussion-output-shape",
              kind: "schema",
              description: "Required analysis sections are present.",
              required: true,
            },
          ],
        },
        completionCriteria: [
          {
            id: "tradeoffs-exposed",
            description: "Material tradeoffs are explicit when they exist.",
            required: true,
          },
        ],
        allowedTransitions: [
          {
            action: "continue",
            to: "respond",
            when: { validationStatus: ["passed"] },
          },
          {
            action: "retry",
            to: "analyze-and-challenge",
            when: { validationStatus: ["failed"] },
          },
        ],
        retryPolicy: {
          maxAttempts: 1,
          retryOn: ["failed"],
        },
      },
      {
        id: "respond",
        kind: "action",
        version: "0.1.0",
        objective: "Deliver the discussion result clearly without implying unauthorized execution.",
        inputContract: {
          description: "Validated discussion analysis.",
          requiredFields: ["strengths", "weaknesses", "tradeoffs", "refinements"],
        },
        outputContract: {
          description: "Final user-facing discussion response.",
          requiredFields: ["response"],
        },
        completionCriteria: [
          {
            id: "response-delivered",
            description: "A user-facing response has been produced.",
            required: true,
          },
        ],
        allowedTransitions: [
          {
            action: "complete",
            when: { completionCriteria: ["response-delivered"] },
          },
        ],
      },
    ],
  },
};
