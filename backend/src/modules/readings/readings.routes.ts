import { Router } from "express";
import { ReadingsController } from "./readings.controller.js";
import { requireAuth } from "@/middleware/auth.js";

const router = Router();

/**
 * GET /api/v1/readings
 * List readings (dengan optional filter perangkatId/lahanId, pagination)
 */
router.get("/", requireAuth, ReadingsController.getReadings);

/**
 * GET /api/v1/readings/latest/:perangkatId
 * Get latest reading for a device
 */
router.get("/latest/:perangkatId", requireAuth, ReadingsController.getLatestByDevice);

/**
 * GET /api/v1/readings/lahan/:lahanId
 * Get latest readings for a lahan
 */
router.get("/lahan/:lahanId", requireAuth, ReadingsController.getLatestByLahan);

export default router;
