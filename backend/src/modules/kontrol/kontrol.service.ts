import { getDatabase } from "firebase-admin/database";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";

const rtdb = getDatabase();
const db = getFirestore();

/** Node kontrol yang dibaca perangkat. */
const KONTROL_PATH = "irigasi/kontrol";
/** Cermin di Firestore agar perintah terlihat pada koleksi `irigasi/kontrol`. */
const KONTROL_DOC = { collection: "irigasi", doc: "kontrol" } as const;

export type PumpMode = "auto" | "manual";
export type ControlAksi = "on" | "off" | "mode";

export interface ControlInput {
  lahanId: string;
  aksi: ControlAksi;
  mode?: PumpMode;
}

export interface ControlSnapshot {
  mode: PumpMode;
  aksi: string;
  detik: number;
  id: number;
}

export interface ControlResult {
  ok: true;
  perangkatId: string;
  perangkatNama: string;
  command: ControlSnapshot;
  dikirimPada: string;
}

interface DeviceRow {
  id: string;
  nama: string;
  tipe: string;
  lahanId: string;
  status: "aktif" | "nonaktif";
}

export function isControlAksi(value: unknown): value is ControlAksi {
  return value === "on" || value === "off" || value === "mode";
}

export function asPumpMode(value: unknown): PumpMode | undefined {
  return value === "auto" || value === "manual" ? value : undefined;
}

/**
 * Menulis perintah ke Realtime Database `/irigasi/kontrol`.
 *
 * Perangkat hanya menjalankan aksi ketika nilai `id` berubah, sehingga `id`
 * dinaikkan secara atomik lewat transaksi. Nilai `detik` selalu 0 karena
 * kontrol manual kini hanya ON/OFF tanpa durasi.
 */
async function writeControl(command: {
  mode?: PumpMode;
  aksi: string;
}): Promise<ControlSnapshot> {
  const ref = rtdb.ref(KONTROL_PATH);

  const { snapshot, committed } = await ref.transaction((current) => {
    const previous = (current ?? {}) as Record<string, unknown>;
    const previousId = Number(previous.id);
    const nextId = Number.isFinite(previousId)
      ? Math.max(0, Math.floor(previousId)) + 1
      : 1;

    const previousMode: PumpMode =
      previous.mode === "manual" ? "manual" : "auto";

    return {
      mode: command.mode ?? previousMode,
      aksi: command.aksi,
      detik: 0,
      id: nextId,
    } satisfies ControlSnapshot;
  });

  if (!committed || !snapshot.exists()) {
    throw AppError.serviceUnavailable(
      "Perintah tidak dapat dikirim ke perangkat. Coba lagi.",
    );
  }

  const value = snapshot.val() as Partial<ControlSnapshot> | null;
  const result: ControlSnapshot = {
    mode: value?.mode === "manual" ? "manual" : "auto",
    aksi: typeof value?.aksi === "string" ? value.aksi : "",
    detik: 0,
    id: Number(value?.id ?? 0),
  };

  // Cermin Firestore (best-effort) supaya dokumen `irigasi/kontrol` ikut
  // memperlihatkan perintah terakhir. Perangkat tetap membaca RTDB.
  try {
    await db
      .collection(KONTROL_DOC.collection)
      .doc(KONTROL_DOC.doc)
      .set(
        {
          mode: result.mode,
          aksi: result.aksi,
          detik: result.detik,
          id: result.id,
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
  } catch (error) {
    logger.warn({ err: error }, "gagal mencerminkan perintah ke Firestore");
  }

  return result;
}

/** Membaca isi node kontrol RTDB saat ini. */
export async function getControlState(): Promise<ControlSnapshot> {
  const snapshot = await rtdb.ref(KONTROL_PATH).get();
  const value = (snapshot.val() ?? {}) as Record<string, unknown>;

  return {
    mode: value.mode === "manual" ? "manual" : "auto",
    aksi: typeof value.aksi === "string" ? value.aksi : "",
    detik: 0,
    id: Number(value.id ?? 0),
  };
}

async function resolveDevice(lahanId: string): Promise<DeviceRow> {
  const lahan = await db.collection("lahan").doc(lahanId).get();
  if (!lahan.exists) {
    throw AppError.notFound("Lahan tidak ditemukan.");
  }

  const snap = await db
    .collection("devices")
    .where("lahanId", "==", lahanId)
    .get();

  // Node RTDB saat ini masih global (/irigasi). Bila perangkat belum
  // didaftarkan di Firestore, perintah tetap boleh dikirim lewat jalur itu.
  if (snap.empty) {
    return {
      id: "irigasi",
      nama: "Perangkat Irigasi",
      tipe: "pengendali",
      lahanId,
      status: "aktif",
    };
  }

  const rows = snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      nama: typeof data.nama === "string" ? data.nama : doc.id,
      tipe: typeof data.tipe === "string" ? data.tipe : "",
      lahanId: typeof data.lahanId === "string" ? data.lahanId : lahanId,
      status: data.status === "nonaktif" ? "nonaktif" : "aktif",
    } satisfies DeviceRow;
  });

  const device =
    rows.find((row) => row.tipe === "pengendali" && row.status === "aktif") ??
    rows.find((row) => row.status === "aktif") ??
    rows.find((row) => row.tipe === "pengendali") ??
    rows[0];

  if (!device) {
    throw AppError.conflict("Perangkat pada lahan ini tidak tersedia.");
  }

  if (device.status === "nonaktif") {
    throw AppError.conflict(
      `Perangkat "${device.nama}" sedang nonaktif. Aktifkan perangkat terlebih dahulu.`,
    );
  }

  return device;
}

/**
 * Mengirim perintah kontrol manual (ON/OFF) atau perubahan mode.
 */
export async function sendControl(
  input: ControlInput,
  actor: { id: string; nama: string },
): Promise<ControlResult> {
  if (!isControlAksi(input.aksi)) {
    throw AppError.badRequest(
      [{ field: "aksi", issue: "Aksi harus on, off, atau mode." }],
      "Aksi tidak valid.",
    );
  }

  let mode: PumpMode | undefined;
  let aksiFirmware = "";
  let kind: ControlAksi = input.aksi;

  switch (input.aksi) {
    case "mode": {
      const requested = asPumpMode(input.mode);
      if (!requested) {
        throw AppError.badRequest(
          [{ field: "mode", issue: "Mode harus auto atau manual." }],
          "Mode tidak valid.",
        );
      }
      mode = requested;
      aksiFirmware = ""; // perubahan mode tidak memicu aksi pompa
      break;
    }
    case "on": {
      mode = "manual";
      aksiFirmware = "on";
      break;
    }
    case "off": {
      aksiFirmware = "off";
      kind = "off";
      break;
    }
  }

  // Validasi selesai; pastikan lahan dan perangkat benar-benar ada.
  const device = await resolveDevice(input.lahanId);

  let snapshot: ControlSnapshot;
  try {
    snapshot = await writeControl({ mode, aksi: aksiFirmware });
  } catch (error) {
    logger.error(
      { err: error, lahanId: input.lahanId },
      "gagal menulis kontrol perangkat",
    );
    throw error;
  }

  const now = new Date();
  const purgeAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Jejak perintah; kegagalan mencatat tidak membatalkan perintah.
  try {
    await db.collection("commands").add({
      deviceId: device.id,
      lahanId: input.lahanId,
      kind,
      params: mode ? { mode } : {},
      kontrolId: snapshot.id,
      status: "menunggu",
      ackMethod: "heuristik",
      requestedBy: actor.id,
      requestedByName: actor.nama,
      createdAt: Timestamp.now(),
      ackedAt: null,
      purgeAt: Timestamp.fromDate(purgeAt),
    });
  } catch (error) {
    logger.warn({ err: error }, "gagal mencatat perintah ke Firestore");
  }

  return {
    ok: true,
    perangkatId: device.id,
    perangkatNama: device.nama,
    command: snapshot,
    dikirimPada: now.toISOString(),
  };
}
