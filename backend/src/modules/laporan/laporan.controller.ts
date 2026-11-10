import { Request, Response } from "express";
import { LaporanService } from "./laporan.service.js";
import { AppError } from "@/lib/errors.js";
import { logger } from "@/lib/logger.js";

interface DateRange {
  fromDate: Date;
  toDate: Date;
}

/**
 * Validasi query `from`/`to` (ISO string) dan kembalikan rentang tanggal.
 * Melempar `AppError.badRequest` bila tidak valid.
 */
function parseRange(from: unknown, to: unknown): DateRange {
  const errors: Array<{ field: string; issue: string }> = [];

  if (!from || typeof from !== "string") {
    errors.push({ field: "from", issue: "Tanggal mulai (ISO format) wajib diisi" });
  }

  if (!to || typeof to !== "string") {
    errors.push({ field: "to", issue: "Tanggal akhir (ISO format) wajib diisi" });
  }

  if (errors.length > 0) {
    throw AppError.badRequest(errors, "Validasi gagal");
  }

  const fromDate = new Date(from as string);
  const toDate = new Date(to as string);

  if (isNaN(fromDate.getTime())) {
    throw AppError.badRequest(
      [{ field: "from", issue: "Format tanggal tidak valid (gunakan ISO format)" }],
      "Validasi gagal",
    );
  }

  if (isNaN(toDate.getTime())) {
    throw AppError.badRequest(
      [{ field: "to", issue: "Format tanggal tidak valid (gunakan ISO format)" }],
      "Validasi gagal",
    );
  }

  if (fromDate >= toDate) {
    throw AppError.badRequest(
      [{ field: "from", issue: "Tanggal mulai harus lebih kecil dari tanggal akhir" }],
      "Validasi gagal",
    );
  }

  return { fromDate, toDate };
}

function requireLahanId(lahanId: unknown): string {
  if (!lahanId || typeof lahanId !== "string") {
    throw AppError.badRequest(
      [{ field: "lahanId", issue: "ID lahan tidak valid" }],
      "Validasi gagal",
    );
  }
  return lahanId;
}

export class LaporanController {
  /**
   * GET /api/v1/laporan/overview/:lahanId
   * Get overview report for a lahan
   */
  static async getOverview(req: Request, res: Response) {
    const lahanId = requireLahanId(req.params.lahanId);
    const { from, to } = req.query;

    try {
      const { fromDate, toDate } = parseRange(from, to);
      const report = await LaporanService.getOverviewReport(
        lahanId,
        fromDate,
        toDate,
      );
      res.json(report);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ error }, "Gagal mengambil laporan overview");
      throw AppError.internal(error);
    }
  }

  /**
   * GET /api/v1/laporan/waterings/:lahanId
   * Get watering report for a lahan
   */
  static async getWateringReport(req: Request, res: Response) {
    const lahanId = requireLahanId(req.params.lahanId);
    const { from, to } = req.query;

    try {
      const { fromDate, toDate } = parseRange(from, to);
      const report = await LaporanService.getWateringReport(
        lahanId,
        fromDate,
        toDate,
      );
      res.json(report);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ error }, "Gagal mengambil laporan penyiraman");
      throw AppError.internal(error);
    }
  }

  /**
   * GET /api/v1/laporan/moisture-trend/:lahanId
   * Get moisture trend report for a lahan
   */
  static async getMoistureTrend(req: Request, res: Response) {
    const lahanId = requireLahanId(req.params.lahanId);
    const { from, to } = req.query;

    try {
      const { fromDate, toDate } = parseRange(from, to);
      const report = await LaporanService.getMoistureTrendReport(
        lahanId,
        fromDate,
        toDate,
      );
      res.json(report);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ error }, "Gagal mengambil laporan tren kelembapan");
      throw AppError.internal(error);
    }
  }
}
