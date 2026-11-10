import { Router } from "express";
import { RealtimeController } from "./realtime.controller.js";
import { requireAuth } from "@/middleware/auth.js";

const router = Router();

/**
 * GET /api/v1/realtime/status
 * Get the latest ESP32 status payload (soil, air, pump, etc.)
 */
router.get("/status", requireAuth, (req, res, next) => {
  RealtimeController.getStatus(req, res).catch(next);
});

/**
 * GET /api/v1/realtime/devices/:sensorId
 * Get real-time data for a single device
 */
router.get("/devices/:sensorId", requireAuth, (req, res, next) => {
  RealtimeController.getDeviceData(req, res).catch(next);
});

/**
 * GET /api/v1/realtime/devices
 * Get real-time data for multiple devices (query: ids=sen-01,sen-02)
 */
router.get("/devices", requireAuth, (req, res, next) => {
  RealtimeController.getMultipleDevicesData(req, res).catch(next);
});

export default router;
