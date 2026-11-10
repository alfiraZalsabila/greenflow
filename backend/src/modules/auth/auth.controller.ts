import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  SESSION_COOKIE_NAME,
} from "@greenflow/shared";
import type { RequestHandler } from "express";

import { parseInput } from "../../lib/validate.js";
import {
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  register,
} from "./auth.service.js";

export const registerHandler: RequestHandler = async (req, res) => {
  const input = parseInput(registerSchema, req.body);
  const user = await register(input, res);
  res.status(201).json({ user });
};

export const loginHandler: RequestHandler = async (req, res) => {
  const input = parseInput(loginSchema, req.body);
  const user = await login(input, res);
  res.json({ user });
};

export const logoutHandler: RequestHandler = async (req, res) => {
  if (req.user) await logout(req.user.id, res);
  else res.clearCookie(SESSION_COOKIE_NAME);
  res.status(204).end();
};

export const forgotPasswordHandler: RequestHandler = async (req, res) => {
  const input = parseInput(forgotPasswordSchema, req.body);
  await forgotPassword(input);
  res.json({ ok: true });
};

export const meHandler: RequestHandler = async (req, res) => {
  const user = await getCurrentUser(req.user!.id);
  res.json({ user });
};
