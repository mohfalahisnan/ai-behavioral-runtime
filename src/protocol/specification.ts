import type { ProtocolRuntimeSpecification } from "../spec/index.js";
import { universalBaseProtocol } from "./base.js";
import { codingTaskCategory } from "./categories/coding-task.js";
import { discussionCategory } from "./categories/discussion.js";
import { taskExecutionCategory } from "./categories/task-execution.js";
import {
  constraintAnalysisStrategy,
  tradeoffAnalysisStrategy,
} from "./strategies.js";

export const initialRuntimeSpecification: ProtocolRuntimeSpecification = {
  version: "0.3.0",
  description: "Phase 3 runtime specification with three declarative categories.",
  baseProtocol: universalBaseProtocol,
  categories: [discussionCategory, taskExecutionCategory, codingTaskCategory],
  modifiers: [],
  reasoningStrategies: [constraintAnalysisStrategy, tradeoffAnalysisStrategy],
};
