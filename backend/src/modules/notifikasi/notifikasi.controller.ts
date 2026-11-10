import { Request, Response } from "express";
import { NotifikasiService } from "./notifikasi.service.js";
import { AppError } from "@/lib/errors.js";
import { logger } from "@/lib/logger.js";

export class NotifikasiController {
  /**
   * GET /api/v1/notifikasi
   * Get notifications with optional filters
   */
  static async getAll(req: Request, res: Response) {
    const { lahanId, limit } = req.query;
    const lahanIdStr = typeof lahanId === "string" ? lahanId : undefined;
    const limitNum = typeof limit === "string" ? parseInt(limit, 10) : 50;

    if (limitNum < 1 || limitNum > 100) {
      throw AppError.badRequest(
        [{ field: "limit", issue: "Limit harus antara 1-100" }],
        "Validasi gagal",
      );
    }

    try {
      const notifikasi = await NotifikasiService.getAllNotifikasi(lahanIdStr, limitNum);
      res.json({ notifikasi });
    } catch (error) {
      logger.error({ error }, "Gagal mengambil notifikasi");
      throw AppError.internal(error);
    }
  }

  /**
   * POST /api/v1/notifikasi
   * Create a new notification (internal/system use)
   */
  static async create(req: Request, res: Response) {
    const { tipe, lahanId, perangkatId, pesan, severity, baca } = req.body;

    const errors: Array<{ field: string; issue: string }> = [];

    if (!tipe || !["kering_soil", "pump_failure", "sensor_error", "manual_trigger", "system_alert"].includes(tipe)) {
      errors.push({ field: "tipe", issue: "Tipe notifikasi tidak valid" });
    }

    if (!lahanId || typeof lahanId !== "string") {
      errors.push({ field: "lahanId", issue: "ID lahan wajib diisi" });
    }

    if (!pesan || typeof pesan !== "string" || pesan.trim().length === 0) {
      errors.push({ field: "pesan", issue: "Pesan notifikasi wajib diisi" });
    }

    if (!severity || !["info", "warning", "error"].includes(severity)) {
      errors.push({ field: "severity", issue: "Severity tidak valid (info/warning/error)" });
    }

    if (errors.length > 0) {
      throw AppError.badRequest(errors, "Validasi gagal");
    }

    try {
      const notifikasi = await NotifikasiService.createNotifikasi({
        tipe,
        lahanId,
        perangkatId,
        pesan: pesan.trim(),
        severity,
        baca: baca ?? false,
      });

      logger.info(
        { notifikasiId: notifikasi.id, lahanId, userId: req.user!.id },
        "Notifikasi baru berhasil dibuat",
      );

      res.status(201).json(notifikasi);
    } catch (error) {
      logger.error({ error }, "Gagal membuat notifikasi");
      throw AppError.internal(error);
    }
  }

  /**
   * PUT /api/v1/notifikasi/:notifId/baca
   * Mark notification as read
   */
  static async markAsRead(req: Request, res: Response) {
    const { notifId } = req.params;

    if (!notifId || typeof notifId !== "string") {
      throw AppError.badRequest(
        [{ field: "notifId", issue: "ID notifikasi tidak valid" }],
        "Validasi gagal",
      );
    }

    try {
      const notifikasi = await NotifikasiService.markAsRead(notifId);

      logger.info(
        { notifId, userId: req.user!.id },
        "Notifikasi ditandai sudah dibaca",
      );

      res.json(notifikasi);
    } catch (error) {
      if ((error as Error).message === "Notifikasi tidak ditemukan") {
        throw AppError.notFound("Notifikasi tidak ditemukan");
      }
      logger.error({ error }, "Gagal menandai notifikasi dibaca");
      throw AppError.internal(error);
    }
  }

  /**
   * DELETE /api/v1/notifikasi/:notifId
   * Delete notification
   */
  static async delete(req: Request, res: Response) {
    const { notifId } = req.params;

    if (!notifId || typeof notifId !== "string") {
      throw AppError.badRequest(
        [{ field: "notifId", issue: "ID notifikasi tidak valid" }],
        "Validasi gagal",
      );
    }

    try {
      await NotifikasiService.deleteNotifikasi(notifId);

      logger.info(
        { notifId, userId: req.user!.id },
        "Notifikasi berhasil dihapus",
      );

      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === "Notifikasi tidak ditemukan") {
        throw AppError.notFound("Notifikasi tidak ditemukan");
      }
      logger.error({ error }, "Gagal menghapus notifikasi");
      throw AppError.internal(error);
    }
  }
}
