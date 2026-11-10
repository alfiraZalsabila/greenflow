import { ERROR_CODES, ERROR_MESSAGES } from "@greenflow/shared";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Request } from "express";

const message = {
  error: {
    code: ERROR_CODES.RATE_LIMITED,
    message: ERROR_MESSAGES[ERROR_CODES.RATE_LIMITED],
  },
};

function emailFromBody(req: Request): string {
  const body: unknown = req.body;
  if (typeof body === "object" && body !== null && "email" in body) {
    const email = (body as { email: unknown }).email;
    if (typeof email === "string") return email.trim().toLowerCase();
  }
  return "";
}

/** 5 percobaan/menit per (IP + email) — architecture 8.4. */
export const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip ?? "unknown")}:${emailFromBody(req)}`,
});

/** 10 pendaftaran/jam per IP. */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
});

/** 5 permintaan reset sandi/jam per IP. */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
});

/** Batas umum API setelah autentikasi: 300/menit per pengguna. */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
  keyGenerator: (req) =>
    req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip ?? "unknown"),
});

/** Batas longgar untuk endpoint publik/health agar tidak mudah disalahgunakan. */
export const publicLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
});
