import { z } from "zod";
import { nonNegativeNumber as number } from "../../common/validation/value.schemas";

export const planHourSchema = z.strictObject({
  hour: z.number().int().min(0).max(23),
  grid_kwh: number,
  solar_used_kwh: number,
  battery_action: z.enum(["charge", "discharge", "idle"]),
  battery_kwh: number,
  battery_energy_after_kwh: number,
});

export type PlanHour = z.infer<typeof planHourSchema>;
