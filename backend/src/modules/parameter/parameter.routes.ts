import { Router } from "express";
import { ParameterController } from "./parameter.controller.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

const router = Router();

/**
 * GET /api/v1/parameter/:lahanId
 * Get parameter for a lahan
 */
router.get("/:lahanId", requireAuth, ParameterController.getByLahanId);

/**
 * PUT /api/v1/parameter/:lahanId
 * Update parameter for a lahan (admin only)
 */
router.put("/:lahanId", requireAuth, requireRole("admin"), ParameterController.update);

export default router;
