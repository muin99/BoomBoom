const { spawn, spawnSync } = require("node:child_process");
const compiler = require.resolve("typescript/lib/tsc.js");
const initial = spawnSync(process.execPath, [compiler, "-p", "tsconfig.json"], {
  stdio: "inherit",
});
if (initial.status !== 0) process.exit(initial.status || 1);
const children = [
  spawn(process.execPath, [compiler, "-w", "-p", "tsconfig.json"], {
    stdio: "inherit",
  }),
  spawn(process.execPath, ["--watch", "dist/main.js"], { stdio: "inherit" }),
];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children)
  child.on("exit", () => {
    if (!stopping) stop();
  });
