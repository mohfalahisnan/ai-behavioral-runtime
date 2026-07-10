import {
  ClaudeCodePlugin,
  ClaudeCodeHostAdapter,
  CLAUDE_CODE_HOST_CAPABILITIES,
  initialRuntimeSpecification,
} from "../src/index.js";
import { resolveEnforcementLevel } from "../src/runtime/host-governance.js";
import fs from "fs/promises";
import path from "path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

const testDataDir = ".behavioral-runtime-claude-code-test";

try {
  // Cleanup stale test directory if it exists
  await fs.rm(testDataDir, { recursive: true, force: true }).catch(() => {});

  console.log("Running Claude Code Plugin tests...");

  // 1. Capability mapping test
  console.log("- Test 1: Capability mapping...");
  assertEqual(CLAUDE_CODE_HOST_CAPABILITIES.canInjectInstructions, true, "canInjectInstructions must be true");
  assertEqual(CLAUDE_CODE_HOST_CAPABILITIES.canObserveModelOutput, true, "canObserveModelOutput must be true");
  assertEqual(CLAUDE_CODE_HOST_CAPABILITIES.canObserveToolCalls, true, "canObserveToolCalls must be true");
  assertEqual(CLAUDE_CODE_HOST_CAPABILITIES.canBlockToolCalls, true, "canBlockToolCalls must be true");
  assertEqual(CLAUDE_CODE_HOST_CAPABILITIES.canTriggerAdditionalTurns, true, "canTriggerAdditionalTurns must be true");
  assertEqual(CLAUDE_CODE_HOST_CAPABILITIES.canPersistLocalState, true, "canPersistLocalState must be true");
  assertEqual(CLAUDE_CODE_HOST_CAPABILITIES.canSelectModel, false, "canSelectModel must be false");
  assertEqual(CLAUDE_CODE_HOST_CAPABILITIES.canBlockModelOutput, false, "canBlockModelOutput must be false");
  assertEqual(CLAUDE_CODE_HOST_CAPABILITIES.toolCallInterceptionScope, "partial", "toolCallInterceptionScope must be partial");
  
  const enforcement = resolveEnforcementLevel(CLAUDE_CODE_HOST_CAPABILITIES);
  assertEqual(enforcement, "interceptable", "Enforcement level must be interceptable");

  // 2. Adapter construction test
  console.log("- Test 2: Adapter construction...");
  const adapter = new ClaudeCodeHostAdapter();
  assertEqual(adapter.capabilities, CLAUDE_CODE_HOST_CAPABILITIES, "Adapter capabilities must match static config");
  
  const observedResult = await adapter.observeToolCall({
    runId: "test-run",
    phaseId: "test-phase",
    stepId: "test-step",
    toolName: "Bash",
    arguments: {},
  });
  assertEqual(observedResult.observed, false, "Default observeToolCall should return observed false");

  const blockedResult = await adapter.blockToolCall({
    runId: "test-run",
    phaseId: "test-phase",
    stepId: "test-step",
    toolName: "Bash",
    arguments: {},
  });
  assertEqual(blockedResult.action, "allow", "Default blockToolCall should return allow");

  // 3. Plugin lifecycle test
  console.log("- Test 3: Plugin lifecycle simulation...");
  const plugin = new ClaudeCodePlugin({
    specification: initialRuntimeSpecification,
    dataDir: testDataDir,
  });

  const sessionId = "test-session-cc";

  // SessionStart
  const startResult = await plugin.handleSessionStart({
    session_id: sessionId,
    hook_event_name: "SessionStart",
    cwd: "/test/project",
    permission_mode: "default",
  });
  assert(startResult.systemMessage !== undefined, "SessionStart must return a systemMessage");
  assert(startResult.systemMessage.includes("Active step:"), "System message must contain the active step");

  // PreToolUse
  const preToolResult = await plugin.handlePreToolUse({
    session_id: sessionId,
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command: "npm test" },
  });
  assertEqual(preToolResult.hookSpecificOutput?.permissionDecision, "allow", "PreToolUse decision should be allow");

  // PostToolUse
  const postToolResult = await plugin.handlePostToolUse({
    session_id: sessionId,
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_input: { command: "npm test" },
  });
  assert(typeof postToolResult === "object", "PostToolUse should return an object");

  // Stop
  const stopResult = await plugin.handleStop({
    session_id: sessionId,
    hook_event_name: "Stop",
    last_assistant_message: "Here is the summary of the work.",
  });
  // Since it's task_execution category and entry step has no complex validators or blocks:
  assertEqual(stopResult.decision, "approve", "Stop decision should be approve");

  // SessionEnd
  const endResult = await plugin.handleSessionEnd({
    session_id: sessionId,
    hook_event_name: "SessionEnd",
  });
  assert(typeof endResult === "object", "SessionEnd should return an object");

  // State persistence check
  const statePath = path.join(testDataDir, "runs", `${sessionId}.json`);
  const stateExists = await fs.access(statePath).then(() => true).catch(() => false);
  assert(stateExists, "Run state file must exist");
  
  const stateData = JSON.parse(await fs.readFile(statePath, "utf-8"));
  assertEqual(stateData.runId, sessionId, "State runId must match session ID");

  // 4. Multiple sessions test
  console.log("- Test 4: Multiple sessions isolation...");
  const sessionId2 = "test-session-cc-2";
  await plugin.handleSessionStart({
    session_id: sessionId2,
    hook_event_name: "SessionStart",
    cwd: "/test/project2",
  });

  const statePath2 = path.join(testDataDir, "runs", `${sessionId2}.json`);
  const stateExists2 = await fs.access(statePath2).then(() => true).catch(() => false);
  assert(stateExists2, "Session 2 state file must exist independently");

  console.log("All Claude Code Plugin tests passed successfully!");
} finally {
  // Cleanup test files
  await fs.rm(testDataDir, { recursive: true, force: true }).catch(() => {});
}
