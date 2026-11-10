import { Router } from "express";
import { LaporanController } from "./laporan.controller.js";
import { requireAuth } from "@/middleware/auth.js";

const router = Router();

/**
 * GET /api/v1/laporan/overview/:lahanId
 * Get overview report for a lahan
 */
router.get("/overview/:lahanId", requireAuth, LaporanController.getOverview);

/**
 * GET /api/v1/laporan/waterings/:lahanId
 * Get watering report for a lahan
 */
router.get("/waterings/:lahanId", requireAuth, LaporanController.getWateringReport);

/**
 * GET /api/v1/laporan/moisture-trend/:lahanId
 * Get moisture trend report for a lahan
 */
router.get("/moisture-trend/:lahanId", requireAuth, LaporanController.getMoistureTrend);

export default router;
