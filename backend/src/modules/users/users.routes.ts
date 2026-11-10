import { Router } from "express";

import { requireAuth, requireRole } from "../../middleware/auth.js";
import { apiLimiter } from "../../middleware/rate-limit.js";
import {
  createUserHandler,
  deleteUserHandler,
  disableUserHandler,
  enableUserHandler,
  getUserHandler,
  listUsersHandler,
  resetPasswordHandler,
  updateUserHandler,
} from "./users.controller.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("admin"), apiLimiter);

usersRouter.get("/", listUsersHandler);
usersRouter.post("/", createUserHandler);
usersRouter.get("/:id", getUserHandler);
usersRouter.patch("/:id", updateUserHandler);
usersRouter.delete("/:id", deleteUserHandler);
usersRouter.post("/:id/disable", disableUserHandler);
usersRouter.post("/:id/enable", enableUserHandler);
usersRouter.post("/:id/reset-password", resetPasswordHandler);
