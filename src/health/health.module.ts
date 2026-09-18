import { Module } from "@nestjs/common";
import { InterpretationModule } from "../interpretation/interpretation.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [InterpretationModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
