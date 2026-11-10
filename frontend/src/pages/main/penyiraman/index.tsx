import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageMeta } from "@/components/shared/page-meta";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { api, ApiError } from "@/api/client";
import { useRealtimeStatus } from "@/hooks/use-realtime-db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BoltIcon, CheckCircleIcon, PlayIcon, XIcon } from "@/icons";

type ControlAksi = "on" | "off" | "mode";
type PumpMode = "auto" | "manual";

interface WateringData {
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

interface WateringsListResponse {
  waterings: WateringData[];
  total: number;
  limit: number;
  offset: number;
}

interface ControlRequest {
  lahanId: string;
  aksi: ControlAksi;
  mode?: PumpMode;
}

interface ControlResponse {
  ok: true;
  perangkatId: string;
  perangkatNama: string;
  command: { mode: PumpMode; aksi: string; detik: number; id: number };
  dikirimPada: string;
}

interface LahanData {
  id: string;
  nama: string;
}

const ITEMS_PER_PAGE = 10;

export default function KontrolPenyiramanPage() {
  const [selectedLahanId, setSelectedLahanId] = useState<string>("");
  const [confirmOn, setConfirmOn] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastCommand, setLastCommand] = useState<{
    aksi: ControlAksi;
    at: number;
    perangkatNama: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const queryClient = useQueryClient();

  // Status perangkat terbaru (polling 5 detik).
  const { data: status, dataUpdatedAt } = useRealtimeStatus();

  const {
    data: lahanList = [],
    isLoading: lahanLoading,
    isError: lahanError,
  } = useQuery({
    queryKey: ["lahan"],
    queryFn: async () => {
      const result = await api.get<{ lahan: LahanData[] }>("/lahan");
      return result.lahan || [];
    },
  });

  const {
    data: wateringsData = {
      waterings: [],
      total: 0,
      limit: ITEMS_PER_PAGE,
      offset: 0,
    },
    isLoading: wateringsLoading,
    isError: wateringsError,
  } = useQuery({
    queryKey: ["waterings", selectedLahanId, currentPage, ITEMS_PER_PAGE],
    queryFn: async () => {
      const offset = currentPage * ITEMS_PER_PAGE;
      let url = `/waterings?limit=${ITEMS_PER_PAGE}&offset=${offset}`;

      if (selectedLahanId) {
        url += `&lahanId=${selectedLahanId}`;
      }

      return api.get<WateringsListResponse>(url);
    },
  });

  const controlMutation = useMutation({
    mutationFn: (request: ControlRequest) =>
      api.post<ControlResponse>("/kontrol", request),
    onSuccess: (result, request) => {
      setConfirmOn(false);
      setLastCommand({
        aksi: request.aksi,
        at: Date.now(),
        perangkatNama: result.perangkatNama,
      });
      setErrorMessage("");
      setSuccessMessage(
        request.aksi === "on"
          ? `Perintah menyalakan pompa dikirim ke ${result.perangkatNama}.`
          : request.aksi === "off"
            ? "Perintah mematikan pompa dikirim."
            : "Mode diubah ke Otomatis.",
      );
      void queryClient.invalidateQueries({ queryKey: ["realtime-status"] });
      void queryClient.invalidateQueries({ queryKey: ["waterings"] });
      window.setTimeout(() => setSuccessMessage(""), 6000);
    },
    onError: (error) => {
      setConfirmOn(false);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Terjadi kesalahan. Silakan coba lagi.",
      );
    },
  });

  const send = (aksi: ControlAksi, mode?: PumpMode) => {
    if (!selectedLahanId) {
      setErrorMessage("Pilih lahan terlebih dahulu.");
      return;
    }
    setErrorMessage("");
    controlMutation.mutate({ lahanId: selectedLahanId, aksi, mode });
  };

  const pumpOn = status?.pompa === true;
  const currentMode: PumpMode = status?.mode === "manual" ? "manual" : "auto";
  const cooldown = status?.cooldown_detik ?? 0;
  const soilAvg = status?.tanah?.rata;
  const soilCategory = status?.tanah?.kategori ?? "-";
  const suhu = status?.udara?.suhu;
  const rh = status?.udara?.rh;
  const fuzzySec = status?.fuzzy_detik;
  const deviceOnline = status?.ts
    ? Date.now() / 1000 - status.ts < 60
    : false;

  const waitingForDevice =
    lastCommand?.aksi === "on" &&
    !pumpOn &&
    Date.now() - lastCommand.at < 20000;

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const formatDuration = (seconds: number) => {
    const safe = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safe / 60);
    const secs = safe % 60;
    return minutes > 0 ? `${minutes} m ${secs} s` : `${secs} s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "selesai":
        return <Badge color="success" variant="light">Selesai</Badge>;
      case "sedang_berjalan":
        return <Badge color="info" variant="light">Berjalan</Badge>;
      case "gagal":
        return <Badge color="error" variant="light">Gagal</Badge>;
      default:
        return <Badge color="gray" variant="light">{status}</Badge>;
    }
  };

  const recentWaterings = wateringsData?.waterings || [];
  const totalPages = Math.ceil((wateringsData?.total ?? 0) / ITEMS_PER_PAGE) || 1;
  const isBusy = controlMutation.isPending;

  if (lahanLoading) {
    return (
      <div>
        <PageMeta
          title="Kontrol Penyiraman"
          description="Kontrol pompa penyiraman secara manual"
        />
        <PageBreadcrumb pageTitle="Kontrol Penyiraman" />
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Spinner />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Memuat data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Kontrol Penyiraman"
        description="Kontrol pompa penyiraman secara manual"
      />
      <PageBreadcrumb pageTitle="Kontrol Penyiraman" />

      {lahanError && (
        <Alert className="mb-6 border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          <AlertDescription>
            Gagal memuat data lahan. Silakan coba lagi.
          </AlertDescription>
        </Alert>
      )}

      {wateringsError && (
        <Alert className="mb-6 border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          <AlertDescription>
            Gagal memuat riwayat penyiraman. Silakan coba lagi.
          </AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-300">
          <AlertDescription className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="mb-6 border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Ringkasan status perangkat */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card size="sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Status Pompa
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                pumpOn ? "animate-pulse bg-green-500" : "bg-gray-400"
              }`}
            />
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {pumpOn ? "Menyala" : "Mati"}
            </p>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Mode: {currentMode === "manual" ? "Manual" : "Otomatis"}
            {cooldown > 0 ? ` · cooldown ${cooldown} s` : ""}
          </p>
        </Card>

        <Card size="sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kelembapan Tanah
          </p>
          <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
            {typeof soilAvg === "number" ? `${soilAvg.toFixed(1)}%` : "-"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {soilCategory}
          </p>
        </Card>

        <Card size="sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Suhu / Kelembapan Udara
          </p>
          <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
            {typeof suhu === "number" ? `${suhu.toFixed(1)} °C` : "-"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {typeof rh === "number"
              ? `RH ${rh.toFixed(0)}%`
              : "DHT tidak tersedia"}
          </p>
        </Card>

        <Card size="sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Rekomendasi Fuzzy
          </p>
          <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
            {typeof fuzzySec === "number" ? `${fuzzySec.toFixed(1)} s` : "-"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {deviceOnline ? "Perangkat online" : "Perangkat offline"}
            {dataUpdatedAt
              ? ` · ${new Date(dataUpdatedAt).toLocaleTimeString("id-ID")}`
              : ""}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Panel kontrol */}
        <div className="lg:col-span-2">
          <Card>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Kontrol Pompa Manual
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Nyalakan atau matikan pompa. Perintah dikirim ke Firebase
                  tanpa durasi.
                </p>
              </div>
              <Badge color={deviceOnline ? "success" : "error"} variant="light">
                {deviceOnline ? "Online" : "Offline"}
              </Badge>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pilih Lahan
                </label>
                <Select
                  value={selectedLahanId}
                  onValueChange={(value) => {
                    if (value) {
                      setSelectedLahanId(value);
                      setCurrentPage(0);
                      setErrorMessage("");
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih lahan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lahanList.map((lahan) => (
                      <SelectItem key={lahan.id} value={lahan.id}>
                        {lahan.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {lahanList.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Belum ada lahan. Tambahkan lahan dan perangkat terlebih
                    dahulu.
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={() => {
                    if (!selectedLahanId) {
                      setErrorMessage("Pilih lahan terlebih dahulu.");
                      return;
                    }
                    setConfirmOn(true);
                  }}
                  disabled={!selectedLahanId || isBusy || pumpOn}
                  size="lg"
                  className="h-20 flex-col gap-2 text-base"
                >
                  <PlayIcon className="h-6 w-6" />
                  Nyalakan Pompa
                </Button>

                <Button
                  variant="destructive"
                  size="lg"
                  onClick={() => send("off")}
                  disabled={!selectedLahanId || isBusy || !pumpOn}
                  className="h-20 flex-col gap-2 text-base"
                >
                  <XIcon className="h-6 w-6" />
                  Matikan Pompa
                </Button>
              </div>

              {currentMode === "manual" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => send("mode", "auto")}
                  disabled={!selectedLahanId || isBusy}
                >
                  <BoltIcon className="h-4 w-4" />
                  Aktifkan Mode Otomatis
                </Button>
              )}

              {waitingForDevice && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
                  <Spinner className="h-4 w-4" />
                  Perintah terkirim ke {lastCommand?.perangkatNama}. Menunggu
                  perangkat mengeksekusi...
                </div>
              )}

              <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
                Pompa akan tetap menyala sampai Anda menekan “Matikan Pompa”
                atau batas pengaman perangkat tercapai.
              </p>
            </div>
          </Card>
        </div>

        {/* Info perangkat */}
        <div>
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Status Perangkat
            </h3>

            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Pembaruan</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {status?.waktu ?? "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Mode</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {currentMode === "manual" ? "Manual" : "Otomatis"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Cooldown</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {cooldown > 0 ? `${cooldown} detik` : "Tidak ada"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">
                  Siram terakhir
                </dt>
                <dd className="text-right font-medium text-gray-900 dark:text-white">
                  {status?.siram_terakhir || "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Wi-Fi</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {typeof status?.wifi_rssi === "number"
                    ? `${status.wifi_rssi} dBm`
                    : "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Uptime</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {typeof status?.uptime_s === "number"
                    ? formatDuration(status.uptime_s)
                    : "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Sensor DHT</dt>
                <dd>
                  <Badge
                    color={status?.udara?.dht_ok ? "success" : "error"}
                    variant="light"
                  >
                    {status?.udara?.dht_ok ? "OK" : "Error"}
                  </Badge>
                </dd>
              </div>
            </dl>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Rincian sensor tanah
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {(["s1", "s2", "s3"] as const).map((key) => {
                  const sensor = status?.tanah?.[key];
                  return (
                    <div key={key}>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {key.toUpperCase()}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {typeof sensor?.pct === "number"
                          ? `${sensor.pct.toFixed(1)}%`
                          : "-"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {typeof sensor?.raw === "number" ? sensor.raw : "-"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {!deviceOnline && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                Status perangkat belum diperbarui dalam 60 detik terakhir.
                Periksa koneksi Wi-Fi di lahan.
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Riwayat */}
      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Riwayat Penyiraman
          </h3>
          <Select
            value={selectedLahanId || "semua"}
            onValueChange={(value) => {
              if (value) {
                setSelectedLahanId(value === "semua" ? "" : value);
                setCurrentPage(0);
              }
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Lahan</SelectItem>
              {lahanList.map((lahan) => (
                <SelectItem key={lahan.id} value={lahan.id}>
                  {lahan.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {wateringsLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Spinner />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Memuat data...
            </p>
          </div>
        ) : recentWaterings.length === 0 ? (
          <p className="py-6 text-sm text-gray-600 dark:text-gray-400">
            Belum ada data penyiraman untuk filter yang dipilih.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/3">
                    {[
                      "Lahan",
                      "Tanggal",
                      "Waktu",
                      "Durasi",
                      "Kelembapan",
                      "Tipe",
                      "Status",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-5 py-3 text-start text-xs font-medium whitespace-nowrap text-gray-500 dark:text-gray-400"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentWaterings.map((watering) => (
                    <tr
                      key={watering.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-white/2"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        {lahanList.find((l) => l.id === watering.lahanId)?.nama ||
                          watering.lahanId}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        {formatDate(watering.startedAt)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {formatTime(watering.startedAt)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {formatDuration(watering.durationSec)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {watering.moistureBeforePct ||
                        watering.moistureAfterPct
                          ? `${watering.moistureBeforePct}% → ${watering.moistureAfterPct}%`
                          : "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <Badge
                          color={
                            watering.pemicu === "manual" ? "info" : "primary"
                          }
                          variant="light"
                        >
                          {watering.pemicu === "manual" ? "Manual" : "Otomatis"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(watering.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Menampilkan{" "}
                {wateringsData.total === 0
                  ? 0
                  : currentPage * ITEMS_PER_PAGE + 1}{" "}
                hingga{" "}
                {Math.min(
                  (currentPage + 1) * ITEMS_PER_PAGE,
                  wateringsData.total,
                )}{" "}
                dari {wateringsData.total} data
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  Sebelumnya
                </Button>
                <span className="flex items-center px-2 text-sm text-gray-600 dark:text-gray-400">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage + 1 >= totalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Konfirmasi nyalakan pompa */}
      <Dialog
        open={confirmOn}
        onOpenChange={(open) => {
          if (!open) setConfirmOn(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nyalakan Pompa</DialogTitle>
            <DialogDescription>
              Pompa pada lahan{" "}
              <strong>
                {lahanList.find((l) => l.id === selectedLahanId)?.nama || "-"}
              </strong>{" "}
              akan dinyalakan. Pastikan sumber air tersedia.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setConfirmOn(false)}
              disabled={isBusy}
            >
              Batal
            </Button>
            <Button
              onClick={() => send("on")}
              disabled={isBusy}
              className="flex-1"
            >
              {isBusy ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
              Nyalakan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
