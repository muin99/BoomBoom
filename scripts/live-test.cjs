const fs = require("node:fs");
const { createApp } = require("../dist/bootstrap");
const { readConfig } = require("../dist/config/environment");
const { verifyCase } = require("./verify.cjs");
const pack = require("../BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json");

async function main() {
  const config = readConfig();
  if (!config.apiKey) {
    console.error(
      "OPENAI_API_KEY is empty. Add your key to .env, then rerun npm run test:live.",
    );
    process.exitCode = 1;
    return;
  }
  const { app } = await createApp({ quiet: true });
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl(),
    results = [];
  const smoke = process.argv.includes("--smoke");
  try {
    const health = await fetch(base + "/health");
    if (health.status !== 200) throw new Error("Health failed");
    const cases = smoke ? pack.cases.slice(0, 1) : [...pack.cases];
    if (!smoke) {
      const variants = [
        [
          0,
          [
            "Rooftop PV washing runs 12:00–14:00; three quarters of predicted generation will be lost.",
            "Next month the athletics registration date changes.",
          ],
        ],
        [
          2,
          [
            "Hold half the battery’s full storage capacity in reserve between eighteen hundred and twenty-one hundred today.",
          ],
        ],
        [
          4,
          [
            "During 18:00–21:00, take no more than 155 kilowatt-hours from the utility in each hourly interval.",
          ],
        ],
        [
          7,
          [
            "The battery cannot accept energy from eleven in the morning until one in the afternoon.",
            "Between seventeen hundred and nineteen hundred, disable battery discharge.",
          ],
        ],
      ];
      for (const [i, notes] of variants) {
        const c = structuredClone(pack.cases[i]);
        c.id += "-PARAPHRASE";
        c.input.scenario_id = c.id;
        c.input.operator_notes = notes;
        cases.push(c);
      }
    }
    for (const c of cases) {
      try {
        const result = await verifyCase(base, c);
        results.push(result);
        console.log(
          `PASS ${result.id}: ${result.latency_ms} ms; ${result.cost_bdt} BDT`,
        );
      } catch (error) {
        results.push({
          id: c.id,
          status: "failed",
          reason: error instanceof Error ? error.message : "Test failed",
        });
        console.error(`FAIL ${c.id}: see sanitized test report`);
      }
    }
    if (!smoke && results.every((r) => r.status === "passed")) {
      const repeated = await Promise.all(
        Array.from({ length: 5 }, () => verifyCase(base, pack.cases[0])),
      );
      console.log(
        `PASS 5 concurrent repeated requests (${Math.max(...repeated.map((r) => r.latency_ms))} ms maximum)`,
      );
    }
  } finally {
    await app.close();
  }
  const times = results
    .filter((r) => r.status === "passed")
    .map((r) => r.latency_ms)
    .sort((a, b) => a - b);
  const report = {
    mode: "live-openai-http",
    generated_at: new Date().toISOString(),
    model: config.model,
    passed: results.filter((r) => r.status === "passed").length,
    total: results.length,
    p95_ms: times[Math.max(0, Math.ceil(times.length * 0.95) - 1)] ?? null,
    results,
  };
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(
    `artifacts/${smoke ? "key-check" : "live-test-report"}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    `${report.passed}/${report.total} live cases passed; p95 ${report.p95_ms} ms. No API key values printed.`,
  );
  if (report.passed !== report.total) process.exitCode = 1;
}
main().catch(() => {
  console.error(
    "Live test could not complete. Check server configuration and connectivity.",
  );
  process.exitCode = 1;
});
