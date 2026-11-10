import { Request, Response } from "express";
import { LahanService } from "./lahan.service.js";
import { AppError } from "@/lib/errors.js";
import { logger } from "@/lib/logger.js";

export class LahanController {
  /**
   * GET /api/v1/lahan
   * Ambil semua lahan (dengan optional filter status)
   */
  static async getAll(req: Request, res: Response) {
    const { status } = req.query;
    const statusValue = typeof status === "string" ? status : undefined;
    const lahanList = await LahanService.getAllLahan(
      statusValue as "aktif" | "nonaktif" | undefined,
    );

    res.json({
      lahan: lahanList,
    });
  }

  /**
   * GET /api/v1/lahan/:lahanId
   * Ambil lahan by ID
   */
  static async getById(req: Request, res: Response) {
    const { lahanId } = req.params;
    const lahanIdStr = typeof lahanId === "string" ? lahanId : "";
    const lahan = await LahanService.getLabanById(lahanIdStr);

    if (!lahan) {
      throw AppError.notFound("Lahan tidak ditemukan");
    }

    res.json(lahan);
  }

  /**
   * POST /api/v1/lahan
   * Buat lahan baru (admin only)
   */
  static async create(req: Request, res: Response) {
    const { nama, lokasi, luasM2, ambangKering, ambangCukup } = req.body;

    // Validate required fields
    if (!nama || typeof nama !== "string" || nama.trim().length === 0) {
      throw AppError.badRequest(
        [{ field: "nama", issue: "Nama lahan wajib diisi" }],
        "Validasi gagal",
      );
    }

    if (!lokasi || typeof lokasi !== "string" || lokasi.trim().length === 0) {
      throw AppError.badRequest(
        [{ field: "lokasi", issue: "Lokasi lahan wajib diisi" }],
        "Validasi gagal",
      );
    }

    if (typeof luasM2 !== "number" || luasM2 <= 0) {
      throw AppError.badRequest(
        [{ field: "luasM2", issue: "Luas lahan harus lebih besar dari 0" }],
        "Validasi gagal",
      );
    }

    if (
      typeof ambangKering !== "number" ||
      ambangKering < 0 ||
      ambangKering > 100
    ) {
      throw AppError.badRequest(
        [
          {
            field: "ambangKering",
            issue: "Ambang kering harus antara 0-100%",
          },
        ],
        "Validasi gagal",
      );
    }

    if (
      typeof ambangCukup !== "number" ||
      ambangCukup < 0 ||
      ambangCukup > 100
    ) {
      throw AppError.badRequest(
        [
          {
            field: "ambangCukup",
            issue: "Ambang cukup harus antara 0-100%",
          },
        ],
        "Validasi gagal",
      );
    }

    if (ambangKering >= ambangCukup) {
      throw AppError.badRequest(
        [
          {
            field: "ambangKering",
            issue: "Ambang kering harus lebih kecil dari ambang cukup",
          },
        ],
        "Validasi gagal",
      );
    }

    // Generate lahanId
    const lahanId = `lh-${Date.now()}`;

    // Create default parameter
    const parameter = {
      ambangKering,
      titikTengah: (ambangKering + ambangCukup) / 2,
      ambangCukup,
      maxDurationSec: 600,
      intervalSec: 300,
      fuzzy: {
        keringSec: 60,
        lembapSec: 120,
        basahSec: 180,
      },
    };

    try {
      const lahan = await LahanService.createLahan(
        lahanId,
        {
          nama: nama.trim(),
          lokasi: lokasi.trim(),
          luasM2,
          status: "aktif",
          parameter,
        },
        req.user!.id,
      );

      logger.info(
        { lahanId, userId: req.user!.id },
        "Lahan baru berhasil dibuat",
      );

      res.status(201).json(lahan);
    } catch (error) {
      logger.error({ error }, "Gagal membuat lahan baru");
      throw AppError.internal(error);
    }
  }

  /**
   * PUT /api/v1/lahan/:lahanId
   * Update lahan (admin only)
   */
  static async update(req: Request, res: Response) {
    const { lahanId } = req.params;
    const { nama, lokasi, luasM2, ambangKering, ambangCukup } = req.body;

    // Validate lahanId
    if (!lahanId || typeof lahanId !== "string") {
      throw AppError.badRequest(
        [{ field: "lahanId", issue: "ID lahan tidak valid" }],
        "Validasi gagal",
      );
    }

    // Validate required fields if provided
    if (nama !== undefined && (typeof nama !== "string" || nama.trim().length === 0)) {
      throw AppError.badRequest(
        [{ field: "nama", issue: "Nama lahan wajib diisi" }],
        "Validasi gagal",
      );
    }

    if (lokasi !== undefined && (typeof lokasi !== "string" || lokasi.trim().length === 0)) {
      throw AppError.badRequest(
        [{ field: "lokasi", issue: "Lokasi lahan wajib diisi" }],
        "Validasi gagal",
      );
    }

    if (luasM2 !== undefined && (typeof luasM2 !== "number" || luasM2 <= 0)) {
      throw AppError.badRequest(
        [{ field: "luasM2", issue: "Luas lahan harus lebih besar dari 0" }],
        "Validasi gagal",
      );
    }

    if (
      ambangKering !== undefined &&
      (typeof ambangKering !== "number" || ambangKering < 0 || ambangKering > 100)
    ) {
      throw AppError.badRequest(
        [
          {
            field: "ambangKering",
            issue: "Ambang kering harus antara 0-100%",
          },
        ],
        "Validasi gagal",
      );
    }

    if (
      ambangCukup !== undefined &&
      (typeof ambangCukup !== "number" || ambangCukup < 0 || ambangCukup > 100)
    ) {
      throw AppError.badRequest(
        [
          {
            field: "ambangCukup",
            issue: "Ambang cukup harus antara 0-100%",
          },
        ],
        "Validasi gagal",
      );
    }

    // Build update object
    const updateData: any = {};
    if (nama) updateData.nama = nama.trim();
    if (lokasi) updateData.lokasi = lokasi.trim();
    if (luasM2) updateData.luasM2 = luasM2;

    // If threshold values are provided, update parameter
    if (ambangKering !== undefined || ambangCukup !== undefined) {
      const existing = await LahanService.getLabanById(lahanId as string);
      if (!existing) {
        throw AppError.notFound("Lahan tidak ditemukan");
      }

      const newAmbangKering = ambangKering ?? existing.parameter.ambangKering;
      const newAmbangCukup = ambangCukup ?? existing.parameter.ambangCukup;

      if (newAmbangKering >= newAmbangCukup) {
        throw AppError.badRequest(
          [
            {
              field: "ambangKering",
              issue: "Ambang kering harus lebih kecil dari ambang cukup",
            },
          ],
          "Validasi gagal",
        );
      }

      updateData.parameter = {
        ...existing.parameter,
        ambangKering: newAmbangKering,
        ambangCukup: newAmbangCukup,
        titikTengah: (newAmbangKering + newAmbangCukup) / 2,
      };
    }

    try {
      const lahan = await LahanService.updateLahan(
        lahanId as string,
        updateData,
      );

      logger.info(
        { lahanId, userId: req.user!.id },
        "Lahan berhasil diperbarui",
      );

      res.json(lahan);
    } catch (error) {
      if ((error as Error).message === "Lahan tidak ditemukan") {
        throw AppError.notFound("Lahan tidak ditemukan");
      }
      logger.error({ error }, "Gagal memperbarui lahan");
      throw AppError.internal(error);
    }
  }

  /**
   * DELETE /api/v1/lahan/:lahanId
   * Soft delete lahan (admin only)
   */
  static async delete(req: Request, res: Response) {
    const { lahanId } = req.params;

    if (!lahanId || typeof lahanId !== "string") {
      throw AppError.badRequest(
        [{ field: "lahanId", issue: "ID lahan tidak valid" }],
        "Validasi gagal",
      );
    }

    try {
      await LahanService.deleteLahan(lahanId as string);

      logger.info(
        { lahanId, userId: req.user!.id },
        "Lahan berhasil dihapus (soft delete)",
      );

      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === "Lahan tidak ditemukan") {
        throw AppError.notFound("Lahan tidak ditemukan");
      }
      logger.error({ error }, "Gagal menghapus lahan");
      throw AppError.internal(error);
    }
  }
}
