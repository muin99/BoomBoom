import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { APP_CONFIG } from "./config/configuration.module";
import { Config } from "./config/environment";
import { SafeExceptionFilter } from "./common/filters/safe-exception.filter";
import { setupSwagger } from "./common/swagger/setup-swagger";

/** Shared by production bootstrap and Nest's test application. */
export function configureApp(app: INestApplication) {
  app.useGlobalFilters(new SafeExceptionFilter());
  const document = setupSwagger(app);
  return { app, document, config: app.get<Config>(APP_CONFIG) };
}

export async function createApp(options: { quiet?: boolean } = {}) {
  const app = await NestFactory.create(AppModule, {
    logger: options.quiet ? false : ["log", "warn"],
  });
  return configureApp(app);
}
