import { Module } from "@nestjs/common";
import { InterpretationModule } from "../interpretation/interpretation.module";
import { EnergyController } from "./energy.controller";
import { OptimizeEnergyRequestPipe } from "./pipes/optimize-energy-request.pipe";
import { EnergyService } from "./services/energy.service";
import { EnergyOptimizerService } from "./services/energy-optimizer.service";
import { PlanReplayService } from "./services/plan-replay.service";

@Module({
  imports: [InterpretationModule],
  controllers: [EnergyController],
  providers: [
    OptimizeEnergyRequestPipe,
    EnergyService,
    EnergyOptimizerService,
    PlanReplayService,
  ],
})
export class EnergyModule {}
