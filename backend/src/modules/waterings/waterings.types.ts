export interface WateringDocument {
  lahanId: string;
  perangkatId: string;
  commandId?: string | null;
  pemicu: "otomatis" | "manual";
  dimintaOleh?: string | null;
  namaDimintaOleh?: string | null;
  startedAt: any; // Firestore Timestamp
  endedAt: any;
  durationSec: number;
  moistureBeforePct: number;
  moistureAfterPct: number;
  status: "selesai" | "sedang_berjalan" | "gagal";
  fuzzy?: {
    keringSec: number;
    lembapSec: number;
    basahSec: number;
  };
  dibuatPada: any;
}

export interface WateringResponse {
  id: string;
  lahanId: string;
  perangkatId: string;
  pemicu: "otomatis" | "manual";
  dimintaOleh?: string | null;
  namaDimintaOleh?: string | null;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  moistureBeforePct: number;
  moistureAfterPct: number;
  status: "selesai" | "sedang_berjalan" | "gagal";
}
