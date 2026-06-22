import { spawnSync } from "child_process";
import { platform } from "process";

const isWindows = platform === "win32";
const pythonCandidates = isWindows
  ? [["python"], ["py", "-3"]]
  : [["python3"], ["python"]];

let pythonCmd;
for (const candidate of pythonCandidates) {
  const [cmd, ...args] = candidate;
  const result = spawnSync(cmd, [...args, "--version"], { stdio: "ignore" });
  if (result.status === 0) {
    pythonCmd = candidate;
    break;
  }
}

if (!pythonCmd) {
  console.error("Python 3 executable not found. Install Python 3.10+ and add it to PATH.");
  process.exit(1);
}

const venvDir = "server/.venv";
const pipPath = isWindows ? `${venvDir}/Scripts/pip.exe` : `${venvDir}/bin/pip`;

const create = spawnSync(pythonCmd[0], [...pythonCmd.slice(1), "-m", "venv", venvDir], {
  stdio: "inherit",
});
if (create.status !== 0) {
  process.exit(create.status);
}

const install = spawnSync(pipPath, ["install", "-r", "server/requirements.txt"], {
  stdio: "inherit",
});
process.exit(install.status ?? 1);
