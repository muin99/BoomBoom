import OpenAI from "openai";
import { APP_CONFIG } from "../../config/configuration.module";
import { Config } from "../../config/environment";

export const OPENAI_CLIENT = Symbol("OPENAI_CLIENT");

export const openAiClientProvider = {
  provide: OPENAI_CLIENT,
  inject: [APP_CONFIG],
  useFactory: (config: Config): OpenAI | null =>
    config.apiKey
      ? new OpenAI({
          apiKey: config.apiKey,
          timeout: config.timeout,
          maxRetries: 0,
        })
      : null,
};
