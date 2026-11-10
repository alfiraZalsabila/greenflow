import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { apiLimiter } from "../../middleware/rate-limit.js";
import {
  changePasswordHandler,
  updateProfileHandler,
} from "./profile.controller.js";

export const profileRouter = Router();

profileRouter.use(requireAuth, apiLimiter);

profileRouter.patch("/", updateProfileHandler);
profileRouter.post("/change-password", changePasswordHandler);
