import { HttpException, Injectable, PipeTransform } from "@nestjs/common";
import {
  OptimizeEnergyRequestDto,
  requestSchema,
} from "../dto/optimize-energy-request.dto";

@Injectable()
export class OptimizeEnergyRequestPipe implements PipeTransform<
  unknown,
  OptimizeEnergyRequestDto
> {
  transform(value: unknown): OptimizeEnergyRequestDto {
    const parsed = requestSchema.safeParse(value);
    if (!parsed.success)
      throw new HttpException({ error: "INVALID_REQUEST" }, 400);

    const { battery } = parsed.data;
    if (
      battery.minimum_energy_kwh > battery.initial_energy_kwh ||
      battery.initial_energy_kwh > battery.capacity_kwh
    ) {
      throw new HttpException({ error: "INVALID_BATTERY_BOUNDS" }, 422);
    }
    return parsed.data;
  }
}
