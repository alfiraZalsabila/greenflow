import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";

import {
  LaporanOverview,
  LaporanWatering,
  LaporanWateringReport,
  LaporanMoistureTrend,
  LaporanMoistureTrendReport,
} from "./laporan.types.js";
import { getUnifiedWaterings } from "../waterings/waterings.service.js";
import type { WateringResponse } from "../waterings/waterings.types.js";

const db = getFirestore();
const rtdb = getDatabase();

/** Perkiraan laju pompa untuk estimasi volume air. */
const PUMP_LITER_PER_MINUTE = 5;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function inRange(value: string, from: Date, to: Date): boolean {
  const time = Date.parse(value);
  return !Number.isNaN(time) && time >= from.getTime() && time <= to.getTime();
}

async function getReadingsInRange(
  lahanId: string,
  from: Date,
  to: Date,
): Promise<LaporanMoistureTrend[]> {
  // Koleksi `readings` belum tentu ada. Query hanya memakai filter lahan
  // (single-field index) lalu rentang tanggal disaring di memori.
  try {
    const snap = await db
      .collection("readings")
      .where("lahanId", "==", lahanId)
      .get();

    return snap.docs
      .map((doc): LaporanMoistureTrend | null => {
        const data = doc.data();
        const readAt = toDate(data.readAt);
        const moisture = Number(data.moisture ?? data.moisturePct);
        if (!readAt || !Number.isFinite(moisture)) return null;
        if (readAt < from || readAt > to) return null;

        return {
          timestamp: readAt.toISOString(),
          moisture: Math.round(moisture * 100) / 100,
          isWateringEvent: false,
        };
      })
      .filter((item): item is LaporanMoistureTrend => item !== null);
  } catch {
    return [];
  }
}

/**
 * Status terbaru perangkat (RTDB `/irigasi/status`) sebagai satu titik tren.
 * Tidak ada riwayat kontinu di Firebase, jadi titik ini hanya ditambahkan bila
 * waktunya masih berada dalam periode laporan.
 */
async function getCurrentStatusPoint(
  from: Date,
  to: Date,
): Promise<LaporanMoistureTrend | null> {
  try {
    const snapshot = await rtdb.ref("irigasi/status").get();
    const value = snapshot.val() as Record<string, unknown> | null;
    if (!value) return null;

    const ts = Number(value.ts);
    const date = Number.isFinite(ts) && ts > 0
      ? new Date(ts)
      : toDate(value.waktu);
    if (!date || date < from || date > to) return null;

    const tanah = value.tanah as Record<string, unknown> | undefined;
    const moisture = Number(tanah?.rata ?? value.tanah_rata);
    if (!Number.isFinite(moisture)) return null;

    return {
      timestamp: date.toISOString(),
      moisture: Math.round(moisture * 100) / 100,
      isWateringEvent: false,
    };
  } catch {
    return null;
  }
}

function getWateringsInRange(
  waterings: WateringResponse[],
  from: Date,
  to: Date,
): WateringResponse[] {
  return waterings.filter((item) => inRange(item.startedAt, from, to));
}

function toMoisturePoints(
  waterings: WateringResponse[],
): LaporanMoistureTrend[] {
  return waterings
    .filter((item) => item.startedAt.length > 0)
    .map((item) => ({
      timestamp: item.startedAt,
      moisture: Math.round(item.moistureBeforePct * 100) / 100,
      isWateringEvent: true,
      wateringType: item.pemicu,
    }));
}

function mergeTrendPoints(
  points: LaporanMoistureTrend[],
): LaporanMoistureTrend[] {
  const seen = new Set<string>();
  const merged: LaporanMoistureTrend[] = [];

  for (const point of points) {
    const key = `${point.timestamp}|${point.moisture}|${point.isWateringEvent}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(point);
  }

  return merged.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

export class LaporanService {
  /**
   * Get overview report for a lahan within date range
   */
  static async getOverviewReport(
    lahanId: string,
    from: Date,
    to: Date,
  ): Promise<LaporanOverview> {
    const allWaterings = await getUnifiedWaterings(lahanId);
    const waterings = getWateringsInRange(allWaterings, from, to);

    const totalWaterings = waterings.length;
    const totalAutomatic = waterings.filter((w) => w.pemicu === "otomatis").length;
    const totalManual = waterings.filter((w) => w.pemicu === "manual").length;

    const avgDurationSec =
      totalWaterings > 0
        ? waterings.reduce((sum, w) => sum + (w.durationSec || 0), 0) / totalWaterings
        : 0;

    const totalWaterUsedEstimate = waterings.reduce(
      (sum, w) => sum + (w.durationSec / 60) * PUMP_LITER_PER_MINUTE,
      0,
    );

    const [readings, statusPoint] = await Promise.all([
      getReadingsInRange(lahanId, from, to),
      getCurrentStatusPoint(from, to),
    ]);

    const trendPoints = mergeTrendPoints([
      ...readings,
      ...toMoisturePoints(waterings),
      ...(statusPoint ? [statusPoint] : []),
    ]);

    const moistureValues = trendPoints.map((point) => point.moisture);
    const moistureStats =
      moistureValues.length > 0
        ? {
            min: Math.min(...moistureValues),
            max: Math.max(...moistureValues),
            avg:
              moistureValues.reduce((sum, value) => sum + value, 0) /
              moistureValues.length,
          }
        : { min: 0, max: 0, avg: 0 };

    // Efisiensi sistem: seluruh riwayat tersimpan dianggap selesai.
    const systemEfficiency = totalWaterings > 0 ? 100 : 0;

    return {
      lahanId,
      period: { from: from.toISOString(), to: to.toISOString() },
      totalWaterings,
      totalAutomatic,
      totalManual,
      avgDurationSec: Math.round(avgDurationSec * 100) / 100,
      totalWaterUsedEstimate: Math.round(totalWaterUsedEstimate * 100) / 100,
      moistureStats: {
        min: Math.round(moistureStats.min * 100) / 100,
        max: Math.round(moistureStats.max * 100) / 100,
        avg: Math.round(moistureStats.avg * 100) / 100,
      },
      systemEfficiency: Math.round(systemEfficiency * 100) / 100,
    };
  }

  /**
   * Get watering report for a lahan within date range
   */
  static async getWateringReport(
    lahanId: string,
    from: Date,
    to: Date,
  ): Promise<LaporanWateringReport> {
    const allWaterings = await getUnifiedWaterings(lahanId);
    const waterings: LaporanWatering[] = getWateringsInRange(
      allWaterings,
      from,
      to,
    ).map((data) => {
      const efficiency =
        data.moistureAfterPct > data.moistureBeforePct
          ? ((data.moistureAfterPct - data.moistureBeforePct) /
              (100 - data.moistureBeforePct)) *
            100
          : 0;

      return {
        id: data.id,
        date: data.startedAt,
        type: data.pemicu,
        durationSec: data.durationSec,
        moistureBefore: data.moistureBeforePct,
        moistureAfter: data.moistureAfterPct,
        efficiency: Math.round(efficiency * 100) / 100,
      };
    });

    return {
      lahanId,
      period: { from: from.toISOString(), to: to.toISOString() },
      waterings,
    };
  }

  /**
   * Get moisture trend report for a lahan within date range
   */
  static async getMoistureTrendReport(
    lahanId: string,
    from: Date,
    to: Date,
  ): Promise<LaporanMoistureTrendReport> {
    const allWaterings = await getUnifiedWaterings(lahanId);
    const waterings = getWateringsInRange(allWaterings, from, to);

    const [readings, statusPoint] = await Promise.all([
      getReadingsInRange(lahanId, from, to),
      getCurrentStatusPoint(from, to),
    ]);

    const data = mergeTrendPoints([
      ...readings,
      ...toMoisturePoints(waterings),
      ...(statusPoint ? [statusPoint] : []),
    ]);

    return {
      lahanId,
      period: { from: from.toISOString(), to: to.toISOString() },
      data,
    };
  }
}
