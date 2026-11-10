import { Request, Response } from "express";
import { ReadingsService } from "./readings.service.js";
import { AppError } from "@/lib/errors.js";

export class ReadingsController {
  /**
   * GET /api/v1/readings
   * Ambil readings dengan optional filter perangkatId/lahanId & pagination
   */
  static async getReadings(req: Request, res: Response) {
    const { perangkatId, lahanId, limit = 10, offset = 0 } = req.query;
    const perangkatIdStr = typeof perangkatId === "string" ? perangkatId : undefined;
    const lahanIdStr = typeof lahanId === "string" ? lahanId : undefined;

    const readings = await ReadingsService.getReadings({
      perangkatId: perangkatIdStr,
      lahanId: lahanIdStr,
      limit: Math.min(Number(limit) || 10, 100), // max 100
      offset: Number(offset) || 0,
    });

    res.json({
      readings,
    });
  }

  /**
   * GET /api/v1/readings/latest/:perangkatId
   * Ambil reading terbaru per perangkat
   */
  static async getLatestByDevice(req: Request, res: Response) {
    const { perangkatId } = req.params;
    const perangkatIdStr = typeof perangkatId === "string" ? perangkatId : "";
    const reading = await ReadingsService.getLatestReading(perangkatIdStr);

    if (!reading) {
      throw AppError.notFound("Belum ada data pembacaan untuk perangkat ini");
    }

    res.json(reading);
  }

  /**
   * GET /api/v1/readings/lahan/:lahanId
   * Ambil readings terbaru per lahan
   */
  static async getLatestByLahan(req: Request, res: Response) {
    const { lahanId } = req.params;
    const lahanIdStr = typeof lahanId === "string" ? lahanId : "";
    const readings = await ReadingsService.getLatestReadingsByLahan(lahanIdStr);

    res.json({
      readings,
    });
  }
}
