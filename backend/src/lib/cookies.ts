import type { CookieOptions, Response } from "express";

import { SESSION_COOKIE_NAME } from "@greenflow/shared";

import { env, isProduction } from "../config/env.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: env.SESSION_COOKIE_DAYS * DAY_MS,
  };
}

export function setSessionCookie(res: Response, value: string): void {
  res.cookie(SESSION_COOKIE_NAME, value, sessionCookieOptions());
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
  });
}

export function sessionExpiresInMs(): number {
  return env.SESSION_COOKIE_DAYS * DAY_MS;
}
