import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export interface RealtimeDeviceData {
  moisture?: number;
  status?: "Kering" | "Normal" | "Basah";
  kering?: number;
  basah?: number;
  temperature?: number;
  online?: boolean;
}

export interface RealtimeSoilSensor {
  raw?: number;
  pct?: number;
}

export interface RealtimeStatus {
  tanah?: {
    s1?: RealtimeSoilSensor;
    s2?: RealtimeSoilSensor;
    s3?: RealtimeSoilSensor;
    rata?: number;
    kategori?: string;
  };
  udara?: {
    suhu?: number;
    rh?: number;
    dht_ok?: boolean;
  };
  fuzzy_detik?: number;
  mode?: string;
  pompa?: boolean;
  cooldown_detik?: number;
  siram_terakhir?: string;
  waktu?: string;
  wifi_rssi?: number;
  uptime_s?: number;
  ts?: number;
}

/**
 * Hook untuk membaca payload status terbaru ESP32 dari Realtime Database.
 * Endpoint: GET /api/v1/realtime/status
 */
export function useRealtimeStatus() {
  return useQuery({
    queryKey: ["realtime-status"],
    queryFn: async () => {
      try {
        const res = await api.get<{ status: RealtimeStatus | null }>(
          "/realtime/status",
        );
        return res.status ?? null;
      } catch (err) {
        console.error("[RealtimeDB] Error reading status:", err);
        throw err;
      }
    },
    refetchInterval: 5000, // Update setiap 5 detik
  });
}

/**
 * Hook untuk read data real-time dari Firebase Realtime Database via API
 */
export function useRealtimeDeviceData(sensorId?: string) {
  return useQuery({
    queryKey: ["realtime-device", sensorId],
    queryFn: async () => {
      if (!sensorId) return null;
      try {
        const res = await api.get<RealtimeDeviceData>(`/realtime/devices/${sensorId}`);
        return res || null;
      } catch (err) {
        console.error("[RealtimeDB] Error reading device data:", err);
        throw err;
      }
    },
    enabled: !!sensorId,
    refetchInterval: 5000, // Update setiap 5 detik
  });
}

/**
 * Hook untuk read semua sensor dalam 1 lahan dari Realtime Database
 */
export function useRealtimeLahanSensors(sensorIds?: string[]) {
  return useQuery({
    queryKey: ["realtime-sensors", sensorIds?.join(",")],
    queryFn: async () => {
      if (!sensorIds || sensorIds.length === 0) return {};
      try {
        const res = await api.get<Record<string, RealtimeDeviceData>>(`/realtime/devices?ids=${sensorIds.join(",")}`);
        return res || {};
      } catch (err) {
        console.error("[RealtimeDB] Error reading sensors data:", err);
        return {};
      }
    },
    enabled: !!sensorIds && sensorIds.length > 0,
    refetchInterval: 5000, // Update setiap 5 detik
  });
}

