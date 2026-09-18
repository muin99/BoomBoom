import { Inject, Injectable } from "@nestjs/common";
import {
  NOTE_INTERPRETER,
  NoteInterpreter,
} from "../interpretation/interfaces/note-interpreter.interface";
import { InterpretationFailure } from "../interpretation/errors/interpretation-failure.error";

@Injectable()
export class HealthService {
  constructor(
    @Inject(NOTE_INTERPRETER) private readonly interpreter: NoteInterpreter,
  ) {}

  checkReadiness(): { status: "ok" } {
    if (!this.interpreter.ready())
      throw new InterpretationFailure("OPENAI_KEY_MISSING");
    return { status: "ok" };
  }
}
