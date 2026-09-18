import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { errorSchema } from "../common/swagger/error.schema";
import { HealthService } from "./health.service";

@ApiTags("GridWise")
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}
  @Get("health")
  @ApiOperation({
    summary:
      "Readiness; confirms server configuration, not live provider quota",
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: "object",
      required: ["status"],
      properties: { status: { type: "string", enum: ["ok"] } },
    },
  })
  @ApiResponse({
    status: 500,
    description: "OpenAI key not configured",
    schema: errorSchema,
  })
  health() {
    return this.healthService.checkReadiness();
  }
}
