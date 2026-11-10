import { Request, Response } from "express";
import { WateringsService } from "./waterings.service.js";
import type { WateringFilters } from "./waterings.service.js";
import { AppError } from "@/lib/errors.js";
import { sendControl } from "@/modules/kontrol/kontrol.service.js";

export class WateringsController {
  /**
   * GET /api/v1/waterings
   * List waterings per lahan with pagination
   * Jika lahanId tidak disertakan, return all waterings dari semua lahan
   */
  static async getWaterings(req: Request, res: Response) {
    const { lahanId, limit = 20, offset = 0, pemicu, from, to } = req.query;
    const lahanIdStr = typeof lahanId === "string" ? lahanId : undefined;
    const limitNum = Math.min(Number(limit) || 20, 100); // max 100
    const offsetNum = Number(offset) || 0;

    const filters: WateringFilters = {};
    if (pemicu === "otomatis" || pemicu === "manual") filters.pemicu = pemicu;
    if (typeof from === "string" && from.length > 0) filters.from = from;
    if (typeof to === "string" && to.length > 0) filters.to = to;

    let result;

    if (lahanIdStr) {
      // Jika lahanId disertakan, ambil data dari lahan spesifik
      result = await WateringsService.getWateringsByLahan(
        lahanIdStr,
        limitNum,
        offsetNum,
        filters,
      );
    } else {
      // Jika lahanId tidak disertakan, ambil data dari semua lahan
      result = await WateringsService.getAllWaterings(
        limitNum,
        offsetNum,
        filters,
      );
    }

    const { waterings, total } = result;

    res.json({
      waterings,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  }

  /**
   * POST /api/v1/waterings/trigger
   * Manual pump control (trigger watering)
   */
  static async triggerWatering(req: Request, res: Response) {
    const { lahanId } = req.body;

    if (!lahanId || typeof lahanId !== "string") {
      throw AppError.badRequest([{ field: "lahanId", issue: "lahanId is required and must be a string" }]);
    }

    const userId = req.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    // Alias lama untuk menyalakan pompa. Kontrol manual kini hanya ON/OFF
    // tanpa durasi, ditulis ke Realtime Database /irigasi/kontrol.
    const result = await sendControl(
      { lahanId, aksi: "on" },
      { id: userId, nama: req.user?.nama || "Unknown" },
    );

    res.status(202).json(result);
  }

  /**
   * GET /api/v1/waterings/stats/:lahanId
   * Get watering statistics for a lahan
   */
  static async getWateringStats(req: Request, res: Response) {
    const { lahanId } = req.params;
    const lahanIdStr = typeof lahanId === "string" ? lahanId : "";

    if (!lahanIdStr) {
      throw AppError.badRequest([{ field: "lahanId", issue: "lahanId is required" }]);
    }

    const stats = await WateringsService.getWateringStats(lahanIdStr);

    res.json(stats);
  }
}
