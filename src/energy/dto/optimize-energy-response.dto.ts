import { z } from "zod";
import {
  nonNegativeNumber as number,
  nonBlankText as text,
} from "../../common/validation/value.schemas";
import { directiveSchema } from "../../interpretation/models/directive.model";
import { planHourSchema } from "../models/plan.model";

export const responseSchema = z.strictObject({
  scenario_id: text,
  directive_interpretation: z.array(directiveSchema).min(1).max(3),
  hourly_plan: z.array(planHourSchema).length(24),
  total_grid_kwh: number,
  total_cost_bdt: number,
  peak_grid_kwh: number,
  plan_summary: text,
});

export type OptimizeEnergyResponseDto = z.infer<typeof responseSchema>;
