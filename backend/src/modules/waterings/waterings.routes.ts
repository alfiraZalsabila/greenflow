import { Router } from "express";
import { WateringsController } from "./waterings.controller.js";
import { requireAuth } from "@/middleware/auth.js";

const router = Router();

/**
 * GET /api/v1/waterings
 * List waterings per lahan with pagination
 */
router.get("/", requireAuth, WateringsController.getWaterings);

/**
 * POST /api/v1/waterings/trigger
 * Manual pump control (trigger watering)
 */
router.post("/trigger", requireAuth, WateringsController.triggerWatering);

/**
 * GET /api/v1/waterings/stats/:lahanId
 * Get watering statistics for a lahan
 */
router.get("/stats/:lahanId", requireAuth, WateringsController.getWateringStats);

export default router;
