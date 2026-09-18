import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { InterpretationFailure } from "../../interpretation/errors/interpretation-failure.error";
import { InfeasibleScenario } from "../../energy/errors/infeasible-scenario.error";

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    // Never echo request bodies, model output, credentials, arbitrary exception text or stacks.
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const known = error.getResponse();
      const code =
        typeof known === "object" && known && "error" in known
          ? String(known.error)
          : status === 404
            ? "NOT_FOUND"
            : "INVALID_REQUEST";
      response.status(status).json({ statusCode: status, error: code });
    } else if (error instanceof InterpretationFailure) {
      response.status(500).json({ statusCode: 500, error: error.code });
    } else if (error instanceof InfeasibleScenario) {
      response
        .status(422)
        .json({ statusCode: 422, error: "INFEASIBLE_SCENARIO" });
    } else {
      // Express JSON parsing errors are not Nest HttpExceptions.
      const parseError =
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        error.type === "entity.parse.failed";
      response.status(parseError ? 400 : 500).json({
        statusCode: parseError ? 400 : 500,
        error: parseError ? "MALFORMED_JSON" : "INTERNAL_ERROR",
      });
    }
  }
}
