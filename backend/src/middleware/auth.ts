import type { AuthUser, Role } from "@greenflow/shared";
import { ERROR_CODES, SESSION_COOKIE_NAME } from "@greenflow/shared";
import type { RequestHandler } from "express";

import { auth } from "../config/firebase.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { getUserFromCache } from "../modules/users/user-cache.js";
import { toAuthUser } from "../modules/users/user-document.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

/**
 * Memverifikasi cookie sesi lalu mengambil peran/status terbaru dari cache
 * pengguna (AD-04). Klaim hanya cermin; dokumen Firestore tetap sumber benar.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (typeof token !== "string" || token.length === 0) {
    throw AppError.unauthorized(ERROR_CODES.E04);
  }

  let uid: string;
  try {
    const decoded = await auth.verifySessionCookie(token, true);
    uid = decoded.uid;
  } catch (error) {
    logger.debug({ err: error }, "cookie sesi tidak valid");
    throw AppError.unauthorized(ERROR_CODES.E04);
  }

  const user = await getUserFromCache(uid);
  if (!user || user.status !== "aktif") {
    throw AppError.unauthorized(ERROR_CODES.E04);
  }

  req.user = toAuthUser(user);
  next();
};

export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      throw AppError.unauthorized(ERROR_CODES.E04);
    }
    if (req.user.peran !== role) {
      throw AppError.forbidden();
    }
    next();
  };
}
