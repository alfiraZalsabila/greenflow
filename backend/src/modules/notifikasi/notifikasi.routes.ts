import { Router } from "express";
import { NotifikasiController } from "./notifikasi.controller.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

const router = Router();

/**
 * GET /api/v1/notifikasi
 * Get notifications with optional filters
 */
router.get("/", requireAuth, NotifikasiController.getAll);

/**
 * POST /api/v1/notifikasi
 * Create a new notification (internal/system use)
 */
router.post("/", requireAuth, NotifikasiController.create);

/**
 * PUT /api/v1/notifikasi/:notifId/baca
 * Mark notification as read
 */
router.put("/:notifId/baca", requireAuth, NotifikasiController.markAsRead);

/**
 * DELETE /api/v1/notifikasi/:notifId
 * Delete notification
 */
router.delete("/:notifId", requireAuth, NotifikasiController.delete);

export default router;
