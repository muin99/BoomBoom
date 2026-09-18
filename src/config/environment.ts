import "dotenv/config";

function integer(
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const v =
    process.env[name] === undefined ? fallback : Number(process.env[name]);
  if (!Number.isInteger(v) || v < min || v > max)
    throw new Error(`Invalid configuration: ${name}`);
  return v;
}
export function readConfig() {
  const timeout = integer("OPENAI_TIMEOUT_MS", 11000, 100, 24000);
  const attempts = integer("OPENAI_MAX_ATTEMPTS", 2, 1, 2);
  if (timeout * attempts > 25000)
    throw new Error("OpenAI retry budget must be at most 25000 ms");
  return {
    apiKey: process.env.OPENAI_API_KEY?.trim() || "",
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini-2025-04-14",
    port: integer("PORT", 3000, 1, 65535),
    timeout,
    attempts,
    cacheMax: integer("CACHE_MAX_ENTRIES", 256, 0, 10000),
    cacheTtl: integer("CACHE_TTL_SECONDS", 300, 0, 86400) * 1000,
  };
}
export type Config = ReturnType<typeof readConfig>;
