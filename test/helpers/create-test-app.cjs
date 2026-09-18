require("reflect-metadata");
const { Test } = require("@nestjs/testing");
const { AppModule } = require("../../dist/app.module");
const { configureApp } = require("../../dist/bootstrap");
const { APP_CONFIG } = require("../../dist/config/configuration.module");
const {
  NOTE_INTERPRETER,
} = require("../../dist/interpretation/interfaces/note-interpreter.interface");

async function createTestApp({ config, interpreter } = {}) {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (config) builder.overrideProvider(APP_CONFIG).useValue(config);
  if (interpreter)
    builder.overrideProvider(NOTE_INTERPRETER).useValue(interpreter);
  const module = await builder.compile();
  return configureApp(module.createNestApplication({ logger: false }));
}

module.exports = { createTestApp };
