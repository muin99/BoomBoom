import { Injectable } from "@nestjs/common";
import solver from "javascript-lp-solver";
import { OptimizeEnergyRequestDto } from "../dto/optimize-energy-request.dto";
import { OptimizeEnergyResponseDto } from "../dto/optimize-energy-response.dto";
import { Directive } from "../../interpretation/models/directive.model";
import { InfeasibleScenario } from "../errors/infeasible-scenario.error";
import { buildEnergyLinearProgram } from "../optimization/energy-lp.model";

// Preserve precision; totals use the actual serialized hourly values.
const clean = (value: number) =>
  Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(9));

@Injectable()
export class EnergyOptimizerService {
  optimize(
    scenario: OptimizeEnergyRequestDto,
    directives: Directive[],
  ): OptimizeEnergyResponseDto {
    const { model, rows } = buildEnergyLinearProgram(scenario, directives);
    const battery = scenario.battery;
    const result = solver.Solve(model, 1e-9) as {
      feasible: boolean;
      bounded: boolean;
      result: number;
      [key: string]: number | boolean;
    };
    if (!result.feasible)
      throw new InfeasibleScenario(
        "No feasible schedule satisfies all constraints",
      );
    if (!result.bounded || !Number.isFinite(result.result))
      throw new Error("Solver failed");
    let before = battery.initial_energy_kwh;
    const hourly_plan = rows.map((row, h) => {
      const after = clean(Number(result[`e${h}`] ?? 0));
      const change = clean(after - before);
      before = after;
      return {
        hour: h,
        grid_kwh: clean(Number(result[`g${h}`] ?? 0)),
        solar_used_kwh: clean(Number(result[`s${h}`] ?? 0)),
        battery_action:
          change > 0
            ? ("charge" as const)
            : change < 0
              ? ("discharge" as const)
              : ("idle" as const),
        battery_kwh: Math.abs(change),
        battery_energy_after_kwh: after,
      };
    });
    const total_cost_bdt = hourly_plan.reduce(
      (sum, h) => sum + h.grid_kwh * rows[h.hour].tariff_bdt_per_kwh,
      0,
    );
    const applied = directives.filter((d) => d.applies).length;
    return {
      scenario_id: scenario.scenario_id,
      directive_interpretation: directives,
      hourly_plan,
      total_grid_kwh: hourly_plan.reduce((sum, h) => sum + h.grid_kwh, 0),
      total_cost_bdt,
      peak_grid_kwh: Math.max(...hourly_plan.map((h) => h.grid_kwh)),
      plan_summary: `Minimum-cost 24-hour plan applies ${applied} operator directive(s) and ignores ${directives.length - applied} irrelevant note(s). Grid cost is ${total_cost_bdt.toFixed(2)} BDT; final battery energy returns to ${battery.initial_energy_kwh} kWh. Solar curtailment and battery shifts respect all active limits.`,
    };
  }
}
