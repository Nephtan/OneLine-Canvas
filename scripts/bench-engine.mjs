import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const vitestEntrypoint = fileURLToPath(
  new URL("../node_modules/vitest/vitest.mjs", import.meta.url)
);

const child = spawn(process.execPath, [vitestEntrypoint, "--run"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ONE_LINE_ENGINE_BENCH: "1"
  }
});

child.on("error", (error) => {
  console.error("Failed to launch the engine benchmark runner.");
  console.error(error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
