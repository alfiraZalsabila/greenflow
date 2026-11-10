import { Request, Response } from "express";
import { KalibrasiService } from "./kalibrasi.service.js";
import { AppError } from "@/lib/errors.js";
import { logger } from "@/lib/logger.js";

export class KalibrasiController {
  /**
   * POST /api/v1/kalibrasi
   * Create kalibrasi for a device (admin only)
   */
  static async create(req: Request, res: Response) {
    const { deviceId, lahanId, adcKering, adcBasah } = req.body;

    if (!deviceId || typeof deviceId !== "string") {
      throw AppError.badRequest(
        [{ field: "deviceId", issue: "ID perangkat tidak valid" }],
        "Validasi gagal",
      );
    }

    if (!lahanId || typeof lahanId !== "string") {
      throw AppError.badRequest(
        [{ field: "lahanId", issue: "ID lahan tidak valid" }],
        "Validasi gagal",
      );
    }

    const errors: Array<{ field: string; issue: string }> = [];

    if (typeof adcKering !== "number" || adcKering < 0) {
      errors.push({ field: "adcKering", issue: "ADC kering harus berupa angka positif" });
    }

    if (typeof adcBasah !== "number" || adcBasah < 0) {
      errors.push({ field: "adcBasah", issue: "ADC basah harus berupa angka positif" });
    }

    if (errors.length > 0) {
      throw AppError.badRequest(errors, "Validasi gagal");
    }

    try {
      const kalibrasi = await KalibrasiService.createKalibrasi(
        deviceId,
        {
          deviceId,
          lahanId,
          adcKering,
          adcBasah,
        },
        req.user!.id,
      );

      logger.info(
        { deviceId, lahanId, userId: req.user!.id },
        "Kalibrasi perangkat berhasil dibuat",
      );

      res.status(201).json(kalibrasi);
    } catch (error) {
      logger.error({ error }, "Gagal membuat kalibrasi perangkat");
      throw AppError.internal(error);
    }
  }

  /**
   * GET /api/v1/kalibrasi/:deviceId
   * Get kalibrasi for a device
   */
  static async getByDeviceId(req: Request, res: Response) {
    const { deviceId } = req.params;

    if (!deviceId || typeof deviceId !== "string") {
      throw AppError.badRequest(
        [{ field: "deviceId", issue: "ID perangkat tidak valid" }],
        "Validasi gagal",
      );
    }

    try {
      const kalibrasi = await KalibrasiService.getKalibrasiByDeviceId(deviceId);

      if (!kalibrasi) {
        logger.info({ deviceId }, "Kalibrasi perangkat tidak ditemukan, return null");
        res.json(null);
        return;
      }

      res.json(kalibrasi);
    } catch (error) {
      logger.error({ error, deviceId }, "Gagal mengambil kalibrasi perangkat");
      throw AppError.internal(error);
    }
  }

  /**
   * GET /api/v1/kalibrasi/lahan/:lahanId
   * Get all kalibrasi for a lahan
   */
  static async getByLahanId(req: Request, res: Response) {
    const { lahanId } = req.params;

    if (!lahanId || typeof lahanId !== "string") {
      throw AppError.badRequest(
        [{ field: "lahanId", issue: "ID lahan tidak valid" }],
        "Validasi gagal",
      );
    }

    try {
      const kalibrasi = await KalibrasiService.getKalibrasiByLahanId(lahanId);
      res.json({ kalibrasi });
    } catch (error) {
      logger.error({ error }, "Gagal mengambil kalibrasi lahan");
      throw AppError.internal(error);
    }
  }

  /**
   * PUT /api/v1/kalibrasi/:deviceId
   * Update kalibrasi for a device (admin only)
   */
  static async update(req: Request, res: Response) {
    const { deviceId } = req.params;
    const { adcKering, adcBasah } = req.body;

    if (!deviceId || typeof deviceId !== "string") {
      throw AppError.badRequest(
        [{ field: "deviceId", issue: "ID perangkat tidak valid" }],
        "Validasi gagal",
      );
    }

    const errors: Array<{ field: string; issue: string }> = [];

    if (adcKering !== undefined && (typeof adcKering !== "number" || adcKering < 0)) {
      errors.push({ field: "adcKering", issue: "ADC kering harus berupa angka positif" });
    }

    if (adcBasah !== undefined && (typeof adcBasah !== "number" || adcBasah < 0)) {
      errors.push({ field: "adcBasah", issue: "ADC basah harus berupa angka positif" });
    }

    if (errors.length > 0) {
      throw AppError.badRequest(errors, "Validasi gagal");
    }

    try {
      const updateData: any = {};
      if (adcKering !== undefined) updateData.adcKering = adcKering;
      if (adcBasah !== undefined) updateData.adcBasah = adcBasah;

      const kalibrasi = await KalibrasiService.updateKalibrasi(
        deviceId,
        updateData,
        req.user!.id,
      );

      logger.info(
        { deviceId, userId: req.user!.id },
        "Kalibrasi perangkat berhasil diperbarui",
      );

      res.json(kalibrasi);
    } catch (error) {
      if ((error as Error).message === "Kalibrasi tidak ditemukan") {
        throw AppError.notFound("Kalibrasi perangkat tidak ditemukan");
      }
      logger.error({ error }, "Gagal memperbarui kalibrasi perangkat");
      throw AppError.internal(error);
    }
  }

  /**
   * POST /api/v1/kalibrasi/:deviceId/reset
   * Reset kalibrasi to default values (admin only)
   */
  static async reset(req: Request, res: Response) {
    const { deviceId } = req.params;

    if (!deviceId || typeof deviceId !== "string") {
      throw AppError.badRequest(
        [{ field: "deviceId", issue: "ID perangkat tidak valid" }],
        "Validasi gagal",
      );
    }

    try {
      const kalibrasi = await KalibrasiService.resetKalibrasi(deviceId, req.user!.id);

      logger.info(
        { deviceId, userId: req.user!.id },
        "Kalibrasi perangkat berhasil direset ke nilai default",
      );

      res.json(kalibrasi);
    } catch (error) {
      if ((error as Error).message === "Kalibrasi tidak ditemukan") {
        throw AppError.notFound("Kalibrasi perangkat tidak ditemukan");
      }
      logger.error({ error }, "Gagal mereset kalibrasi perangkat");
      throw AppError.internal(error);
    }
  }
}
