import { AntigravityPlugin, initialRuntimeSpecification } from "../index.js";

const port = process.env.ORCA_AGENT_HOOK_PORT ? parseInt(process.env.ORCA_AGENT_HOOK_PORT, 10) : 3030;
const plugin = new AntigravityPlugin({
  specification: initialRuntimeSpecification,
});

console.log("Starting Antigravity Behavioral Runtime Plugin Hook Server...");
await plugin.start(port);

process.on("SIGINT", async () => {
  console.log("Stopping Hook Server...");
  await plugin.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Stopping Hook Server...");
  await plugin.stop();
  process.exit(0);
});
