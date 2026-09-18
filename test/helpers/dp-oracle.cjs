/** Independent test-only oracle. Enumerates battery states on an exact energy lattice.
 * It imports no application code and constructs no LP. Fixtures must lie on quantum.
 */
function optimalCostByDynamicProgramming(scenario, directives, quantum = 1) {
  const battery = scenario.battery;
  const capacity = Math.round(battery.capacity_kwh / quantum);
  const initial = Math.round(battery.initial_energy_kwh / quantum);
  let costs = new Map([[initial, 0]]);
  const hours = [...scenario.hours].sort(
    (left, right) => left.hour - right.hour,
  );

  for (const hour of hours) {
    let solar = hour.solar_kwh;
    let reserve = battery.minimum_energy_kwh;
    let chargeLimit = battery.max_charge_kwh_per_hour;
    let dischargeLimit = battery.max_discharge_kwh_per_hour;
    let gridLimit = Infinity;
    for (const directive of directives) {
      const adjustment = directive.structured_adjustment;
      if (!directive.applies || !adjustment.hours.includes(hour.hour)) continue;
      switch (directive.directive_type) {
        case "solar_reduction":
          solar = Math.min(solar, hour.solar_kwh * adjustment.factor);
          break;
        case "minimum_battery_reserve":
          reserve = Math.max(reserve, adjustment.minimum_energy_kwh);
          break;
        case "no_charge_window":
          chargeLimit = 0;
          break;
        case "no_discharge_window":
          dischargeLimit = 0;
          break;
        case "max_grid_window":
          gridLimit = Math.min(gridLimit, adjustment.max_grid_kwh);
          break;
      }
    }
    const next = new Map();
    for (const [before, cost] of costs) {
      for (let after = 0; after <= capacity; after++) {
        const change = (after - before) * quantum;
        if (
          after * quantum < reserve - 1e-9 ||
          change > chargeLimit + 1e-9 ||
          -change > dischargeLimit + 1e-9
        )
          continue;
        const needed = hour.demand_kwh + change;
        if (needed < -1e-9) continue; // Battery cannot export or dump energy.
        const grid = Math.max(0, needed - solar);
        if (grid > gridLimit + 1e-9) continue;
        const candidate = cost + grid * hour.tariff_bdt_per_kwh;
        next.set(after, Math.min(next.get(after) ?? Infinity, candidate));
      }
    }
    costs = next;
  }
  return costs.get(initial) ?? Infinity;
}

module.exports = { optimalCostByDynamicProgramming };
