import { spawnSync } from "child_process";
import { platform } from "process";

const isWindows = platform === "win32";
const pythonPath = isWindows ? "server/.venv/Scripts/python.exe" : "server/.venv/bin/python";

const result = spawnSync(pythonPath, ["-m", "server.run"], { stdio: "inherit" });
if (result.error) {
  console.error(`Failed to launch Python from ${pythonPath}. Did you run npm run setup:server?`);
}
process.exit(result.status ?? 1);
