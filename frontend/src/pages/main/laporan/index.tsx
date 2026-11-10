import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Chart from "react-apexcharts";
import { PageMeta } from "@/components/shared/page-meta";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LahanData {
  id: string;
  nama: string;
}

interface OverviewReport {
  lahanId: string;
  period: { from: string; to: string };
  totalWaterings: number;
  totalAutomatic: number;
  totalManual: number;
  avgDurationSec: number;
  totalWaterUsedEstimate: number;
  moistureStats: { min: number; max: number; avg: number };
  systemEfficiency: number;
}

interface WateringData {
  id: string;
  date: string;
  type: "otomatis" | "manual";
  durationSec: number;
  moistureBefore: number;
  moistureAfter: number;
  efficiency: number;
}

interface WateringReport {
  lahanId: string;
  period: { from: string; to: string };
  waterings: WateringData[];
}

interface MoistureTrendData {
  timestamp: string;
  moisture: number;
  isWateringEvent: boolean;
  wateringType?: "otomatis" | "manual";
}

interface MoistureTrendReport {
  lahanId: string;
  period: { from: string; to: string };
  data: MoistureTrendData[];
}

type TabType = "overview" | "waterings" | "moisture";

export default function LaporanPage() {
  const [lahanId, setLahanId] = useState("");
  const [tab, setTab] = useState<TabType>("overview");
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Fetch lahan list
  const { data: lahanList = [], isLoading: lahanLoading, isError: lahanError } = useQuery({
    queryKey: ["lahan"],
    queryFn: async () => {
      try {
        const result = await api.get<{ lahan: LahanData[] }>("/lahan");
        return result.lahan || [];
      } catch (err) {
        console.error("Error fetching lahan:", err);
        return [];
      }
    },
  });

  // Pakai awal hari untuk `from` dan akhir hari untuk `to` (waktu lokal),
  // agar data pada tanggal yang dipilih ikut terhitung.
  const fromISO = new Date(`${dateFrom}T00:00:00`).toISOString();
  const toISO = new Date(`${dateTo}T23:59:59.999`).toISOString();

  // Fetch overview report
  const { data: overviewReport, isLoading: overviewLoading, isError: overviewError } = useQuery({
    queryKey: ["laporan-overview", lahanId, fromISO, toISO],
    queryFn: async () => {
      if (!lahanId) return null;
      try {
        const result = await api.get<OverviewReport>(
          `/laporan/overview/${lahanId}?from=${fromISO}&to=${toISO}`
        );
        return result;
      } catch (err) {
        console.error("Error fetching overview report:", err);
        return null;
      }
    },
    enabled: !!lahanId,
  });

  // Fetch waterings report
  const { data: wateringsReport, isLoading: wateringsLoading, isError: wateringsError } = useQuery({
    queryKey: ["laporan-waterings", lahanId, fromISO, toISO],
    queryFn: async () => {
      if (!lahanId) return null;
      try {
        const result = await api.get<WateringReport>(
          `/laporan/waterings/${lahanId}?from=${fromISO}&to=${toISO}`
        );
        return result;
      } catch (err) {
        console.error("Error fetching waterings report:", err);
        return null;
      }
    },
    enabled: !!lahanId,
  });

  // Fetch moisture trend report
  const { data: moistureReport, isLoading: moistureLoading, isError: moistureError } = useQuery({
    queryKey: ["laporan-moisture", lahanId, fromISO, toISO],
    queryFn: async () => {
      if (!lahanId) return null;
      try {
        const result = await api.get<MoistureTrendReport>(
          `/laporan/moisture-trend/${lahanId}?from=${fromISO}&to=${toISO}`
        );
        return result;
      } catch (err) {
        console.error("Error fetching moisture report:", err);
        return null;
      }
    },
    enabled: !!lahanId,
  });

  // Prepare chart data for moisture trend
  const moistureChartData = moistureReport && moistureReport.data.length > 0 ? {
    series: [
      {
        name: "Kelembapan (%)",
        data: moistureReport.data.map((d) => ({
          x: new Date(d.timestamp).getTime(),
          y: d.moisture,
        })),
      },
    ],
    options: {
      chart: {
        type: "line" as const,
        zoom: { enabled: true },
      },
      xaxis: {
        type: "datetime" as const,
      },
      yaxis: {
        min: 0,
        max: 100,
      },
      tooltip: {
        x: { format: "dd MMM yyyy HH:mm" },
      },
      stroke: { curve: "smooth" as const, width: 2 },
      theme: { mode: (document.documentElement.classList.contains("dark") ? "dark" : "light") as "dark" | "light" },
    },
  } : null;

  return (
    <>
      <PageMeta title="Laporan" description="Lihat laporan penyiraman dan kelembapan" />
      <PageBreadcrumb pageTitle="Laporan" />

      <div className="space-y-6">
        {/* Error Alerts */}
        {lahanError && (
          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <AlertDescription>Gagal memuat data lahan. Silakan coba lagi.</AlertDescription>
          </Alert>
        )}

        {overviewError && (
          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <AlertDescription>Gagal memuat laporan ringkasan. Silakan coba lagi.</AlertDescription>
          </Alert>
        )}

        {wateringsError && (
          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <AlertDescription>Gagal memuat laporan penyiraman. Silakan coba lagi.</AlertDescription>
          </Alert>
        )}

        {moistureError && (
          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <AlertDescription>Gagal memuat tren kelembapan. Silakan coba lagi.</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pilih Lahan
              </label>
              <Select value={lahanId} onValueChange={(value) => setLahanId(value || "")}>
                <SelectTrigger>
                  <SelectValue placeholder={lahanLoading ? "Memuat lahan..." : "Pilih lahan..."} />
                </SelectTrigger>
                <SelectContent>
                  {lahanList.map((lahan) => (
                    <SelectItem key={lahan.id} value={lahan.id}>
                      {lahan.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setDateFrom(
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  );
                  setDateTo(new Date().toISOString().split("T")[0]);
                }}
                variant="ghost"
              >
                7 Hari Terakhir
              </Button>
            </div>
          </div>
        </Card>

        {lahanLoading ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Spinner />
              <p className="text-gray-600 dark:text-gray-400">Memuat data lahan...</p>
            </div>
          </Card>
        ) : lahanId ? (
          <>
            {/* Tabs */}
            <Card className="p-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-4">
                  {(["overview", "waterings", "moisture"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-2 font-medium transition-colors ${
                        tab === t
                          ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      {t === "overview"
                        ? "Ringkasan"
                        : t === "waterings"
                        ? "Penyiraman"
                        : "Tren Kelembapan"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overview Tab */}
              {tab === "overview" && (
                <div className="mt-6">
                  {overviewLoading ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                      <Spinner />
                      <p className="text-gray-600 dark:text-gray-400">Memuat laporan ringkasan...</p>
                    </div>
                  ) : overviewReport &&
                    (overviewReport.totalWaterings > 0 ||
                      overviewReport.moistureStats.max > 0 ||
                      overviewReport.moistureStats.avg > 0) ? (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                          <p className="text-sm text-blue-600 dark:text-blue-300">Total Penyiraman</p>
                          <p className="mt-2 text-3xl font-bold text-blue-900 dark:text-blue-100">
                            {overviewReport.totalWaterings}
                          </p>
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                            Otomatis: {overviewReport.totalAutomatic} | Manual: {overviewReport.totalManual}
                          </p>
                        </div>

                        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                          <p className="text-sm text-green-600 dark:text-green-300">Durasi Rata-rata</p>
                          <p className="mt-2 text-3xl font-bold text-green-900 dark:text-green-100">
                            {Math.round(overviewReport.avgDurationSec)}s
                          </p>
                          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                            Total: {Math.round(overviewReport.totalWaterUsedEstimate)} L
                          </p>
                        </div>

                        <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                          <p className="text-sm text-purple-600 dark:text-purple-300">Efisiensi Sistem</p>
                          <p className="mt-2 text-3xl font-bold text-purple-900 dark:text-purple-100">
                            {Math.round(overviewReport.systemEfficiency)}%
                          </p>
                          <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                            Tingkat keberhasilan penyiraman
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <h4 className="font-semibold">Statistik Kelembapan</h4>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Kelembapan Min</p>
                            <p className="mt-1 text-2xl font-bold">
                              {Math.round(overviewReport.moistureStats.min)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Kelembapan Rata-rata</p>
                            <p className="mt-1 text-2xl font-bold">
                              {Math.round(overviewReport.moistureStats.avg)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Kelembapan Max</p>
                            <p className="mt-1 text-2xl font-bold">
                              {Math.round(overviewReport.moistureStats.max)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">Tidak ada data untuk periode ini</p>
                  )}
                </div>
              )}

              {/* Waterings Tab */}
              {tab === "waterings" && (
                <div className="mt-6">
                  {wateringsLoading ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                      <Spinner />
                      <p className="text-gray-600 dark:text-gray-400">Memuat laporan penyiraman...</p>
                    </div>
                  ) : wateringsReport && wateringsReport.waterings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableCell isHeader>Tanggal & Waktu</TableCell>
                            <TableCell isHeader>Tipe</TableCell>
                            <TableCell isHeader>Durasi</TableCell>
                            <TableCell isHeader>Kelembapan Awal</TableCell>
                            <TableCell isHeader>Kelembapan Akhir</TableCell>
                            <TableCell isHeader>Efisiensi</TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wateringsReport.waterings.map((w) => (
                            <TableRow key={w.id}>
                              <TableCell className="text-sm font-medium">
                                {new Date(w.date).toLocaleString("id-ID")}
                              </TableCell>
                              <TableCell>
                                {w.type === "otomatis" ? (
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                                    Otomatis
                                  </Badge>
                                ) : (
                                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                                    Manual
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{Math.round(w.durationSec)}s</TableCell>
                              <TableCell>{Math.round(w.moistureBefore)}%</TableCell>
                              <TableCell>{Math.round(w.moistureAfter)}%</TableCell>
                              <TableCell>
                                <span className="font-medium">
                                  {Math.round(w.efficiency)}%
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">Tidak ada data penyiraman untuk periode ini</p>
                  )}
                </div>
              )}

              {/* Moisture Trend Tab */}
              {tab === "moisture" && (
                <div className="mt-6">
                  {moistureLoading ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                      <Spinner />
                      <p className="text-gray-600 dark:text-gray-400">Memuat tren kelembapan...</p>
                    </div>
                  ) : moistureChartData ? (
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                      <Chart
                        options={moistureChartData.options}
                        series={moistureChartData.series}
                        type="area"
                        height={400}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">Tidak ada data tren kelembapan</p>
                  )}
                </div>
              )}
            </Card>
          </>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">Pilih lahan untuk melihat laporan</p>
          </Card>
        )}
      </div>
    </>
  );
}
