export interface LaporanOverview {
  lahanId: string;
  period: {
    from: string; // ISO string
    to: string; // ISO string
  };
  totalWaterings: number;
  totalAutomatic: number;
  totalManual: number;
  avgDurationSec: number;
  totalWaterUsedEstimate: number; // in liters (estimated)
  moistureStats: {
    min: number;
    max: number;
    avg: number;
  };
  systemEfficiency: number; // percentage
}

export interface LaporanWatering {
  id: string;
  date: string; // ISO string
  type: "otomatis" | "manual";
  durationSec: number;
  moistureBefore: number;
  moistureAfter: number;
  efficiency: number; // percentage
}

export interface LaporanWateringReport {
  lahanId: string;
  period: {
    from: string;
    to: string;
  };
  waterings: LaporanWatering[];
}

export interface LaporanMoistureTrend {
  timestamp: string; // ISO string
  moisture: number;
  isWateringEvent: boolean;
  wateringType?: "otomatis" | "manual";
}

export interface LaporanMoistureTrendReport {
  lahanId: string;
  period: {
    from: string;
    to: string;
  };
  data: LaporanMoistureTrend[];
}
