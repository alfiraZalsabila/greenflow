import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export interface Lahan {
  id: string;
  nama: string;
  lokasi: string;
  luasM2: number | null;
  status: "aktif" | "nonaktif";
  parameter: {
    ambangKering: number;
    titikTengah: number;
    ambangCukup: number;
    maxDurationSec: number;
    intervalSec: number;
    fuzzy: {
      keringSec: number;
      lembapSec: number;
      basahSec: number;
    };
  };
}

export interface Device {
  id: string;
  nama: string;
  tipe: "pengendali" | "sensor" | "pompa";
  lahanId: string;
  status: "aktif" | "nonaktif";
  statusTerakhir?: {
    moisturePct: number;
    pumpState: "ON" | "OFF";
    online: boolean;
    readAt: string;
  };
}

export interface Reading {
  id: string;
  moisture: number; // standardized field name
  pumpState: "ON" | "OFF";
  readAt: string;
}

export interface Watering {
  id: string;
  lahanId: string;
  perangkatId: string;
  pemicu: "otomatis" | "manual";
  dimintaOleh?: string;
  namaDimintaOleh?: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  moistureBeforePct: number;
  moistureAfterPct: number;
  status: "selesai" | "sedang_berjalan" | "gagal";
}

/**
 * Fetch semua lahan
 */
export function useLahan() {
  return useQuery({
    queryKey: ["lahan"],
    queryFn: async () => {
      const res = await api.get<{ lahan: Lahan[] }>("/lahan");
      return res.lahan || [];
    },
    staleTime: 1000 * 60 * 5, // 5 menit
  });
}

/**
 * Fetch perangkat per lahan
 */
export function useDevices(lahanId?: string) {
  return useQuery({
    queryKey: ["devices", lahanId],
    queryFn: async () => {
      const params = lahanId ? `?lahanId=${lahanId}` : "";
      const res = await api.get<{ devices: Device[] }>(`/devices${params}`);
      return res.devices || [];
    },
    enabled: !!lahanId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch readings (telemetri) terbaru per perangkat
 */
export function useLatestReadings(perangkatId?: string) {
  return useQuery({
    queryKey: ["readings", perangkatId],
    queryFn: async () => {
      if (!perangkatId) return null;
      const res = await api.get<Reading>(`/readings/latest/${perangkatId}`);
      return res || null;
    },
    enabled: !!perangkatId,
    staleTime: 1000 * 30, // 30 detik untuk data real-time
  });
}
