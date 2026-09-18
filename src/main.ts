import { createApp } from "./bootstrap";

async function main() {
  const { app, config } = await createApp();
  app.enableShutdownHooks();
  await app.listen(config.port, "0.0.0.0");
  console.log(`GridWise listening on port ${config.port}; Swagger: /docs`);
  if (!config.apiKey)
    console.warn(
      "Set OPENAI_API_KEY in .env, then restart to enable readiness and optimization.",
    );
}
main().catch(() => {
  console.error("Startup failed. Check configuration and port availability.");
  process.exitCode = 1;
});
