import { useLahan, useDevices } from "@/hooks/use-dashboard";
import { useRealtimeStatus } from "@/hooks/use-realtime-db";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { PageMeta } from "@/components/shared/page-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BoltIcon,
  LeafIcon,
  ChipIcon,
  WaterDropIcon,
  SunIcon,
  CloudIcon,
} from "@/icons";
import { Link } from "react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export default function DashboardPage() {
  const { data: lahanList = [], isLoading: lahanLoading } = useLahan();
  const [selectedLahan, setSelectedLahan] = useState<string | null>(null);

  // Set first lahan as default when loaded
  const lahanId = useMemo(() => {
    if (lahanList.length > 0 && !selectedLahan) {
      return lahanList[0].id;
    }
    return selectedLahan || lahanList[0]?.id;
  }, [lahanList, selectedLahan]);

  const { data: devices = [] } = useDevices(lahanId);

  // Read the latest ESP32 status payload from Firebase Realtime Database
  const { data: realtimeStatus, isLoading: realtimeLoading } =
    useRealtimeStatus();

  // Get pump status from devices (used as fallback when RTDB has no data)
  const pump = useMemo(() => {
    return devices.find((d) => d.tipe === "pompa");
  }, [devices]);

  // Fetch watering history
  const { data: wateringHistory = [] } = useQuery({
    queryKey: ["watering-history", lahanId],
    queryFn: async () => {
      try {
        const res = await api.get<{ waterings: Array<Record<string, unknown>> }>(`/waterings?lahanId=${lahanId}`);
        return res.waterings || [];
      } catch {
        return [];
      }
    },
    enabled: !!lahanId,
  });

  const moisture = realtimeStatus?.tanah?.rata ?? null;
  const kategori = realtimeStatus?.tanah?.kategori ?? null;
  const suhu = realtimeStatus?.udara?.suhu ?? null;
  const rh = realtimeStatus?.udara?.rh ?? null;
  const dhtOk = realtimeStatus?.udara?.dht_ok;
  const fuzzyDetik = realtimeStatus?.fuzzy_detik ?? null;
  const mode =
    realtimeStatus?.mode === "auto"
      ? "Otomatis"
      : realtimeStatus?.mode === "manual"
        ? "Manual"
        : null;
  const pumpState =
    realtimeStatus?.pompa !== undefined
      ? realtimeStatus.pompa
        ? "ON"
        : "OFF"
      : (pump?.statusTerakhir?.pumpState ?? "—");

  const currentLahan = lahanList.find((l) => l.id === lahanId);

  const kategoriLabel: Record<string, string> = {
    KERING: "Kering",
    NORMAL: "Normal",
    BASAH: "Basah",
    LEPAS: "Sensor lepas",
  };

  const getKategoriText = (value: string | null) => {
    if (!value) return null;
    return kategoriLabel[value.toUpperCase()] ?? value;
  };

  const getKategoriColor = (value: string | null) => {
    switch (value?.toUpperCase()) {
      case "KERING":
        return "text-red-600 dark:text-red-400";
      case "BASAH":
        return "text-blue-600 dark:text-blue-400";
      case "LEPAS":
        return "text-gray-600 dark:text-gray-400";
      default:
        return "text-green-600 dark:text-green-400";
    }
  };

  const updatedAt = realtimeStatus?.ts
    ? new Date(realtimeStatus.ts).toLocaleTimeString("id-ID", {
        timeZone: "Asia/Makassar",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  const formatUptime = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return "—";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days} hari ${hours} jam`;
    if (hours > 0) return `${hours} jam ${minutes} menit`;
    return `${minutes} menit`;
  };

  const formatClock = (value?: string) => {
    if (!value || value === "-" || value === "RTC-ERR") return "—";
    return value;
  };

  const stats = [
    {
      label: "Kelembapan tanah",
      value: moisture !== null ? `${moisture.toFixed(1)}%` : "—",
      hint: kategori
        ? `Kategori: ${getKategoriText(kategori)}`
        : "Menunggu data sensor",
      icon: LeafIcon,
      color: getKategoriColor(kategori),
    },
    {
      label: "Suhu udara",
      value: suhu !== null ? `${suhu.toFixed(1)}°C` : "—",
      hint:
        dhtOk === false
          ? "Sensor DHT tidak terbaca"
          : "Pembacaan sensor DHT11",
      icon: SunIcon,
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Kelembapan udara",
      value: rh !== null ? `${rh}%` : "—",
      hint: "Kelembapan relatif (RH)",
      icon: CloudIcon,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Status Pompa",
      value: pumpState,
      hint:
        mode !== null
          ? `Mode: ${mode}${
              realtimeStatus?.cooldown_detik
                ? ` · Cooldown ${realtimeStatus.cooldown_detik} detik`
                : ""
            }`
          : pumpState === "ON"
            ? "Pompa aktif"
            : "Pompa mati",
      icon: BoltIcon,
      color:
        pumpState === "ON"
          ? "text-orange-600 dark:text-orange-400"
          : "text-gray-600 dark:text-gray-400",
    },
  ];

  if (lahanLoading) {
    return (
      <div>
        <PageMeta
          title="Dashboard | GREENFLOW"
          description="Ringkasan kondisi lahan, status pompa, dan aktivitas penyiraman GREENFLOW."
        />
        <PageBreadcrumb pageTitle="Dashboard" />
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageMeta
        title="Dashboard | GREENFLOW"
        description="Ringkasan kondisi lahan, status pompa, dan aktivitas penyiraman GREENFLOW."
      />
      <PageBreadcrumb pageTitle="Dashboard" />

      {/* Lahan selector */}
      {lahanList.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pilih Lahan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lahanList.map((lahan) => (
                <Button
                  key={lahan.id}
                  variant={lahanId === lahan.id ? "default" : "ghost"}
                  size="sm"
                  nativeButton
                  onClick={() => setSelectedLahan(lahan.id)}
                >
                  {lahan.nama}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.label}>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <CardTitle className="mt-2 mb-0 text-3xl font-semibold">
                    {stat.value}
                  </CardTitle>
                </div>
                <span
                  className={`flex size-10 items-center justify-center rounded-lg bg-opacity-15 ${stat.color.replace(
                    "text-",
                    "bg-"
                  )} ${stat.color}`}
                >
                  <Icon className="size-5" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.hint}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Real-time status from Realtime Database */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-title-sm">
              <ChipIcon className="size-5" />
              Status Realtime Perangkat
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {updatedAt
                ? `Diperbarui ${updatedAt} WITA`
                : realtimeLoading
                  ? "Memuat data..."
                  : "Belum ada data dari perangkat"}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {realtimeStatus ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Kategori Tanah
                  </p>
                  <Badge
                    variant="light"
                    color={
                      kategori?.toUpperCase() === "KERING"
                        ? "error"
                        : kategori?.toUpperCase() === "BASAH"
                          ? "info"
                          : kategori?.toUpperCase() === "LEPAS"
                            ? "gray"
                            : "success"
                    }
                    size="sm"
                    className="mt-1"
                  >
                    {getKategoriText(kategori) ?? "—"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Rata-rata Tanah
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {moisture !== null ? `${moisture.toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Rekomendasi Fuzzy
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {fuzzyDetik !== null ? `${fuzzyDetik.toFixed(2)} detik` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Mode</p>
                  <p className="mt-1 text-lg font-semibold">{mode ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cooldown Pompa
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {realtimeStatus.cooldown_detik !== undefined
                      ? `${realtimeStatus.cooldown_detik} detik`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(["s1", "s2", "s3"] as const).map((key) => {
                  const sensor = realtimeStatus.tanah?.[key];
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                    >
                      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                        Sensor {key.toUpperCase()}
                      </p>
                      <p className="mt-1 text-2xl font-semibold">
                        {sensor?.pct !== undefined ? `${sensor.pct}%` : "—"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Raw: {sensor?.raw ?? "—"}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm sm:grid-cols-3 lg:grid-cols-5 dark:border-gray-800">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Siram Terakhir
                  </p>
                  <p className="mt-1 font-medium">
                    {formatClock(realtimeStatus.siram_terakhir)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Waktu Perangkat
                  </p>
                  <p className="mt-1 font-medium">
                    {formatClock(realtimeStatus.waktu)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Uptime
                  </p>
                  <p className="mt-1 font-medium">
                    {formatUptime(realtimeStatus.uptime_s)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sinyal WiFi
                  </p>
                  <p className="mt-1 font-medium">
                    {realtimeStatus.wifi_rssi !== undefined
                      ? `${realtimeStatus.wifi_rssi} dBm`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sensor DHT
                  </p>
                  <p className="mt-1 font-medium">
                    {dhtOk === undefined
                      ? "—"
                      : dhtOk
                        ? "Terbaca"
                        : "Tidak terbaca"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Menunggu data status dari perangkat. Pastikan ESP32 terhubung dan
              mengirim data ke Realtime Database.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Current lahan info */}
      {currentLahan && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Badge
                  variant="light"
                  color={currentLahan.status === "aktif" ? "success" : "warning"}
                  size="sm"
                >
                  {currentLahan.status === "aktif" ? "Aktif" : "Nonaktif"}
                </Badge>
                <CardTitle className="text-title-sm mt-2">
                  {currentLahan.nama}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {currentLahan.lokasi}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Luas</p>
                <p className="font-medium">
                  {currentLahan.luasM2 ? `${currentLahan.luasM2} m²` : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Ambang Kering</p>
                <p className="font-medium">{currentLahan?.parameter?.ambangKering ?? 30}%</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Ambang Cukup</p>
                <p className="font-medium">{currentLahan?.parameter?.ambangCukup ?? 60}%</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  Interval Pembacaan
                </p>
                <p className="font-medium">
                  {Math.round((currentLahan?.parameter?.intervalSec ?? 300) / 60)} menit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Devices grid */}
      {devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-title-sm">Perangkat ({devices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{device.nama}</p>
                      <Badge variant="light" color="gray" size="sm">
                        {device.tipe}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {device.id}
                    </p>

                    {/* Show sensor data if pengendali */}
                    {device.tipe === "pengendali" &&
                      device.statusTerakhir?.moisturePct !== undefined && (
                        <div className="mt-2 flex gap-4 text-xs">
                          <span>
                            💧 {device.statusTerakhir.moisturePct}% kelembapan
                          </span>
                        </div>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                    {device.statusTerakhir?.online !== undefined && (
                      <Badge
                        variant="light"
                        color={device.statusTerakhir.online ? "success" : "error"}
                        size="sm"
                      >
                        {device.statusTerakhir.online ? "Online" : "Offline"}
                      </Badge>
                    )}
                    {device.status === "aktif" && (
                      <Badge variant="light" color="success" size="sm">
                        Aktif
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-title-sm">
              <WaterDropIcon className="size-5" />
              Riwayat Penyiraman
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wateringHistory.length > 0 ? (
              <div className="mb-4 space-y-3">
                {wateringHistory.map((item, idx) => {
                  const historyItem = item as Record<string, unknown>;
                  const waktuObj = historyItem.waktu as { seconds?: number } | undefined;
                  const waktuVal = historyItem.waktu;
                  const waktuStr = waktuObj?.seconds 
                    ? new Date(waktuObj.seconds * 1000).toLocaleString("id-ID")
                    : typeof waktuVal === "string" || typeof waktuVal === "number"
                      ? new Date(waktuVal).toLocaleString("id-ID")
                      : "—";

                  return (
                    <div key={String(historyItem.id ?? idx)} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 dark:border-gray-800">
                      <div>
                        <p className="text-sm font-medium">{historyItem.tipe === "manual" ? "Manual" : "Otomatis"}</p>
                        <p className="text-xs text-gray-500">
                          {waktuStr}
                        </p>
                      </div>
                      <div className="dashboard-item-duration text-right">
                        <p className="text-sm font-semibold text-blue-600">{String(historyItem.durasi ?? historyItem.durasi_detik ?? "—")} detik</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Lihat semua event penyiraman otomatis dan manual untuk lahan ini.
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              nativeButton={false}
              render={<Link to="/penyiraman" />}
            >
              Buka Riwayat
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-title-sm">
              <BoltIcon className="size-5" />
              Kontrol Manual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Kontrol pompa secara manual untuk keperluan khusus.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              nativeButton={false}
              render={<Link to="/penyiraman" />}
            >
              Buka Kontrol
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
