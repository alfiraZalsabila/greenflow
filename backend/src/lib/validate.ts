import type { ZodType } from "zod";

import { AppError } from "./errors.js";

/** Validasi masukan dengan skema shared; galat dipetakan ke E-07. */
export function parseInput<T>(
  schema: ZodType<T>,
  data: unknown,
  message?: string,
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw AppError.badRequest(
      result.error.issues.map((issue) => ({
        field: issue.path.join(".") || undefined,
        issue: issue.message,
      })),
      message,
    );
  }

  return result.data;
}
