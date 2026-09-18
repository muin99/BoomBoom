import type solver from "javascript-lp-solver";
import { OptimizeEnergyRequestDto } from "../dto/optimize-energy-request.dto";
import { Directive } from "../../interpretation/models/directive.model";

export function effectiveLimits(
  scenario: OptimizeEnergyRequestDto,
  directives: Directive[],
) {
  const rows = [...scenario.hours].sort((a, b) => a.hour - b.hour);
  const limits = rows.map((h) => ({
    solar: h.solar_kwh,
    reserve: scenario.battery.minimum_energy_kwh,
    charge: scenario.battery.max_charge_kwh_per_hour,
    discharge: scenario.battery.max_discharge_kwh_per_hour,
    grid: h.demand_kwh + scenario.battery.max_charge_kwh_per_hour,
  }));
  for (const directive of directives) {
    if (directive.directive_type === "no_op") continue;
    for (const h of directive.structured_adjustment.hours) {
      const limit = limits[h];
      switch (directive.directive_type) {
        case "solar_reduction":
          limit.solar = Math.min(
            limit.solar,
            rows[h].solar_kwh * directive.structured_adjustment.factor,
          );
          break;
        case "minimum_battery_reserve":
          limit.reserve = Math.max(
            limit.reserve,
            directive.structured_adjustment.minimum_energy_kwh,
          );
          break;
        case "no_charge_window":
          limit.charge = 0;
          break;
        case "no_discharge_window":
          limit.discharge = 0;
          break;
        case "max_grid_window":
          limit.grid = Math.min(
            limit.grid,
            directive.structured_adjustment.max_grid_kwh,
          );
          break;
      }
    }
  }
  return { rows, limits };
}

/** Build the continuous 24-hour LP. No discretization or greedy decisions. */
export function buildEnergyLinearProgram(
  scenario: OptimizeEnergyRequestDto,
  directives: Directive[],
) {
  const { rows, limits } = effectiveLimits(scenario, directives);
  const battery = scenario.battery;
  const model: Parameters<typeof solver.Solve>[0] = {
    optimize: "cost",
    opType: "min",
    constraints: {},
    variables: {},
  };
  // Only grid, used solar and end-of-hour stored energy are variables. Their difference
  // defines ONE signed battery action, so simultaneous charge/discharge is impossible.
  for (let h = 0; h < 24; h++) {
    const limit = limits[h];
    model.constraints[`balance${h}`] = {
      equal: rows[h].demand_kwh - (h === 0 ? battery.initial_energy_kwh : 0),
    };
    model.constraints[`rate${h}`] = {
      min: (h === 0 ? battery.initial_energy_kwh : 0) - limit.discharge,
      max: (h === 0 ? battery.initial_energy_kwh : 0) + limit.charge,
    };
    model.constraints[`energy${h}`] = {
      min: limit.reserve,
      max: battery.capacity_kwh,
    };
    model.constraints[`solar${h}`] = { max: limit.solar };
    model.constraints[`grid${h}`] = { max: limit.grid };
    model.variables[`g${h}`] = {
      cost: rows[h].tariff_bdt_per_kwh,
      [`balance${h}`]: 1,
      [`grid${h}`]: 1,
    };
    model.variables[`scenario${h}`] = {
      cost: 0,
      [`balance${h}`]: 1,
      [`solar${h}`]: 1,
    };
    model.variables[`e${h}`] = {
      cost: 0,
      [`balance${h}`]: -1,
      [`rate${h}`]: 1,
      [`energy${h}`]: 1,
      ...(h < 23
        ? { [`balance${h + 1}`]: 1, [`rate${h + 1}`]: -1 }
        : { terminal: 1 }),
    };
  }
  model.constraints.terminal = { equal: battery.initial_energy_kwh };
  return { model, rows };
}
