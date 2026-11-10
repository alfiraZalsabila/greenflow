import type { ErrorRequestHandler } from "express";

import { ERROR_CODES } from "@greenflow/shared";

import { AppError } from "../lib/errors.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  // Galat parser JSON dari express.json() memiliki status 400 dan body.
  if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    (err as { type: unknown }).type === "entity.parse.failed"
  ) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.E07,
        message: "Format JSON tidak valid.",
      },
    });
    return;
  }

  const appError = err instanceof AppError ? err : AppError.internal(err);

  if (!(err instanceof AppError)) {
    req.log.error({ err }, "galat tak tertangani");
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  });
};
