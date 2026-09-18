import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { apiSchema } from "../common/swagger/openapi-schema";
import { errorSchema } from "../common/swagger/error.schema";
import {
  OptimizeEnergyRequestDto,
  requestSchema,
} from "./dto/optimize-energy-request.dto";
import { responseSchema } from "./dto/optimize-energy-response.dto";
import { OptimizeEnergyRequestPipe } from "./pipes/optimize-energy-request.pipe";
import { EnergyService } from "./services/energy.service";

@ApiTags("GridWise")
@Controller()
export class EnergyController {
  constructor(private readonly energyService: EnergyService) {}
  @Post("optimize-energy")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Interpret 1–3 operator notes and return a minimum-cost 24-hour schedule",
    description:
      "OpenAI structured extraction → deterministic guardrails → linear program → independent schedule replay. No authentication required. All energy units are kWh, currency BDT. Windows include start and exclude end.",
  })
  @ApiBody({ schema: apiSchema(requestSchema) })
  @ApiResponse({ status: 200, schema: apiSchema(responseSchema) })
  @ApiResponse({
    status: 400,
    description: "Malformed JSON or invalid request structure",
    schema: errorSchema,
  })
  @ApiResponse({
    status: 422,
    description: "Invalid battery bounds or infeasible constraints",
    schema: errorSchema,
  })
  @ApiResponse({
    status: 500,
    description: "Controlled model/provider/internal failure",
    schema: errorSchema,
  })
  optimize(@Body(OptimizeEnergyRequestPipe) request: OptimizeEnergyRequestDto) {
    return this.energyService.optimize(request);
  }
}
