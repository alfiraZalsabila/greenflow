import { Router } from "express";
import { DevicesController } from "./devices.controller.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

const router = Router();

/**
 * GET /api/v1/devices
 * List devices (dengan optional filter lahanId, tipe)
 */
router.get("/", requireAuth, DevicesController.getAll);

/**
 * POST /api/v1/devices
 * Create new device (admin only)
 */
router.post("/", requireAuth, requireRole("admin"), DevicesController.create);

/**
 * GET /api/v1/devices/:deviceId
 * Get device by ID
 */
router.get("/:deviceId", requireAuth, DevicesController.getById);

/**
 * PUT /api/v1/devices/:deviceId
 * Update device (admin only)
 */
router.put("/:deviceId", requireAuth, requireRole("admin"), DevicesController.update);

/**
 * DELETE /api/v1/devices/:deviceId
 * Soft delete device (admin only)
 */
router.delete("/:deviceId", requireAuth, requireRole("admin"), DevicesController.delete);

export default router;
