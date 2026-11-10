import { Request, Response } from "express";
import { ParameterService } from "./parameter.service.js";
import { AppError } from "@/lib/errors.js";
import { logger } from "@/lib/logger.js";

export class ParameterController {
  /**
   * GET /api/v1/parameter/:lahanId
   * Get parameter for a lahan
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
      const parameter = await ParameterService.getParameterByLahanId(lahanId);

      if (!parameter) {
        throw AppError.notFound("Parameter lahan tidak ditemukan");
      }

      res.json(parameter);
    } catch (error) {
      if ((error as Error).message === "Parameter lahan tidak ditemukan") {
        throw AppError.notFound("Parameter lahan tidak ditemukan");
      }
      logger.error({ error }, "Gagal mengambil parameter lahan");
      throw AppError.internal(error);
    }
  }

  /**
   * PUT /api/v1/parameter/:lahanId
   * Update parameter for a lahan (admin only)
   */
  static async update(req: Request, res: Response) {
    const { lahanId } = req.params;
    const { keringSec, lembapSec, basahSec, ambangKering, titikTengah, ambangCukup } = req.body;

    if (!lahanId || typeof lahanId !== "string") {
      throw AppError.badRequest(
        [{ field: "lahanId", issue: "ID lahan tidak valid" }],
        "Validasi gagal",
      );
    }

    // Validate numeric fields if provided
    const errors: Array<{ field: string; issue: string }> = [];

    if (keringSec !== undefined && (typeof keringSec !== "number" || keringSec < 0)) {
      errors.push({ field: "keringSec", issue: "Durasi kering harus berupa angka positif (detik)" });
    }

    if (lembapSec !== undefined && (typeof lembapSec !== "number" || lembapSec < 0)) {
      errors.push({ field: "lembapSec", issue: "Durasi lembap harus berupa angka positif (detik)" });
    }

    if (basahSec !== undefined && (typeof basahSec !== "number" || basahSec < 0)) {
      errors.push({ field: "basahSec", issue: "Durasi basah harus berupa angka positif (detik)" });
    }

    if (ambangKering !== undefined && (typeof ambangKering !== "number" || ambangKering < 0 || ambangKering > 100)) {
      errors.push({ field: "ambangKering", issue: "Ambang kering harus antara 0-100%" });
    }

    if (titikTengah !== undefined && (typeof titikTengah !== "number" || titikTengah < 0 || titikTengah > 100)) {
      errors.push({ field: "titikTengah", issue: "Titik tengah harus antara 0-100%" });
    }

    if (ambangCukup !== undefined && (typeof ambangCukup !== "number" || ambangCukup < 0 || ambangCukup > 100)) {
      errors.push({ field: "ambangCukup", issue: "Ambang cukup harus antara 0-100%" });
    }

    if (errors.length > 0) {
      throw AppError.badRequest(errors, "Validasi gagal");
    }

    try {
      const updateData: any = {};
      if (keringSec !== undefined) updateData.keringSec = keringSec;
      if (lembapSec !== undefined) updateData.lembapSec = lembapSec;
      if (basahSec !== undefined) updateData.basahSec = basahSec;
      if (ambangKering !== undefined) updateData.ambangKering = ambangKering;
      if (titikTengah !== undefined) updateData.titikTengah = titikTengah;
      if (ambangCukup !== undefined) updateData.ambangCukup = ambangCukup;

      const parameter = await ParameterService.updateParameter(
        lahanId,
        updateData,
        req.user!.id,
      );

      logger.info(
        { lahanId, userId: req.user!.id },
        "Parameter lahan berhasil diperbarui",
      );

      res.json(parameter);
    } catch (error) {
      if ((error as Error).message === "Parameter tidak ditemukan") {
        throw AppError.notFound("Parameter lahan tidak ditemukan");
      }
      logger.error({ error }, "Gagal memperbarui parameter lahan");
      throw AppError.internal(error);
    }
  }
}
