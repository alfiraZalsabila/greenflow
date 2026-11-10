import type { Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { parseInput } from "../../lib/validate.js";
import { auditFromRequest } from "../../lib/audit.js";
import { getControlState, sendControl } from "./kontrol.service.js";
import type { ControlAksi } from "./kontrol.service.js";

const controlSchema = z.strictObject({
  lahanId: z.string().min(1, "Lahan wajib dipilih."),
  aksi: z.enum(["on", "off", "mode"], {
    error: "Aksi harus on, off, atau mode.",
  }),
  mode: z
    .enum(["auto", "manual"], {
      error: "Mode harus auto atau manual.",
    })
    .optional(),
});

const AKSI_LABEL: Record<ControlAksi, string> = {
  mode: "Ubah mode",
  on: "Nyalakan pompa",
  off: "Matikan pompa",
};

export class KontrolController {
  /** GET /api/v1/kontrol — status node kontrol saat ini. */
  static async getState(_req: Request, res: Response) {
    const control = await getControlState();
    res.json({ control });
  }

  /** POST /api/v1/kontrol — kirim perintah ON/OFF (atau ubah mode). */
  static async send(req: Request, res: Response) {
    const input = parseInput(
      controlSchema,
      req.body,
      "Periksa kembali isian perintah kontrol.",
    );

    if (input.aksi === "mode" && !input.mode) {
      throw AppError.badRequest(
        [{ field: "mode", issue: "Mode harus auto atau manual." }],
        "Mode tidak valid.",
      );
    }

    const user = req.user;
    if (!user) {
      throw AppError.unauthorized();
    }

    const result = await sendControl(input, {
      id: user.id,
      nama: user.nama,
    });

    await auditFromRequest(req, {
      actorId: user.id,
      actorNama: user.nama,
      actorPeran: user.peran,
      aksi: `kontrol.${input.aksi}`,
      entitasTipe: "perangkat",
      entitasId: result.perangkatId,
      ringkasan: `${AKSI_LABEL[input.aksi]} pada lahan ${input.lahanId}`,
      perubahan: { sesudah: result.command },
    });

    res.status(202).json(result);
  }
}
