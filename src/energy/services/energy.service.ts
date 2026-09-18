import { Inject, Injectable } from "@nestjs/common";
import {
  NOTE_INTERPRETER,
  NoteInterpreter,
} from "../../interpretation/interfaces/note-interpreter.interface";
import { DirectiveValidatorService } from "../../interpretation/services/directive-validator.service";
import { OptimizeEnergyRequestDto } from "../dto/optimize-energy-request.dto";
import { OptimizeEnergyResponseDto } from "../dto/optimize-energy-response.dto";
import { EnergyOptimizerService } from "./energy-optimizer.service";
import { PlanReplayService } from "./plan-replay.service";

@Injectable()
export class EnergyService {
  constructor(
    @Inject(NOTE_INTERPRETER) private readonly interpreter: NoteInterpreter,
    private readonly directiveValidator: DirectiveValidatorService,
    private readonly optimizer: EnergyOptimizerService,
    private readonly planReplay: PlanReplayService,
  ) {}

  async optimize(
    scenario: OptimizeEnergyRequestDto,
  ): Promise<OptimizeEnergyResponseDto> {
    const interpreted = await this.interpreter.interpret(scenario);
    const directives = this.directiveValidator.validate(
      { directive_interpretation: interpreted },
      scenario,
    );
    const plan = this.optimizer.optimize(scenario, directives);
    return this.planReplay.verify(scenario, plan);
  }
}
