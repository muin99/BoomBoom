const { test } = require("node:test");
const assert = require("node:assert/strict");
const OpenAI = require("openai").default;
const { readConfig } = require("../dist/config/environment");
const {
  OpenAiInterpreterService,
} = require("../dist/interpretation/services/openai-interpreter.service");
const {
  InterpretationCacheService,
} = require("../dist/interpretation/services/interpretation-cache.service");
const { validator } = require("./helpers/domain-services.cjs");
const sample = require("../BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json")
  .cases[0];

function interpreterWithFetch(fetch) {
  const config = {
    ...readConfig(),
    apiKey: "test-only-sentinel",
    timeout: 100,
    attempts: 2,
  };
  const client = new OpenAI({ apiKey: config.apiKey, fetch, maxRetries: 0 });
  return new OpenAiInterpreterService(
    config,
    client,
    validator,
    new InterpretationCacheService(config),
  );
}

test("real OpenAI SDK serialization and structured parsing work through the injectable provider", async () => {
  let calls = 0;
  const interpreter = interpreterWithFetch(async (url, init) => {
    calls++;
    const payload = JSON.parse(init.body);
    assert.equal(payload.store, false);
    assert.equal(payload.text.format.type, "json_schema");
    assert.equal(payload.text.format.strict, true);
    assert.ok(!JSON.stringify(payload).includes("test-only-sentinel"));
    return new Response(
      JSON.stringify({
        id: "resp_test",
        object: "response",
        status: "completed",
        output: [
          {
            type: "message",
            id: "msg_test",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                annotations: [],
                text: JSON.stringify({
                  directive_interpretation:
                    sample.expected_output.directive_interpretation,
                }),
              },
            ],
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
  assert.deepEqual(
    await interpreter.interpret(sample.input),
    sample.expected_output.directive_interpretation,
  );
  assert.equal(calls, 1);
});

test("provider authentication, throttling, and timeout failures are bounded and sanitized", async () => {
  for (const [status, expected, attempts] of [
    [401, "OPENAI_AUTH_FAILED", 1],
    [429, "OPENAI_RATE_LIMIT", 2],
  ]) {
    let calls = 0;
    const interpreter = interpreterWithFetch(async () => {
      calls++;
      return new Response(
        JSON.stringify({
          error: { message: "test-only-sentinel", type: "test_error" },
        }),
        {
          status,
          headers: { "content-type": "application/json" },
        },
      );
    });
    await assert.rejects(
      () => interpreter.interpret(sample.input),
      (error) => error.code === expected && !error.message.includes("sentinel"),
    );
    assert.equal(calls, attempts);
  }
  let calls = 0;
  const slow = interpreterWithFetch(async (url, init) => {
    calls++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Transport timed out")),
        1000,
      );
      const abort = () => {
        clearTimeout(timer);
        reject(new Error("Transport aborted"));
      };
      if (init.signal.aborted) abort();
      else init.signal.addEventListener("abort", abort, { once: true });
    });
  });
  const start = performance.now();
  await assert.rejects(
    () => slow.interpret(sample.input),
    (error) => error.code === "LLM_UNAVAILABLE",
  );
  assert.equal(calls, 2);
  assert.ok(performance.now() - start < 2000);
});

test("cache evicts entries, expires them, and never caches failed computations", async () => {
  const cache = new InterpretationCacheService({
    ...readConfig(),
    cacheMax: 1,
    cacheTtl: 20,
  });
  let calls = 0;
  const load = async () => {
    calls++;
    return sample.expected_output.directive_interpretation;
  };
  await cache.getOrCompute("a", load);
  await cache.getOrCompute("b", load);
  await cache.getOrCompute("a", load);
  assert.equal(calls, 3);
  await new Promise((resolve) => setTimeout(resolve, 30));
  await cache.getOrCompute("a", load);
  assert.equal(calls, 4);
  await assert.rejects(() =>
    cache.getOrCompute("failed", async () => {
      throw new Error("No valid output");
    }),
  );
  await cache.getOrCompute("failed", load);
  assert.equal(calls, 5);
});
