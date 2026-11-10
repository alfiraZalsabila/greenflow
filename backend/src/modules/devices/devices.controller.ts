import { Request, Response } from "express";
import { DevicesService } from "./devices.service.js";
import { AppError } from "@/lib/errors.js";
import { logger } from "@/lib/logger.js";

export class DevicesController {
  /**
   * GET /api/v1/devices
   * Ambil semua devices (dengan optional filter lahanId)
   */
  static async getAll(req: Request, res: Response) {
    const { lahanId, tipe } = req.query;
    const lahanIdStr = typeof lahanId === "string" ? lahanId : undefined;
    const tipeStr = typeof tipe === "string" ? tipe : undefined;

    let devices;
    if (tipeStr) {
      devices = await DevicesService.getDevicesByTipe(
        tipeStr as "pengendali" | "sensor" | "pompa",
        lahanIdStr,
      );
    } else {
      devices = await DevicesService.getAllDevices(lahanIdStr);
    }

    res.json({
      devices,
    });
  }

  /**
   * GET /api/v1/devices/:deviceId
   * Ambil device by ID
   */
  static async getById(req: Request, res: Response) {
    const { deviceId } = req.params;
    const deviceIdStr = typeof deviceId === "string" ? deviceId : "";
    const device = await DevicesService.getDeviceById(deviceIdStr);

    if (!device) {
      throw AppError.notFound("Perangkat tidak ditemukan");
    }

    res.json(device);
  }

  /**
   * POST /api/v1/devices
   * Buat device baru (admin only)
   */
  static async create(req: Request, res: Response) {
    const { kodePerangkat, nama, tipe, lahanId } = req.body;

    // Validate required fields
    if (!kodePerangkat || typeof kodePerangkat !== "string" || kodePerangkat.trim().length === 0) {
      throw AppError.badRequest(
        [{ field: "kodePerangkat", issue: "Kode perangkat wajib diisi" }],
        "Validasi gagal",
      );
    }

    if (!nama || typeof nama !== "string" || nama.trim().length === 0) {
      throw AppError.badRequest(
        [{ field: "nama", issue: "Nama perangkat wajib diisi" }],
        "Validasi gagal",
      );
    }

    if (!tipe || !["pengendali", "sensor", "pompa"].includes(tipe)) {
      throw AppError.badRequest(
        [{ field: "tipe", issue: "Tipe perangkat harus: pengendali, sensor, atau pompa" }],
        "Validasi gagal",
      );
    }

    if (!lahanId || typeof lahanId !== "string" || lahanId.trim().length === 0) {
      throw AppError.badRequest(
        [{ field: "lahanId", issue: "ID lahan wajib diisi" }],
        "Validasi gagal",
      );
    }

    try {
      const device = await DevicesService.createDevice({
        kodePerangkat: kodePerangkat.trim(),
        nama: nama.trim(),
        tipe: tipe as "pengendali" | "sensor" | "pompa",
        lahanId: lahanId.trim(),
        status: "aktif",
      });

      logger.info(
        { deviceId: kodePerangkat, lahanId, userId: req.user!.id },
        "Perangkat baru berhasil dibuat",
      );

      res.status(201).json(device);
    } catch (error) {
      logger.error({ error }, "Gagal membuat perangkat baru");
      throw AppError.internal(error);
    }
  }

  /**
   * PUT /api/v1/devices/:deviceId
   * Update device (admin only)
   */
  static async update(req: Request, res: Response) {
    const { deviceId } = req.params;
    const { nama, tipe, lahanId } = req.body;

    // Validate deviceId
    if (!deviceId || typeof deviceId !== "string") {
      throw AppError.badRequest(
        [{ field: "deviceId", issue: "ID perangkat tidak valid" }],
        "Validasi gagal",
      );
    }

    // Validate fields if provided
    if (nama !== undefined && (typeof nama !== "string" || nama.trim().length === 0)) {
      throw AppError.badRequest(
        [{ field: "nama", issue: "Nama perangkat wajib diisi" }],
        "Validasi gagal",
      );
    }

    if (tipe !== undefined && !["pengendali", "sensor", "pompa"].includes(tipe)) {
      throw AppError.badRequest(
        [{ field: "tipe", issue: "Tipe perangkat harus: pengendali, sensor, atau pompa" }],
        "Validasi gagal",
      );
    }

    if (lahanId !== undefined && (typeof lahanId !== "string" || lahanId.trim().length === 0)) {
      throw AppError.badRequest(
        [{ field: "lahanId", issue: "ID lahan wajib diisi" }],
        "Validasi gagal",
      );
    }

    // Build update object
    const updateData: any = {};
    if (nama) updateData.nama = nama.trim();
    if (tipe) updateData.tipe = tipe as "pengendali" | "sensor" | "pompa";
    if (lahanId) updateData.lahanId = lahanId.trim();

    try {
      const device = await DevicesService.updateDevice(
        deviceId as string,
        updateData,
      );

      logger.info(
        { deviceId, userId: req.user!.id },
        "Perangkat berhasil diperbarui",
      );

      res.json(device);
    } catch (error) {
      if ((error as Error).message === "Perangkat tidak ditemukan") {
        throw AppError.notFound("Perangkat tidak ditemukan");
      }
      logger.error({ error }, "Gagal memperbarui perangkat");
      throw AppError.internal(error);
    }
  }

  /**
   * DELETE /api/v1/devices/:deviceId
   * Soft delete device (admin only)
   */
  static async delete(req: Request, res: Response) {
    const { deviceId } = req.params;

    if (!deviceId || typeof deviceId !== "string") {
      throw AppError.badRequest(
        [{ field: "deviceId", issue: "ID perangkat tidak valid" }],
        "Validasi gagal",
      );
    }

    try {
      await DevicesService.deleteDevice(deviceId as string);

      logger.info(
        { deviceId, userId: req.user!.id },
        "Perangkat berhasil dihapus (soft delete)",
      );

      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === "Perangkat tidak ditemukan") {
        throw AppError.notFound("Perangkat tidak ditemukan");
      }
      logger.error({ error }, "Gagal menghapus perangkat");
      throw AppError.internal(error);
    }
  }
}
