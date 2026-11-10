import { Request, Response } from "express";
import { getDatabase } from "firebase-admin/database";
import { logger } from "@/lib/logger.js";
import { AppError } from "@/lib/errors.js";

const db = getDatabase();

export class RealtimeController {
  /**
   * GET /api/v1/realtime/status
   * Get the latest status payload written by the ESP32 to /irigasi/status
   */
  static async getStatus(_req: Request, res: Response) {
    try {
      const snapshot = await db.ref("irigasi/status").get();

      if (!snapshot.exists()) {
        logger.warn("Status not found in Realtime Database");
        res.json({ status: null });
        return;
      }

      const status = snapshot.val();
      logger.debug({ ts: status?.ts }, "Status retrieved from RTDB");

      res.json({ status });
    } catch (error) {
      logger.error({ error }, "Error reading status from RTDB");
      throw AppError.internal(error);
    }
  }

  /**
   * GET /api/v1/realtime/devices/:sensorId
   * Get real-time data for a single device from Realtime Database
   */
  static async getDeviceData(req: Request, res: Response) {
    const { sensorId } = req.params;

    if (!sensorId || typeof sensorId !== "string") {
      throw AppError.badRequest(
        [{ field: "sensorId", issue: "ID sensor tidak valid" }],
        "Validasi gagal",
      );
    }

    try {
      // Map sen-01 -> s1, sen-02 -> s2, etc.
      const match = sensorId.match(/sen-(\d+)/);
      if (!match) {
        res.json(null);
        return;
      }
      const sensorKey = `s${parseInt(match[1] ?? "")}`;
      
      const snapshot = await db.ref(`irigasi/status/tanah/${sensorKey}`).get();

      if (!snapshot.exists()) {
        logger.warn({ sensorId, sensorKey }, "Device not found in Realtime Database");
        res.json(null);
        return;
      }

      const data = snapshot.val();
      const responseData = {
        moisture: data.pct,
        raw: data.raw,
      };
      
      logger.debug({ sensorId, responseData }, "Device data retrieved from RTDB");

      res.json(responseData);
    } catch (error) {
      logger.error({ error, sensorId }, "Error reading device data from RTDB");
      throw AppError.internal(error);
    }
  }

  /**
   * GET /api/v1/realtime/devices
   * Get real-time data for multiple devices (query: ids=sen-01,sen-02,sen-03)
   */
  static async getMultipleDevicesData(req: Request, res: Response) {
    const { ids } = req.query;

    if (!ids || typeof ids !== "string") {
      throw AppError.badRequest(
        [{ field: "ids", issue: "ID sensor tidak valid (gunakan: ?ids=sen-01,sen-02)" }],
        "Validasi gagal",
      );
    }

    try {
      const sensorIds = ids.split(",").filter((id) => id.trim().length > 0);
      const snapshot = await db.ref("irigasi/status/tanah").get();
      const tanahData = snapshot.val() || {};

      const result: Record<string, unknown> = {};

      for (const sensorId of sensorIds) {
        const match = sensorId.trim().match(/sen-(\d+)/);
        if (match) {
          const sensorKey = `s${parseInt(match[1] ?? "")}`;
          if (tanahData[sensorKey]) {
            result[sensorId.trim()] = {
              moisture: tanahData[sensorKey].pct,
              raw: tanahData[sensorKey].raw,
            };
          }
        }
      }

      logger.debug({ count: Object.keys(result).length }, "Multiple devices data retrieved from RTDB");

      res.json(result);
    } catch (error) {
      logger.error({ error }, "Error reading multiple devices from RTDB");
      throw AppError.internal(error);
    }
  }
}
