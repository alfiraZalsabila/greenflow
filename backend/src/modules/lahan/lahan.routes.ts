import { Router } from "express";
import { LahanController } from "./lahan.controller.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

const router = Router();

/**
 * GET /api/v1/lahan
 * List all lahan (public to authenticated users)
 */
router.get("/", requireAuth, LahanController.getAll);

/**
 * POST /api/v1/lahan
 * Create new lahan (admin only)
 */
router.post("/", requireAuth, requireRole("admin"), LahanController.create);

/**
 * GET /api/v1/lahan/:lahanId
 * Get lahan by ID
 */
router.get("/:lahanId", requireAuth, LahanController.getById);

/**
 * PUT /api/v1/lahan/:lahanId
 * Update lahan (admin only)
 */
router.put("/:lahanId", requireAuth, requireRole("admin"), LahanController.update);

/**
 * DELETE /api/v1/lahan/:lahanId
 * Soft delete lahan (admin only)
 */
router.delete("/:lahanId", requireAuth, requireRole("admin"), LahanController.delete);

export default router;
