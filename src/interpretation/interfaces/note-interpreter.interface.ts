import { OptimizeEnergyRequestDto } from "../../energy/dto/optimize-energy-request.dto";
import { Directive } from "../models/directive.model";

export const NOTE_INTERPRETER = Symbol("NOTE_INTERPRETER");

/** The energy and health features depend on this contract, not the OpenAI SDK. */
export interface NoteInterpreter {
  ready(): boolean;
  interpret(scenario: OptimizeEnergyRequestDto): Promise<Directive[]>;
}
