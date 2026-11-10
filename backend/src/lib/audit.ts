import type { Request } from "express";

import { db } from "../config/firebase.js";
import { logger } from "./logger.js";

export interface AuditEntry {
  actorId: string | null;
  actorNama: string;
  actorPeran: "admin" | "pengguna" | "sistem";
  aksi: string;
  entitasTipe: string;
  entitasId: string;
  ringkasan: string;
  perubahan?: { sebelum?: unknown; sesudah?: unknown } | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Audit bersifat best-effort: kegagalan menulis log tidak boleh membatalkan
 * aksi utama, tetapi tetap tercatat di log server.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.collection("auditLogs").add({
      ...entry,
      perubahan: entry.perubahan ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      requestId: entry.requestId ?? null,
      dibuatPada: new Date(),
    });
  } catch (error) {
    logger.error({ err: error, aksi: entry.aksi }, "gagal menulis audit log");
  }
}

export function auditFromRequest(
  req: Request,
  entry: Omit<AuditEntry, "ip" | "userAgent" | "requestId">,
): Promise<void> {
  return writeAudit({
    ...entry,
    ip: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
    requestId: req.requestId ?? null,
  });
}
