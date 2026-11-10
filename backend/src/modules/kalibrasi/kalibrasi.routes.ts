import { Router } from "express";
import { KalibrasiController } from "./kalibrasi.controller.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

const router = Router();

/**
 * POST /api/v1/kalibrasi
 * Create kalibrasi for a device (admin only)
 */
router.post("/", requireAuth, requireRole("admin"), KalibrasiController.create);

/**
 * GET /api/v1/kalibrasi/lahan/:lahanId
 * Get all kalibrasi for a lahan
 */
router.get("/lahan/:lahanId", requireAuth, KalibrasiController.getByLahanId);

/**
 * GET /api/v1/kalibrasi/:deviceId
 * Get kalibrasi for a device
 */
router.get("/:deviceId", requireAuth, KalibrasiController.getByDeviceId);

/**
 * PUT /api/v1/kalibrasi/:deviceId
 * Update kalibrasi for a device (admin only)
 */
router.put("/:deviceId", requireAuth, requireRole("admin"), KalibrasiController.update);

/**
 * POST /api/v1/kalibrasi/:deviceId/reset
 * Reset kalibrasi to default values (admin only)
 */
router.post("/:deviceId/reset", requireAuth, requireRole("admin"), KalibrasiController.reset);

export default router;
