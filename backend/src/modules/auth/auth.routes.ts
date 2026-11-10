import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import {
  forgotPasswordLimiter,
  loginLimiter,
  publicLimiter,
  registerLimiter,
} from "../../middleware/rate-limit.js";
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.use(publicLimiter);

authRouter.post("/register", registerLimiter, registerHandler);
authRouter.post("/login", loginLimiter, loginHandler);
authRouter.post("/forgot-password", forgotPasswordLimiter, forgotPasswordHandler);
authRouter.get("/me", requireAuth, meHandler);
authRouter.post("/logout", requireAuth, logoutHandler);
