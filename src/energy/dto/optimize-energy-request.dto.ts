import { z } from "zod";
import { nonBlankText as text } from "../../common/validation/value.schemas";
import { hourSchema, batterySchema } from "../models/scenario.model";

export const requestSchema = z.strictObject({
  scenario_id: text,
  operator_notes: z.array(text).min(1).max(3),
  hours: z
    .array(hourSchema)
    .length(24)
    .refine(
      (h) => new Set(h.map((x) => x.hour)).size === 24,
      "Exactly one entry for each hour 0 through 23 is required",
    ),
  battery: batterySchema,
});

export type OptimizeEnergyRequestDto = z.infer<typeof requestSchema>;
