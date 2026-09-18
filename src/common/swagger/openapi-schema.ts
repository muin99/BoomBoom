import { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { z } from "zod";

/** Swagger and request validation use the same schema to prevent contract drift. */
export function apiSchema(schema: z.ZodType): SchemaObject {
  const { $schema, ...result } = z.toJSONSchema(schema, {
    target: "openapi-3.0",
    unrepresentable: "any",
  });
  return result as SchemaObject;
}
