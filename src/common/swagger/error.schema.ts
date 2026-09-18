export const errorSchema = {
  type: "object" as const,
  required: ["statusCode", "error"],
  properties: {
    statusCode: { type: "integer" as const },
    error: { type: "string" as const },
  },
};
