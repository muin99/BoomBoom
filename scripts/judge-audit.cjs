const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createApp } = require("../dist/bootstrap");
const { verifyCase } = require("./verify.cjs");
const { languageEdgeCases } = require("../test/fixtures/judge-cases.cjs");
const pack = require("../BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json");

async function main() {
  let app;
  let base = process.env.BASE_URL?.replace(/\/$/, "");
  if (!base) {
    ({ app } = await createApp({ quiet: true }));
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  }
  const results = [];
  async function check(id, operation) {
    const start = performance.now();
    try {
      const detail = await operation();
      results.push({
        id,
        status: "passed",
        latency_ms: Math.round(performance.now() - start),
        ...detail,
      });
      console.log(`PASS ${id}: ${results.at(-1).latency_ms} ms`);
    } catch (error) {
      results.push({
        id,
        status: "failed",
        latency_ms: Math.round(performance.now() - start),
        reason: error instanceof Error ? error.message : "Check failed",
      });
      console.error(`FAIL ${id}: ${results.at(-1).reason}`);
    }
  }
  const request = (path, options = {}) =>
    fetch(base + path, { ...options, signal: AbortSignal.timeout(30000) });
  const post = (body) =>
    request("/optimize-energy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  try {
    await check("HEALTH", async () => {
      const response = await request("/health");
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "ok" });
    });
    await check("SWAGGER", async () => {
      const response = await request("/docs");
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes("swagger-ui"));
      for (const asset of [
        "swagger-ui.css",
        "swagger-ui-bundle.js",
        "swagger-ui-init.js",
      ]) {
        assert.equal((await request("/docs/" + asset)).status, 200);
      }
    });
    await check("OPENAPI-CONTRACT", async () => {
      const response = await request("/docs-json");
      assert.equal(response.status, 200);
      const actual = await response.json();
      const expected = JSON.parse(fs.readFileSync("docs/openapi.json", "utf8"));
      for (const [path, methods] of Object.entries(expected.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
          assert.deepEqual(
            actual.paths[path][method].requestBody,
            operation.requestBody,
          );
          assert.deepEqual(
            actual.paths[path][method].responses,
            operation.responses,
          );
        }
      }
    });

    const cases = [...pack.cases, ...languageEdgeCases()];
    for (const fixture of cases) {
      await check(fixture.id, () => verifyCase(base, fixture));
    }

    const invalidMutations = [
      ["DUPLICATE-HOURS", (input) => (input.hours[1].hour = 0)],
      ["MISSING-HOUR", (input) => input.hours.pop()],
      ["HOUR-24", (input) => (input.hours[23].hour = 24)],
      ["EMPTY-NOTES", (input) => (input.operator_notes = [])],
      ["FOUR-NOTES", (input) => (input.operator_notes = ["a", "b", "c", "d"])],
      ["BLANK-NOTE", (input) => (input.operator_notes = ["  "])],
      ["STRING-NUMBER", (input) => (input.hours[0].demand_kwh = "5")],
      ["NEGATIVE-NUMBER", (input) => (input.battery.capacity_kwh = -1)],
      [
        "EXTRA-FIELD",
        (input) => (input.secret_sentinel = "DO-NOT-ECHO-SENTINEL"),
      ],
    ];
    for (const [name, mutate] of invalidMutations) {
      await check(`INVALID-${name}`, async () => {
        const input = structuredClone(pack.cases[0].input);
        mutate(input);
        const response = await post(input);
        assert.equal(response.status, 400);
        const text = await response.text();
        assert.ok(
          !text.includes("DO-NOT-ECHO-SENTINEL") && !text.includes("stack"),
        );
      });
    }
    await check("INVALID-BATTERY-BOUNDS", async () => {
      const input = structuredClone(pack.cases[0].input);
      input.battery.initial_energy_kwh = input.battery.capacity_kwh + 1;
      assert.equal((await post(input)).status, 422);
    });
    await check("MALFORMED-JSON", async () => {
      const response = await request("/optimize-energy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"invalid":',
      });
      assert.equal(response.status, 400);
      assert.ok((await response.json()).error);
    });
    await check("NONFINITE-JSON-NUMBER", async () => {
      const body = JSON.stringify(pack.cases[0].input).replace(
        '"capacity_kwh":220',
        '"capacity_kwh":1e309',
      );
      const response = await request("/optimize-energy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      assert.equal(response.status, 400);
    });
    await check("INFEASIBLE-CONSTRAINT", async () => {
      const input = structuredClone(pack.cases[0].input);
      input.scenario_id = "AUDIT-INFEASIBLE";
      input.battery.max_discharge_kwh_per_hour = 0;
      input.operator_notes = [
        "Grid import is capped at zero kWh from 6 PM to 7 PM.",
      ];
      const response = await post(input);
      assert.equal(response.status, 422);
      assert.equal((await response.json()).error, "INFEASIBLE_SCENARIO");
    });
    await check("CONCURRENT-REPEATS", async () => {
      const repeated = await Promise.all(
        Array.from({ length: 8 }, () => verifyCase(base, pack.cases[0])),
      );
      return {
        requests: 8,
        maximum_request_ms: Math.max(
          ...repeated.map((item) => item.latency_ms),
        ),
      };
    });
    await check("HEALTH-AFTER-ERRORS", async () => {
      assert.equal((await request("/health")).status, 200);
    });
  } finally {
    if (app) await app.close();
  }

  const latencies = results
    .filter((item) => item.cost_bdt !== undefined && item.status === "passed")
    .map((item) => item.latency_ms)
    .sort((a, b) => a - b);
  const report = {
    generated_at: new Date().toISOString(),
    target: process.env.BASE_URL ? base : "local modular NestJS application",
    passed: results.filter((item) => item.status === "passed").length,
    total: results.length,
    optimization_p95_ms:
      latencies[Math.ceil(latencies.length * 0.95) - 1] ?? null,
    note: "Sample timings may include validated interpretation cache hits. Generated edge cases are not official hidden cases. Video excluded.",
    results,
  };
  fs.mkdirSync("artifacts", { recursive: true });
  const name = process.env.BASE_URL
    ? "judge-audit-public"
    : "judge-audit-local";
  fs.writeFileSync(
    `artifacts/${name}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    `${report.passed}/${report.total} checks passed; optimization p95 ${report.optimization_p95_ms} ms.`,
  );
  if (report.passed !== report.total) process.exitCode = 1;
}

main().catch(() => {
  console.error(
    "Audit could not complete; check configuration or connectivity.",
  );
  process.exitCode = 1;
});
