import { z } from "zod";

export const nonNegativeNumber = z.number().finite().nonnegative();
export const nonBlankText = z
  .string()
  .refine((value) => value.trim().length > 0, "Must not be blank");
