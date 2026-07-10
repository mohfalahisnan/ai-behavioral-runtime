import { ClaudeCodePlugin, initialRuntimeSpecification } from "../../../dist/src/index.js";

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(data)); }
      catch (err) { reject(new Error("Failed to parse stdin JSON")); }
    });
    process.stdin.on("error", reject);
  });
}

try {
  const input = await readStdin();
  const plugin = new ClaudeCodePlugin({
    specification: initialRuntimeSpecification,
    dataDir: process.env.CLAUDE_PLUGIN_DATA,
  });

  const result = await plugin.handleStop(input);
  process.stdout.write(JSON.stringify(result));
  process.exit(0);
} catch (err) {
  process.stderr.write(`[behavioral-runtime] stop error: ${err.message ?? err}\n`);
  process.exit(1);
}
