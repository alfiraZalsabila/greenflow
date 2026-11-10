import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from "@greenflow/shared";
import type { Request, RequestHandler } from "express";

import { AppError } from "../../lib/errors.js";
import { parseInput } from "../../lib/validate.js";
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  setUserStatus,
  triggerPasswordReset,
  updateUser,
} from "./users.service.js";

function idParam(req: Request): string {
  const id = req.params.id;
  if (typeof id !== "string" || id.length === 0) {
    throw AppError.notFound("Akun tidak ditemukan.");
  }
  return id;
}

export const listUsersHandler: RequestHandler = async (req, res) => {
  const query = parseInput(listUsersQuerySchema, req.query);
  const users = await listUsers(query);
  res.json({ users });
};

export const getUserHandler: RequestHandler = async (req, res) => {
  const user = await getUser(idParam(req));
  res.json({ user });
};

export const createUserHandler: RequestHandler = async (req, res) => {
  const input = parseInput(createUserSchema, req.body);
  const user = await createUser(input, req.user!);
  res.status(201).json({ user });
};

export const updateUserHandler: RequestHandler = async (req, res) => {
  const input = parseInput(updateUserSchema, req.body);
  const user = await updateUser(idParam(req), input, req.user!);
  res.json({ user });
};

export const deleteUserHandler: RequestHandler = async (req, res) => {
  await deleteUser(idParam(req), req.user!);
  res.status(204).end();
};

export const disableUserHandler: RequestHandler = async (req, res) => {
  const user = await setUserStatus(idParam(req), "nonaktif", req.user!);
  res.json({ user });
};

export const enableUserHandler: RequestHandler = async (req, res) => {
  const user = await setUserStatus(idParam(req), "aktif", req.user!);
  res.json({ user });
};

export const resetPasswordHandler: RequestHandler = async (req, res) => {
  await triggerPasswordReset(idParam(req), req.user!);
  res.json({ ok: true });
};
