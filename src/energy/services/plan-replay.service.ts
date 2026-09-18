import { Injectable } from "@nestjs/common";
import { OptimizeEnergyRequestDto } from "../dto/optimize-energy-request.dto";
import {
  OptimizeEnergyResponseDto,
  responseSchema,
} from "../dto/optimize-energy-response.dto";
import { Directive } from "../../interpretation/models/directive.model";
import { DirectiveValidatorService } from "../../interpretation/services/directive-validator.service";

@Injectable()
export class PlanReplayService {
  constructor(private readonly directiveValidator: DirectiveValidatorService) {}

  // Deliberately checks original directives directly; it does not trust optimizer bounds.
  verify(
    scenario: OptimizeEnergyRequestDto,
    raw: unknown,
    groundTruth?: Directive[],
    tolerance = 1e-5,
  ): OptimizeEnergyResponseDto {
    const plan = responseSchema.parse(raw);
    this.directiveValidator.validate(
      { directive_interpretation: plan.directive_interpretation },
      scenario,
    );
    const directives = groundTruth ?? plan.directive_interpretation;
    const check = (ok: boolean, rule: string) => {
      if (!ok) throw new Error(`Replay failed: ${rule}`);
    };
    const near = (a: number, b: number) => Math.abs(a - b) <= tolerance;
    check(plan.scenario_id === scenario.scenario_id, "scenario_id");
    const inputs = new Map(scenario.hours.map((hour) => [hour.hour, hour]));
    let energy = scenario.battery.initial_energy_kwh,
      grid = 0,
      cost = 0,
      peak = 0;
    plan.hourly_plan.forEach((hour, index) => {
      check(hour.hour === index, "24 ordered unique hours");
      const original = inputs.get(hour.hour)!;
      const charge = hour.battery_action === "charge" ? hour.battery_kwh : 0;
      const discharge =
        hour.battery_action === "discharge" ? hour.battery_kwh : 0;
      check(
        hour.battery_action !== "idle" || hour.battery_kwh === 0,
        "idle magnitude",
      );
      check(
        charge <= scenario.battery.max_charge_kwh_per_hour + tolerance,
        "charge rate",
      );
      check(
        discharge <= scenario.battery.max_discharge_kwh_per_hour + tolerance,
        "discharge rate",
      );
      energy += charge - discharge;
      check(near(energy, hour.battery_energy_after_kwh), "battery transition");
      check(
        energy >= scenario.battery.minimum_energy_kwh - tolerance &&
          energy <= scenario.battery.capacity_kwh + tolerance,
        "battery bounds",
      );
      let solar = original.solar_kwh;
      for (const directive of directives) {
        if (
          directive.directive_type === "no_op" ||
          !directive.structured_adjustment.hours.includes(hour.hour)
        )
          continue;
        switch (directive.directive_type) {
          case "solar_reduction":
            solar = Math.min(
              solar,
              original.solar_kwh * directive.structured_adjustment.factor,
            );
            break;
          case "minimum_battery_reserve":
            check(
              energy >=
                directive.structured_adjustment.minimum_energy_kwh - tolerance,
              "directive reserve",
            );
            break;
          case "no_charge_window":
            check(charge <= tolerance, "no charge");
            break;
          case "no_discharge_window":
            check(discharge <= tolerance, "no discharge");
            break;
          case "max_grid_window":
            check(
              hour.grid_kwh <=
                directive.structured_adjustment.max_grid_kwh + tolerance,
              "grid cap",
            );
            break;
        }
      }
      check(hour.solar_used_kwh <= solar + tolerance, "effective solar");
      check(
        near(
          hour.grid_kwh + hour.solar_used_kwh + discharge,
          original.demand_kwh + charge,
        ),
        "energy balance",
      );
      grid += hour.grid_kwh;
      cost += hour.grid_kwh * original.tariff_bdt_per_kwh;
      peak = Math.max(peak, hour.grid_kwh);
    });
    check(
      near(energy, scenario.battery.initial_energy_kwh),
      "end-of-day neutrality",
    );
    check(near(grid, plan.total_grid_kwh), "total grid");
    check(near(cost, plan.total_cost_bdt), "total cost");
    check(near(peak, plan.peak_grid_kwh), "peak grid");
    return plan;
  }
}
