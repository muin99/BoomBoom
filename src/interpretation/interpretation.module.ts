import { Module } from "@nestjs/common";
import { NOTE_INTERPRETER } from "./interfaces/note-interpreter.interface";
import { openAiClientProvider } from "./providers/openai-client.provider";
import { DirectiveValidatorService } from "./services/directive-validator.service";
import { InterpretationCacheService } from "./services/interpretation-cache.service";
import { OpenAiInterpreterService } from "./services/openai-interpreter.service";

@Module({
  providers: [
    openAiClientProvider,
    DirectiveValidatorService,
    InterpretationCacheService,
    OpenAiInterpreterService,
    { provide: NOTE_INTERPRETER, useExisting: OpenAiInterpreterService },
  ],
  exports: [NOTE_INTERPRETER, DirectiveValidatorService],
})
export class InterpretationModule {}
