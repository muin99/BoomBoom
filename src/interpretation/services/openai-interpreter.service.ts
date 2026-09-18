import { Inject, Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { createHash } from "node:crypto";
import { APP_CONFIG } from "../../config/configuration.module";
import { Config } from "../../config/environment";
import { OptimizeEnergyRequestDto } from "../../energy/dto/optimize-energy-request.dto";
import { Directive, interpretationSchema } from "../models/directive.model";
import { NoteInterpreter } from "../interfaces/note-interpreter.interface";
import { InterpretationFailure } from "../errors/interpretation-failure.error";
import { OPENAI_CLIENT } from "../providers/openai-client.provider";
import {
  INTERPRETER_PROMPT,
  PROMPT_VERSION,
} from "../prompts/operator-notes.prompt";
import { DirectiveValidatorService } from "./directive-validator.service";
import { InterpretationCacheService } from "./interpretation-cache.service";

@Injectable()
export class OpenAiInterpreterService implements NoteInterpreter {
  constructor(
    @Inject(APP_CONFIG) private readonly config: Config,
    @Inject(OPENAI_CLIENT) private readonly client: OpenAI | null,
    private readonly directiveValidator: DirectiveValidatorService,
    private readonly cache: InterpretationCacheService,
  ) {}

  ready(): boolean {
    return this.client !== null;
  }

  async interpret(scenario: OptimizeEnergyRequestDto): Promise<Directive[]> {
    if (!this.client) throw new InterpretationFailure("OPENAI_KEY_MISSING");
    // All numerical context participates in the key; scenario IDs do not.
    const input = JSON.stringify({
      operator_notes: scenario.operator_notes,
      battery: scenario.battery,
      hours: [...scenario.hours].sort((a, b) => a.hour - b.hour),
    });
    const key = createHash("sha256")
      .update(PROMPT_VERSION + this.config.model + input)
      .digest("hex");
    return this.cache.getOrCompute(key, () => this.extract(input, scenario));
  }

  private async extract(
    input: string,
    scenario: OptimizeEnergyRequestDto,
  ): Promise<Directive[]> {
    let code = "LLM_UNAVAILABLE";
    for (let attempt = 0; attempt < this.config.attempts; attempt++) {
      try {
        const response = await this.client!.responses.parse(
          {
            model: this.config.model,
            store: false,
            max_output_tokens: 1600,
            ...(this.config.model.startsWith("gpt-4.1")
              ? { temperature: 0 }
              : {}),
            instructions:
              INTERPRETER_PROMPT +
              (attempt
                ? "\nRe-check note coverage, exact shapes, numeric bounds, and sorted hours carefully."
                : ""),
            input: [{ role: "user", content: input }],
            text: {
              format: zodTextFormat(
                interpretationSchema,
                "gridwise_directives",
              ),
            },
          },
          { signal: AbortSignal.timeout(this.config.timeout) },
        );
        if (response.status !== "completed" || !response.output_parsed) {
          code = "LLM_INVALID_OUTPUT";
          continue;
        }
        try {
          return this.directiveValidator.validate(
            response.output_parsed,
            scenario,
          );
        } catch {
          code = "LLM_INVALID_OUTPUT";
        }
      } catch (error) {
        // Never log provider messages: authentication errors can contain fragments of keys.
        if (
          error instanceof OpenAI.APIError &&
          [401, 403].includes(error.status ?? 0)
        ) {
          throw new InterpretationFailure("OPENAI_AUTH_FAILED");
        }
        if (error instanceof OpenAI.APIError && error.status === 429)
          code = "OPENAI_RATE_LIMIT";
        else if (error instanceof SyntaxError) code = "LLM_INVALID_OUTPUT";
        else code = "LLM_UNAVAILABLE";
        if (
          error instanceof OpenAI.APIError &&
          [400, 404].includes(error.status ?? 0)
        )
          break;
      }
    }
    throw new InterpretationFailure(code);
  }
}
