import { z } from "zod";
import { nonNegativeNumber as number } from "../../common/validation/value.schemas";

export const hourSchema = z.strictObject({
  hour: z.number().int().min(0).max(23),
  demand_kwh: number,
  solar_kwh: number,
  tariff_bdt_per_kwh: number,
});
export const batterySchema = z.strictObject({
  capacity_kwh: number,
  initial_energy_kwh: number,
  minimum_energy_kwh: number,
  max_charge_kwh_per_hour: number,
  max_discharge_kwh_per_hour: number,
});

export type EnergyHour = z.infer<typeof hourSchema>;
export type Battery = z.infer<typeof batterySchema>;
