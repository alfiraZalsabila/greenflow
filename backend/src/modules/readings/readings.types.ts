import { Timestamp } from "firebase-admin/firestore";

export interface ReadingFuzzy {
  muKering: number; // fuzzy membership dry
  muLembap: number; // fuzzy membership medium
  muBasah: number; // fuzzy membership wet
  label: "kering" | "lembap" | "basah"; // fuzzy output label
  durationSec: number; // Sugeno output (irrigation duration)
}

export interface ReadingDocument {
  id: string; // doc ID = {perangkatId}_{readAtISO} (e.g., "gf-01_2026-11-01T20:35Z")
  perangkatId: string;
  lahanId: string;
  moisture: number; // 0-100 (standardized field name - NOT moisturePct or soilMoisture)
  pumpState: "ON" | "OFF";
  readAt: Timestamp; // UTC time of reading
  fuzzy?: ReadingFuzzy; // optional fuzzy logic output
  versiSkema: number;
}

export interface ReadingResponse {
  id: string;
  perangkatId: string;
  lahanId: string;
  moisture: number; // standardized field name
  pumpState: "ON" | "OFF";
  readAt: string; // ISO8601
  fuzzy?: ReadingFuzzy;
}
