const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");

const root = path.resolve(__dirname, "..");
const profile = path.join(root, "deploy/dianahost");
const stage = path.join(root, "artifacts/dianahost-build");
const archive = path.join(root, "artifacts/gridwise-dianahost-node20.zip");
const live = process.argv.includes("--live");

function run(command, args, env = {}) {
  execFileSync(command, args, {
    cwd: stage,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

if (process.versions.node !== "20.20.2") {
  throw new Error(
    "Build with the target runtime: npx --yes --package=node@20.20.2 -c 'node scripts/package-dianahost.cjs --live'",
  );
}

fs.mkdirSync(path.dirname(stage), { recursive: true });
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage);
for (const name of ["package.json", "package-lock.json", "app.js"]) {
  fs.copyFileSync(path.join(profile, name), path.join(stage, name));
}
for (const name of ["src", "test", "examples"]) {
  fs.cpSync(path.join(root, name), path.join(stage, name), { recursive: true });
}
for (const name of [
  "tsconfig.json",
  "BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json",
]) {
  fs.copyFileSync(path.join(root, name), path.join(stage, name));
}
fs.mkdirSync(path.join(stage, "scripts"));
for (const name of fs.readdirSync(path.join(root, "scripts"))) {
  if (name.endsWith(".cjs") && name !== "package-dianahost.cjs") {
    fs.copyFileSync(
      path.join(root, "scripts", name),
      path.join(stage, "scripts", name),
    );
  }
}
fs.mkdirSync(path.join(stage, "docs"));
fs.copyFileSync(
  path.join(root, "docs/openapi.json"),
  path.join(stage, "docs/openapi.json"),
);
fs.copyFileSync(path.join(root, "README.md"), path.join(stage, "README.md"));

// A strict fresh install rejects incompatible transitive Node.js requirements.
run("npm", [
  "ci",
  "--include=dev",
  "--engine-strict",
  "--no-audit",
  "--no-fund",
]);
run("npm", ["test"]);
run("npm", ["audit", "--omit=dev", "--audit-level=low"]);
if (live) {
  run(process.execPath, ["scripts/judge-audit.cjs"], {
    DOTENV_CONFIG_PATH: path.join(root, ".env"),
    BASE_URL: "",
  });
}
const manifest = JSON.parse(
  fs.readFileSync(path.join(stage, "package.json"), "utf8"),
);
fs.writeFileSync(
  path.join(stage, "BUILD-INFO.json"),
  JSON.stringify(
    {
      built_at: new Date().toISOString(),
      node: process.versions.node,
      dependencies: manifest.dependencies,
      offline_tests: "passed",
      live_audit: live ? "passed" : "not run",
      hosting_status:
        "DianaHost deployment and Passenger integration not yet verified",
    },
    null,
    2,
  ) + "\n",
);
// Explicit archive allowlist: never include .env, node_modules, logs or test reports.
fs.rmSync(archive, { force: true });
run("zip", [
  "-q",
  "-r",
  archive,
  "app.js",
  "package.json",
  "package-lock.json",
  "dist",
  "src",
  "test",
  "scripts",
  "examples",
  "docs",
  "tsconfig.json",
  "README.md",
  "BUILD-INFO.json",
  "BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json",
]);
const digest = createHash("sha256")
  .update(fs.readFileSync(archive))
  .digest("hex");
fs.writeFileSync(archive + ".sha256", `${digest}  ${path.basename(archive)}\n`);
console.log(`Upload package: ${archive}\nSHA256: ${digest}`);
