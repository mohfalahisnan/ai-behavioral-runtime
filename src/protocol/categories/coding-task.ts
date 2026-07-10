import type { CategoryProtocol } from "../../spec/index.js";

export const codingTaskCategory: CategoryProtocol = {
  id: "coding_task",
  label: "Coding Task",
  version: "0.1.0",
  description: "Inspects, diagnoses, implements, validates, and reviews a bounded code change.",
  rules: [
    {
      id: "coding-task-inspect-before-change",
      description: "Inspect relevant code before designing or implementing a change.",
      overridable: false,
    },
    {
      id: "coding-task-validate-change",
      description: "Run static, runtime, and regression validation before claiming completion.",
      overridable: false,
    },
    {
      id: "coding-task-review-diff",
      description: "Review the final diff for correctness, security, and scope.",
      overridable: false,
    },
  ],
  reasoningRules: [
    "understand the requirement before changing code",
    "ground diagnosis in inspected codebase evidence",
    "prefer the smallest solution that satisfies the requirement",
    "validate before reporting completion",
  ],
  workflow: {
    entryStep: "understand-requirement",
    version: "0.1.0",
    description: "Coding workflow from requirement analysis through implementation review.",
    steps: [
      {
        id: "understand-requirement",
        kind: "reasoning",
        version: "0.1.0",
        objective: "Extract the coding requirement, constraints, and acceptance criteria.",
        reasoning: [{ strategyId: "constraint_analysis" }],
        inputContract: {
          description: "The requested code change and relevant codebase context.",
          requiredFields: ["requirement", "codebaseContext"],
        },
        outputContract: {
          description: "Structured requirements, constraints, and acceptance criteria.",
          requiredFields: ["requirements", "codingConstraints", "acceptanceCriteria"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [{ id: "coding-requirement-shape", kind: "schema", description: "The requirement analysis has all required sections.", required: true }],
        },
        completionCriteria: [{ id: "requirement-understood", description: "The requested behavior and boundaries are explicit.", required: true }],
        allowedTransitions: [{ action: "continue", to: "inspect-codebase", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "inspect-codebase",
        kind: "action",
        version: "0.1.0",
        objective: "Inspect the relevant code, tests, and repository conventions.",
        inputContract: {
          description: "Structured requirements and the supplied codebase context.",
          requiredFields: ["requirements", "codingConstraints", "codebaseContext"],
        },
        outputContract: {
          description: "Relevant codebase findings, affected areas, and current behavior.",
          requiredFields: ["codebaseFindings", "affectedAreas", "currentBehavior"],
        },
        completionCriteria: [{ id: "codebase-inspected", description: "Relevant implementation and test surfaces have been inspected.", required: true }],
        allowedTransitions: [{ action: "continue", to: "diagnose", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "diagnose",
        kind: "reasoning",
        version: "0.1.0",
        objective: "Diagnose the gap between current and required behavior.",
        reasoning: [{ strategyId: "constraint_analysis" }],
        inputContract: {
          description: "Requirements, current behavior, and inspected codebase findings.",
          requiredFields: ["requirements", "codebaseFindings", "currentBehavior"],
        },
        outputContract: {
          description: "A grounded diagnosis with root cause and implementation risks.",
          requiredFields: ["diagnosis", "rootCause", "implementationRisks"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [{ id: "coding-diagnosis-shape", kind: "schema", description: "The diagnosis has all required sections.", required: true }],
        },
        completionCriteria: [{ id: "gap-diagnosed", description: "The implementation gap is explained using inspected evidence.", required: true }],
        allowedTransitions: [{ action: "continue", to: "design-solution", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "design-solution",
        kind: "reasoning",
        version: "0.1.0",
        objective: "Design the smallest solution that satisfies the coding requirement.",
        reasoning: [{ strategyId: "tradeoff_analysis" }],
        inputContract: {
          description: "The diagnosis, affected areas, constraints, and acceptance criteria.",
          requiredFields: ["diagnosis", "affectedAreas", "codingConstraints", "acceptanceCriteria"],
        },
        outputContract: {
          description: "A solution design, implementation plan, and explicit tradeoffs.",
          requiredFields: ["solutionDesign", "implementationPlan", "solutionTradeoffs"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [{ id: "coding-solution-shape", kind: "schema", description: "The solution design has all required sections.", required: true }],
        },
        completionCriteria: [{ id: "solution-designed", description: "A bounded solution and implementation plan are defined.", required: true }],
        allowedTransitions: [{ action: "continue", to: "security-check", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "security-check",
        kind: "validation",
        version: "0.1.0",
        objective: "Check the proposed solution for material security risks before implementation.",
        reasoning: [{ strategyId: "constraint_analysis" }],
        inputContract: {
          description: "The solution design, implementation plan, and coding constraints.",
          requiredFields: ["solutionDesign", "implementationPlan", "codingConstraints"],
        },
        outputContract: {
          description: "A security assessment, identified risks, and approval state.",
          requiredFields: ["securityAssessment", "securityRisks", "securityApproval"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [{ id: "coding-security-shape", kind: "schema", description: "The security check has all required sections.", required: true }],
        },
        completionCriteria: [
          { id: "security-checked", description: "Material security risks have been assessed before implementation.", required: true },
          { id: "security-approved", description: "The security assessment explicitly approves implementation.", required: true },
        ],
        allowedTransitions: [
          { action: "continue", to: "implement", when: { validationStatus: ["passed"], completionCriteria: ["security-approved"] } },
          { action: "block", when: { validationStatus: ["failed"], description: "Security approval is required before implementation." } },
        ],
      },
      {
        id: "implement",
        kind: "action",
        version: "0.1.0",
        objective: "Implement the approved solution within the declared scope.",
        inputContract: {
          description: "The implementation plan and completed security assessment.",
          requiredFields: ["implementationPlan", "securityAssessment", "securityApproval"],
        },
        outputContract: {
          description: "The implementation result and a summary of changed behavior.",
          requiredFields: ["implementation", "diffSummary"],
        },
        completionCriteria: [{ id: "solution-implemented", description: "The approved solution has been implemented.", required: true }],
        allowedTransitions: [{ action: "continue", to: "static-validation", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "static-validation",
        kind: "validation",
        version: "0.1.0",
        objective: "Run static checks against the implementation.",
        inputContract: {
          description: "The completed implementation and affected code areas.",
          requiredFields: ["implementation", "affectedAreas"],
        },
        outputContract: {
          description: "Static validation results and supporting evidence.",
          requiredFields: ["staticValidation", "staticEvidence"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [{ id: "coding-static-validation-shape", kind: "schema", description: "Static validation reports all required results.", required: true }],
        },
        completionCriteria: [{ id: "static-checks-completed", description: "Required static checks have completed successfully.", required: true }],
        allowedTransitions: [{ action: "continue", to: "runtime-validation", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "runtime-validation",
        kind: "validation",
        version: "0.1.0",
        objective: "Run behavioral checks against the implementation.",
        inputContract: {
          description: "The implementation and successful static validation results.",
          requiredFields: ["implementation", "staticValidation"],
        },
        outputContract: {
          description: "Runtime validation results and supporting evidence.",
          requiredFields: ["runtimeValidation", "runtimeEvidence"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [{ id: "coding-runtime-validation-shape", kind: "schema", description: "Runtime validation reports all required results.", required: true }],
        },
        completionCriteria: [{ id: "runtime-checks-completed", description: "Required runtime checks have completed successfully.", required: true }],
        allowedTransitions: [{ action: "continue", to: "regression-check", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "regression-check",
        kind: "validation",
        version: "0.1.0",
        objective: "Check that the implementation does not regress existing behavior.",
        inputContract: {
          description: "The implementation, runtime results, and acceptance criteria.",
          requiredFields: ["implementation", "runtimeValidation", "acceptanceCriteria"],
        },
        outputContract: {
          description: "Regression check results and supporting evidence.",
          requiredFields: ["regressionValidation", "regressionEvidence"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [{ id: "coding-regression-validation-shape", kind: "schema", description: "Regression validation reports all required results.", required: true }],
        },
        completionCriteria: [{ id: "regressions-checked", description: "Existing relevant behavior has been checked for regressions.", required: true }],
        allowedTransitions: [{ action: "continue", to: "review-diff", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "review-diff",
        kind: "reasoning",
        version: "0.1.0",
        objective: "Review the final change for correctness, scope, and remaining risk.",
        reasoning: [{ strategyId: "constraint_analysis" }, { strategyId: "tradeoff_analysis" }],
        inputContract: {
          description: "The diff summary and all validation results.",
          requiredFields: ["diffSummary", "staticValidation", "runtimeValidation", "regressionValidation"],
        },
        outputContract: {
          description: "Review findings, final diff assessment, and remaining risks.",
          requiredFields: ["reviewFindings", "finalDiff", "remainingRisks"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [{ id: "coding-review-shape", kind: "schema", description: "The final review has all required sections.", required: true }],
        },
        completionCriteria: [{ id: "diff-reviewed", description: "The final diff and validation evidence have been reviewed.", required: true }],
        allowedTransitions: [{ action: "continue", to: "report", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "report",
        kind: "action",
        version: "0.1.0",
        objective: "Report the implemented change, validation evidence, and remaining concerns.",
        inputContract: {
          description: "The reviewed diff, validation evidence, and remaining risks.",
          requiredFields: ["finalDiff", "reviewFindings", "remainingRisks"],
        },
        outputContract: {
          description: "A user-facing coding task report.",
          requiredFields: ["response"],
        },
        completionCriteria: [{ id: "coding-report-delivered", description: "A user-facing coding result has been produced.", required: true }],
        allowedTransitions: [{ action: "complete", when: { validationStatus: ["passed"], completionCriteria: ["coding-report-delivered"] } }],
      },
    ],
  },
};
