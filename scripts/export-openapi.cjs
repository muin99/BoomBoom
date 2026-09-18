const { createApp } = require("../dist/bootstrap");
const fs = require("node:fs");
(async () => {
  const { app, document } = await createApp({ quiet: true });
  fs.mkdirSync("docs", { recursive: true });
  fs.writeFileSync(
    "docs/openapi.json",
    JSON.stringify(document, null, 2) + "\n",
  );
  await app.close();
  console.log("Wrote docs/openapi.json");
})().catch(() => {
  process.exitCode = 1;
});
