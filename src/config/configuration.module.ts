import { Global, Module } from "@nestjs/common";
import { readConfig } from "./environment";

export const APP_CONFIG = Symbol("APP_CONFIG");

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: readConfig }],
  exports: [APP_CONFIG],
})
export class ConfigurationModule {}
