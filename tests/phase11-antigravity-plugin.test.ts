import {
  AntigravityPlugin,
  initialRuntimeSpecification,
} from "../src/index.js";
import fs from "fs/promises";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

const testPort = 3123;
const testBaseDir = ".behavioral-runtime-test";

// Clean up any stale directories from previous runs
await fs.rm(testBaseDir, { recursive: true, force: true }).catch(() => {});

console.log("Initializing AntigravityPlugin...");
const plugin = new AntigravityPlugin({
  specification: initialRuntimeSpecification,
  baseDir: testBaseDir,
});

await plugin.start(testPort);

try {
  console.log("Simulating PreInvocation webhook...");
  const preRes = await fetch(`http://127.0.0.1:${testPort}/hook/antigravity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      worktreeId: "test-run-11",
      hook_event_name: "PreInvocation",
      payload: {
        phaseId: "eval-phase",
        categoryId: "discussion",
        objective: "Test Antigravity plugin webhook lifecycle",
        context: {
          userTurn: "Hello",
          conversationContext: [],
        },
      },
    }),
  });

  assertEqual(preRes.status, 200, "PreInvocation status must be 200");
  const preJson = await preRes.json() as any;
  assertEqual(preJson.status, "acknowledged", "PreInvocation response must be acknowledged");

  // Give asynchronous handler a moment to execute
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check state persistence
  const stateExists = await fs.access(`${testBaseDir}/runs/test-run-11.json`).then(() => true).catch(() => false);
  assert(stateExists, "Run state file must be persisted on PreInvocation");

  console.log("Simulating PostToolUse webhook...");
  const toolRes = await fetch(`http://127.0.0.1:${testPort}/hook/antigravity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      worktreeId: "test-run-11",
      hook_event_name: "PostToolUse",
      payload: {
        toolName: "run_command",
        arguments: { CommandLine: "npm test" },
      },
    }),
  });

  assertEqual(toolRes.status, 200, "PostToolUse status must be 200");

  console.log("Simulating Stop webhook...");
  const stopRes = await fetch(`http://127.0.0.1:${testPort}/hook/antigravity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      worktreeId: "test-run-11",
      hook_event_name: "Stop",
      payload: {
        output: {
          position: "The user position is clear.",
          constraints: [],
          assumptions: ["None"],
        },
        completedCriteria: ["position-understood"],
      },
    }),
  });

  assertEqual(stopRes.status, 200, "Stop status must be 200");

  console.log("Simulating PostInvocation webhook...");
  const postRes = await fetch(`http://127.0.0.1:${testPort}/hook/antigravity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      worktreeId: "test-run-11",
      hook_event_name: "PostInvocation",
      payload: {},
    }),
  });

  assertEqual(postRes.status, 200, "PostInvocation status must be 200");

  console.log("Antigravity Plugin Webhook simulation completed successfully!");
  await new Promise((resolve) => setTimeout(resolve, 800));
} finally {
  await plugin.stop();
  try {
    await fs.rm(testBaseDir, { recursive: true, force: true });
  } catch (err) {
    // Suppress cleanup error on Windows lock
  }
}
