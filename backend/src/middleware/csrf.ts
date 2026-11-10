import type { RequestHandler } from "express";

import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Pertahanan CSRF berlapis (architecture 8.4): cookie SameSite=Strict,
 * Origin harus sama dengan APP_ORIGIN, header X-Requested-With wajib, dan
 * body hanya boleh JSON.
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (origin !== env.APP_ORIGIN) {
    throw AppError.forbidden();
  }

  if (req.get("x-requested-with") !== "XMLHttpRequest") {
    throw AppError.forbidden();
  }

  const contentLength = Number(req.get("content-length") ?? "0");
  if (contentLength > 0) {
    const contentType = req.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      throw AppError.badRequest(undefined, "Permintaan harus berformat JSON.");
    }
  }

  next();
};
