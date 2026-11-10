import {
  getFirestore,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { WateringResponse, WateringDocument } from "./waterings.types.js";

const db = getFirestore();

interface WateringStatsResponse {
  totalWaterings: number;
  totalDurationSec: number;
  averageDurationSec: number;
  manualWaterings: number;
  automaticWaterings: number;
  successfulWaterings: number;
  failedWaterings: number;
  averageMoistureChange: number;
}

export interface WateringFilters {
  pemicu?: "otomatis" | "manual";
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

/** Terapkan filter pemicu dan rentang tanggal pada hasil gabungan. */
function applyFilters(
  items: WateringResponse[],
  filters: WateringFilters,
): WateringResponse[] {
  const fromMs = filters.from
    ? Date.parse(`${filters.from}T00:00:00`)
    : Number.NaN;
  const toMs = filters.to ? Date.parse(`${filters.to}T23:59:59.999`) : Number.NaN;

  return items.filter((item) => {
    if (filters.pemicu && item.pemicu !== filters.pemicu) return false;

    const startedMs = Date.parse(item.startedAt);
    if (!Number.isNaN(startedMs)) {
      if (!Number.isNaN(fromMs) && startedMs < fromMs) return false;
      if (!Number.isNaN(toMs) && startedMs > toMs) return false;
    }

    return true;
  });
}

/** Cache singkat untuk menentukan lahan tunggal (dokumen riwayat perangkat
 * belum menyimpan `lahanId`). */
let cachedDefaultLahan: { id: string; at: number } | null = null;

async function getDefaultLahanId(): Promise<string> {
  if (cachedDefaultLahan && Date.now() - cachedDefaultLahan.at < 60_000) {
    return cachedDefaultLahan.id;
  }

  const snap = await db.collection("lahan").limit(2).get();
  const id = snap.size === 1 ? (snap.docs[0]?.id ?? "") : "";
  cachedDefaultLahan = { id, at: Date.now() };
  return id;
}

function toIsoString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const toDate = (value as { toDate: unknown }).toDate;
    if (typeof toDate === "function") {
      const date = (toDate as () => Date).call(value);
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }
  if (value instanceof Date) return value.toISOString();
  return "";
}

/** Waktu perangkat ditulis sebagai "YYYY-MM-DD HH:mm:ss" (waktu lokal). */
function parseWaktu(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") return "";
  const date = new Date(value.trim().replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function toWateringResponse(doc: QueryDocumentSnapshot<DocumentData>): WateringResponse {
  const data = doc.data() as WateringDocument;
  return {
    id: doc.id,
    lahanId: data.lahanId,
    perangkatId: data.perangkatId,
    pemicu: data.pemicu,
    dimintaOleh: data.dimintaOleh,
    namaDimintaOleh: data.namaDimintaOleh,
    startedAt: toIsoString(data.startedAt),
    endedAt: toIsoString(data.endedAt),
    durationSec: data.durationSec,
    moistureBeforePct: data.moistureBeforePct,
    moistureAfterPct: data.moistureAfterPct,
    status: data.status,
  };
}

/**
 * `riwayat_siram` ditulis langsung oleh firmware ESP32 setiap pompa selesai
 * menyiram. Dokumennya tidak memakai skema `waterings`, jadi dipetakan ke
 * bentuk respons yang sama agar bisa ditampilkan di halaman riwayat.
 */
function riwayatToWatering(
  doc: QueryDocumentSnapshot<DocumentData>,
  fallbackLahanId: string,
): WateringResponse {
  const data = doc.data();
  const startedAt =
    toIsoString(data.ts) || parseWaktu(data.waktu) || "";
  const mode = typeof data.mode === "string" ? data.mode.toLowerCase() : "";

  return {
    id: doc.id,
    lahanId:
      typeof data.lahanId === "string" && data.lahanId.length > 0
        ? data.lahanId
        : fallbackLahanId,
    perangkatId:
      typeof data.perangkatId === "string" ? data.perangkatId : "",
    pemicu: mode === "manual" ? "manual" : "otomatis",
    dimintaOleh: null,
    namaDimintaOleh: null,
    startedAt,
    endedAt: startedAt,
    durationSec: Number(data.durasi_detik ?? 0),
    moistureBeforePct: Number(data.tanah_awal ?? 0),
    // Firmware hanya mencatat kelembapan awal; samakan agar tidak dianggap
    // sebagai penurunan kelembapan 100%.
    moistureAfterPct: Number(data.tanah_akhir ?? data.tanah_awal ?? 0),
    status: "selesai",
  };
}

function mergeAndSort(
  waterings: WateringResponse[],
  riwayat: WateringResponse[],
): WateringResponse[] {
  const byId = new Map<string, WateringResponse>();

  for (const item of [...waterings, ...riwayat]) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  return [...byId.values()].sort((a, b) => {
    const timeA = Date.parse(a.startedAt);
    const timeB = Date.parse(b.startedAt);
    return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
  });
}

async function getRiwayatSiram(fallbackLahanId: string): Promise<WateringResponse[]> {
  const snap = await db.collection("riwayat_siram").get();
  return snap.docs.map((doc) => riwayatToWatering(doc, fallbackLahanId));
}

/**
 * Composite index (mis. `lahanId` + `startedAt`) belum tentu sudah dibuat pada
 * project Firebase. Bila index belum ada, Firestore melempar gRPC code 9
 * (FAILED_PRECONDITION). Deteksi agar query bisa memakai jalur cadangan.
 */
function isMissingIndexError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? Number((error as { code: unknown }).code) : NaN;
  if (code === 9) return true;
  return error instanceof Error && /requires an index/i.test(error.message);
}

function startedAtMillis(doc: QueryDocumentSnapshot<DocumentData>): number {
  const value = doc.get("startedAt");
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function sortByStartedAtDesc(
  docs: QueryDocumentSnapshot<DocumentData>[],
): QueryDocumentSnapshot<DocumentData>[] {
  return [...docs].sort((a, b) => startedAtMillis(b) - startedAtMillis(a));
}

async function getWateringDocsByLahan(
  lahanId: string,
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  try {
    const snap = await db
      .collection("waterings")
      .where("lahanId", "==", lahanId)
      .orderBy("startedAt", "desc")
      .get();
    return snap.docs;
  } catch (error) {
    if (!isMissingIndexError(error)) throw error;

    const snap = await db
      .collection("waterings")
      .where("lahanId", "==", lahanId)
      .get();
    return sortByStartedAtDesc(snap.docs);
  }
}

async function getAllWateringDocs(): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const snap = await db.collection("waterings").get();
  return sortByStartedAtDesc(snap.docs);
}

/**
 * Gabungan riwayat dari web (`waterings`) dan perangkat (`riwayat_siram`),
 * sudah diurutkan dari yang terbaru. Dipakai juga oleh modul laporan.
 */
export async function getUnifiedWaterings(
  lahanId?: string,
): Promise<WateringResponse[]> {
  const defaultLahanId = await getDefaultLahanId();

  if (lahanId) {
    const docs = await getWateringDocsByLahan(lahanId);
    const riwayat =
      defaultLahanId === lahanId ? await getRiwayatSiram(lahanId) : [];
    return mergeAndSort(docs.map(toWateringResponse), riwayat);
  }

  const docs = await getAllWateringDocs();
  const riwayat = await getRiwayatSiram(defaultLahanId);
  return mergeAndSort(docs.map(toWateringResponse), riwayat);
}

export class WateringsService {
  /**
   * Ambil semua waterings per lahan dengan pagination.
   * Menggabungkan koleksi `waterings` (web) dan `riwayat_siram` (perangkat).
   */
  static async getWateringsByLahan(
    lahanId: string,
    limit: number = 20,
    offset: number = 0,
    filters: WateringFilters = {},
  ): Promise<{ waterings: WateringResponse[]; total: number }> {
    const [docs, defaultLahanId] = await Promise.all([
      getWateringDocsByLahan(lahanId),
      getDefaultLahanId(),
    ]);

    // `riwayat_siram` global; hanya diatribusikan ke lahan ini bila lahan tunggal.
    const riwayat =
      defaultLahanId === lahanId ? await getRiwayatSiram(lahanId) : [];

    const merged = applyFilters(
      mergeAndSort(docs.map(toWateringResponse), riwayat),
      filters,
    );

    return {
      waterings: merged.slice(offset, offset + limit),
      total: merged.length,
    };
  }

  /**
   * Ambil semua waterings dari semua lahan dengan pagination.
   */
  static async getAllWaterings(
    limit: number = 20,
    offset: number = 0,
    filters: WateringFilters = {},
  ): Promise<{ waterings: WateringResponse[]; total: number }> {
    const [docs, defaultLahanId] = await Promise.all([
      getAllWateringDocs(),
      getDefaultLahanId(),
    ]);

    const riwayat = await getRiwayatSiram(defaultLahanId);
    const merged = applyFilters(
      mergeAndSort(docs.map(toWateringResponse), riwayat),
      filters,
    );

    return {
      waterings: merged.slice(offset, offset + limit),
      total: merged.length,
    };
  }

  /**
   * Ambil waterings per perangkat
   */
  static async getWateringsByDevice(
    perangkatId: string,
    limit: number = 20
  ): Promise<WateringResponse[]> {
    try {
      const snap = await db
        .collection("waterings")
        .where("perangkatId", "==", perangkatId)
        .orderBy("startedAt", "desc")
        .limit(limit)
        .get();

      return snap.docs.map(toWateringResponse);
    } catch (error) {
      if (!isMissingIndexError(error)) throw error;

      const snap = await db
        .collection("waterings")
        .where("perangkatId", "==", perangkatId)
        .get();

      return sortByStartedAtDesc(snap.docs)
        .slice(0, limit)
        .map(toWateringResponse);
    }
  }

  /**
   * Get watering statistics for a lahan
   */
  static async getWateringStats(lahanId: string): Promise<WateringStatsResponse> {
    const [docs, defaultLahanId] = await Promise.all([
      getWateringDocsByLahan(lahanId),
      getDefaultLahanId(),
    ]);

    const riwayat =
      defaultLahanId === lahanId ? await getRiwayatSiram(lahanId) : [];

    const merged = mergeAndSort(docs.map(toWateringResponse), riwayat).slice(0, 100);

    const totalWaterings = merged.length;
    const totalDurationSec = merged.reduce((sum, w) => sum + (w.durationSec || 0), 0);
    const averageDurationSec = totalWaterings > 0 ? totalDurationSec / totalWaterings : 0;
    const manualWaterings = merged.filter((w) => w.pemicu === "manual").length;
    const automaticWaterings = merged.filter((w) => w.pemicu === "otomatis").length;
    const successfulWaterings = merged.filter((w) => w.status === "selesai").length;
    const failedWaterings = merged.filter((w) => w.status === "gagal").length;

    const moistureChanges = merged
      .filter((w) => w.moistureAfterPct !== undefined && w.moistureBeforePct !== undefined)
      .map((w) => w.moistureAfterPct - w.moistureBeforePct);

    const averageMoistureChange =
      moistureChanges.length > 0 ? moistureChanges.reduce((sum, c) => sum + c, 0) / moistureChanges.length : 0;

    return {
      totalWaterings,
      totalDurationSec,
      averageDurationSec: Math.round(averageDurationSec),
      manualWaterings,
      automaticWaterings,
      successfulWaterings,
      failedWaterings,
      averageMoistureChange: Math.round(averageMoistureChange * 100) / 100,
    };
  }
}
