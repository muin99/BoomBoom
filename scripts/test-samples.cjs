const { verifyCase } = require("./verify.cjs");
const pack = require("../BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json");
async function main() {
  const base = (process.env.BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  if (
    (await fetch(base + "/health", { signal: AbortSignal.timeout(5000) }))
      .status !== 200
  )
    throw new Error("Health failed");
  for (const c of pack.cases) {
    const r = await verifyCase(base, c);
    console.log(`PASS ${r.id}: ${r.latency_ms} ms, ${r.cost_bdt} BDT`);
  }
  console.log(
    "All 10 cases passed semantic interpretation, ground-truth replay, totals, and optimal cost.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
