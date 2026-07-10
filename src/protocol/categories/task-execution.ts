import type { CategoryProtocol } from "../../spec/index.js";

export const taskExecutionCategory: CategoryProtocol = {
  id: "task_execution",
  label: "Task Execution",
  version: "0.1.0",
  description: "Executes a bounded task, validates the result, and reports the outcome.",
  rules: [
    {
      id: "task-execution-respect-scope",
      description: "Execute only work authorized by the task and its explicit constraints.",
      overridable: false,
    },
    {
      id: "task-execution-validate-before-report",
      description: "Validate the result before reporting the task complete.",
      overridable: false,
    },
  ],
  reasoningRules: [
    "understand the requested outcome before acting",
    "plan only the work required for the current task",
    "validate the produced result against success criteria",
  ],
  workflow: {
    entryStep: "understand-task",
    version: "0.1.0",
    description: "General task workflow from understanding through validation and reporting.",
    steps: [
      {
        id: "understand-task",
        kind: "reasoning",
        version: "0.1.0",
        objective: "Identify the requested outcome, constraints, and success criteria.",
        reasoning: [{ strategyId: "constraint_analysis" }],
        inputContract: {
          description: "The requested task and relevant task context.",
          requiredFields: ["task", "taskContext"],
        },
        outputContract: {
          description: "A bounded task objective with constraints and success criteria.",
          requiredFields: ["taskObjective", "taskConstraints", "successCriteria"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [{ id: "task-understanding-shape", kind: "schema", description: "The task analysis has all required sections.", required: true }],
        },
        completionCriteria: [{ id: "task-understood", description: "The task scope and outcome are explicit.", required: true }],
        allowedTransitions: [{ action: "continue", to: "plan-execution", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "plan-execution",
        kind: "reasoning",
        version: "0.1.0",
        objective: "Create a bounded execution and validation plan.",
        reasoning: [
          { strategyId: "tradeoff_analysis" },
          { strategyId: "risk_analysis" },
        ],
        inputContract: {
          description: "The understood task, constraints, and success criteria.",
          requiredFields: ["taskObjective", "taskConstraints", "successCriteria"],
        },
        outputContract: {
          description: "An ordered execution plan with risks and validation approach.",
          requiredFields: ["executionPlan", "executionRisks", "validationPlan"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [{ id: "task-plan-shape", kind: "schema", description: "The execution plan has all required sections.", required: true }],
        },
        completionCriteria: [{ id: "execution-planned", description: "The task has an executable, bounded plan.", required: true }],
        allowedTransitions: [{ action: "continue", to: "execute-task", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "execute-task",
        kind: "action",
        version: "0.1.0",
        objective: "Carry out the authorized execution plan.",
        inputContract: {
          description: "The validated execution plan and task constraints.",
          requiredFields: ["executionPlan", "taskConstraints"],
        },
        outputContract: {
          description: "The task result and execution evidence.",
          requiredFields: ["taskResult", "executionEvidence"],
        },
        completionCriteria: [{ id: "task-executed", description: "The planned task actions have produced a result.", required: true }],
        allowedTransitions: [{ action: "continue", to: "validate-result", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "validate-result",
        kind: "validation",
        version: "0.1.0",
        objective: "Validate the task result against the declared success criteria.",
        reasoning: [{ strategyId: "verification" }],
        inputContract: {
          description: "The task result, evidence, and declared success criteria.",
          requiredFields: ["taskResult", "executionEvidence", "successCriteria"],
        },
        outputContract: {
          description: "A validation summary and validated result.",
          requiredFields: ["validationSummary", "validatedResult"],
        },
        validationContract: {
          version: "0.1.0",
          rules: [{ id: "task-result-validation-shape", kind: "schema", description: "The result validation has all required sections.", required: true }],
        },
        completionCriteria: [{ id: "result-validated", description: "The task result has been checked against success criteria.", required: true }],
        allowedTransitions: [{ action: "continue", to: "report", when: { validationStatus: ["passed"] } }],
      },
      {
        id: "report",
        kind: "action",
        version: "0.1.0",
        objective: "Report the validated task result and material limitations.",
        inputContract: {
          description: "The validated result and its validation summary.",
          requiredFields: ["validatedResult", "validationSummary"],
        },
        outputContract: {
          description: "A user-facing task execution report.",
          requiredFields: ["response"],
        },
        completionCriteria: [{ id: "task-report-delivered", description: "A user-facing task result has been produced.", required: true }],
        allowedTransitions: [{ action: "complete", when: { validationStatus: ["passed"], completionCriteria: ["task-report-delivered"] } }],
      },
    ],
  },
};
