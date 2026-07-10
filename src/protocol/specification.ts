import type { ProtocolRuntimeSpecification } from "../spec/index.js";
import { universalBaseProtocol } from "./base.js";
import { codingTaskCategory } from "./categories/coding-task.js";
import { discussionCategory } from "./categories/discussion.js";
import { taskExecutionCategory } from "./categories/task-execution.js";
import { reasoningStrategies } from "./strategies.js";

export const initialRuntimeSpecification: ProtocolRuntimeSpecification = {
  version: "0.4.0",
  description: "Phase 6 runtime specification with reusable observable reasoning strategies.",
  baseProtocol: universalBaseProtocol,
  categories: [discussionCategory, taskExecutionCategory, codingTaskCategory],
  modifiers: [],
  reasoningStrategies,
};
