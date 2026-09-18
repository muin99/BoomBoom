import { Injectable } from "@nestjs/common";
import { OptimizeEnergyRequestDto } from "../../energy/dto/optimize-energy-request.dto";
import { Directive, interpretationSchema } from "../models/directive.model";

@Injectable()
export class DirectiveValidatorService {
  validate(raw: unknown, scenario: OptimizeEnergyRequestDto): Directive[] {
    const { directive_interpretation: entries } =
      interpretationSchema.parse(raw);
    if (entries.length !== scenario.operator_notes.length)
      throw new Error("Note coverage mismatch");
    entries.forEach((d, index) => {
      if (d.note_index !== index)
        throw new Error("Note mappings must be ordered and complete");
      if (!d.explanation.trim()) throw new Error("Blank explanation");
      if (d.directive_type === "no_op") return;
      const h = d.structured_adjustment.hours;
      if (h.some((hour, i) => i > 0 && hour <= h[i - 1]))
        throw new Error("Hours must be unique and ascending");
      if (
        d.directive_type === "minimum_battery_reserve" &&
        d.structured_adjustment.minimum_energy_kwh >
          scenario.battery.capacity_kwh
      ) {
        throw new Error("Reserve exceeds capacity");
      }
    });
    return entries;
  }
}
