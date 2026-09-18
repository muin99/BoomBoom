import { Module } from "@nestjs/common";
import { ConfigurationModule } from "./config/configuration.module";
import { EnergyModule } from "./energy/energy.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [ConfigurationModule, HealthModule, EnergyModule],
})
export class AppModule {}
