import { changePasswordSchema, updateProfileSchema } from "@greenflow/shared";
import type { RequestHandler } from "express";

import { parseInput } from "../../lib/validate.js";
import { changePassword } from "../auth/auth.service.js";
import { updateProfile } from "../users/users.service.js";

export const updateProfileHandler: RequestHandler = async (req, res) => {
  const input = parseInput(updateProfileSchema, req.body);
  const user = await updateProfile(req.user!.id, input.nama);
  res.json({ user });
};

export const changePasswordHandler: RequestHandler = async (req, res) => {
  const input = parseInput(changePasswordSchema, req.body);
  await changePassword(req.user!.id, input, res);
  res.json({ ok: true });
};
