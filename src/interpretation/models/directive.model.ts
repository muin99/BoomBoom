import { z } from "zod";
import { nonNegativeNumber as number } from "../../common/validation/value.schemas";

const hours = z.array(z.number().int().min(0).max(23)).min(1).max(24);
const base = {
  note_index: z.number().int().min(0).max(2),
  explanation: z.string().min(1),
};
export const directiveSchema = z.discriminatedUnion("directive_type", [
  z.strictObject({
    ...base,
    applies: z.literal(true),
    directive_type: z.literal("solar_reduction"),
    structured_adjustment: z.strictObject({ hours, factor: number.max(1) }),
  }),
  z.strictObject({
    ...base,
    applies: z.literal(true),
    directive_type: z.literal("minimum_battery_reserve"),
    structured_adjustment: z.strictObject({
      hours,
      minimum_energy_kwh: number,
    }),
  }),
  z.strictObject({
    ...base,
    applies: z.literal(true),
    directive_type: z.literal("no_charge_window"),
    structured_adjustment: z.strictObject({ hours }),
  }),
  z.strictObject({
    ...base,
    applies: z.literal(true),
    directive_type: z.literal("no_discharge_window"),
    structured_adjustment: z.strictObject({ hours }),
  }),
  z.strictObject({
    ...base,
    applies: z.literal(true),
    directive_type: z.literal("max_grid_window"),
    structured_adjustment: z.strictObject({ hours, max_grid_kwh: number }),
  }),
  z.strictObject({
    ...base,
    applies: z.literal(false),
    directive_type: z.literal("no_op"),
    structured_adjustment: z.null(),
  }),
]);
export const interpretationSchema = z.strictObject({
  directive_interpretation: z.array(directiveSchema).min(1).max(3),
});

export type Directive = z.infer<typeof directiveSchema>;
