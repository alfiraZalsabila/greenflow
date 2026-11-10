import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageMeta } from "@/components/shared/page-meta";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
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

interface LahanData {
  id: string;
  nama: string;
}

export default function RiwayatPenyiramanPage() {
  const [lahanId, setLahanId] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"date" | "efficiency">("date");
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [typeFilter, setTypeFilter] = useState<"all" | "otomatis" | "manual">("all");
  const limit = 20;
  const offset = (page - 1) * limit;

  // Fetch lahan list
  const { data: lahanList = [], isLoading: lahanLoading, isError: lahanError } = useQuery({
    queryKey: ["lahan"],
    queryFn: async () => {
      const result = await api.get<{ lahan: LahanData[] }>("/lahan");
      return result.lahan || [];
    },
  });

  const { data = { waterings: [], total: 0, limit, offset: 0 }, isLoading, error } = useQuery({
    queryKey: ["waterings", lahanId, limit, offset, dateFilter, typeFilter, sortBy],
    queryFn: async () => {
      if (!lahanId) return { waterings: [], total: 0, limit, offset };
      const params = new URLSearchParams();
      params.append("lahanId", lahanId);
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());
      if (dateFilter.from) params.append("from", dateFilter.from);
      if (dateFilter.to) params.append("to", dateFilter.to);
      if (typeFilter !== "all") params.append("pemicu", typeFilter);
      
      try {
        const result = await api.get<WateringsListResponse>(
          `/waterings?${params}`
        );
        
        // Apply client-side sorting
        const sorted = [...(result.waterings || [])];
        if (sortBy === "efficiency") {
          sorted.sort((a, b) => {
            const effA = calculateEfficiency(a.moistureBeforePct, a.moistureAfterPct);
            const effB = calculateEfficiency(b.moistureBeforePct, b.moistureAfterPct);
            return effB - effA;
          });
        }
        
        return { ...result, waterings: sorted };
      } catch (err) {
        console.error("Error fetching waterings:", err);
        return { waterings: [], total: 0, limit, offset };
      }
    },
  });

  const calculateEfficiency = (before: number, after: number) => {
    if (after <= before) return 0;
    return ((after - before) / (100 - before)) * 100;
  };

  const waterings = data?.waterings || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes === 0) return `${secs}s`;
    if (secs === 0) return `${minutes}m`;
    return `${minutes}m ${secs}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "selesai":
        return (
          <Badge color="success" size="sm">
            Selesai
          </Badge>
        );
      case "sedang_berjalan":
        return (
          <Badge color="primary" size="sm">
            Berjalan
          </Badge>
        );
      case "gagal":
        return (
          <Badge color="error" size="sm">
            Gagal
          </Badge>
        );
      default:
        return <Badge size="sm">{status}</Badge>;
    }
  };

  const getTriggerBadge = (pemicu: string) => {
    switch (pemicu) {
      case "otomatis":
        return (
          <Badge color="primary" size="sm">
            🤖 Otomatis
          </Badge>
        );
      case "manual":
        return (
          <Badge color="warning" size="sm">
            👤 Manual
          </Badge>
        );
      default:
        return <Badge size="sm">{pemicu}</Badge>;
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return "text-green-600 dark:text-green-400";
    if (efficiency >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (efficiency >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <>
      <PageMeta title="Riwayat Penyiraman" description="Lihat catatan penyiraman" />
      <PageBreadcrumb pageTitle="Riwayat Penyiraman" />

      <div className="space-y-6">
        {/* Error Alerts */}
        {lahanError && (
          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <AlertDescription>Gagal memuat data lahan. Silakan coba lagi.</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <AlertDescription>Gagal memuat data penyiraman. Silakan coba lagi.</AlertDescription>
          </Alert>
        )}

        {/* Filters Card */}
        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Filter & Pencarian</h3>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pilih Lahan
              </label>
              <Select value={lahanId} onValueChange={(value) => {
                setLahanId(value || "");
                setPage(1);
              }}>
                <SelectTrigger className="w-full">
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
                value={dateFilter.from}
                onChange={(e) => {
                  setDateFilter({ ...dateFilter, from: e.target.value });
                  setPage(1);
                }}
                className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={dateFilter.to}
                onChange={(e) => {
                  setDateFilter({ ...dateFilter, to: e.target.value });
                  setPage(1);
                }}
                className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipe Penyiraman
              </label>
              <Select value={typeFilter} onValueChange={(value) => {
                if (value) setTypeFilter(value as "all" | "otomatis" | "manual");
                setPage(1);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="otomatis">Otomatis</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Urutkan
              </label>
              <Select value={sortBy} onValueChange={(value) => {
                if (value) setSortBy(value as "date" | "efficiency");
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Tanggal Terbaru</SelectItem>
                  <SelectItem value="efficiency">Efisiensi Tertinggi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Main Content Card */}
        <Card className="p-6">
          {!lahanId ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="text-4xl">🌾</div>
              <p className="text-gray-600 dark:text-gray-400">Pilih lahan untuk melihat riwayat penyiraman</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="flex items-center justify-center">
                <Spinner />
              </div>
              <p className="text-gray-600 dark:text-gray-400">Memuat data penyiraman...</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Mohon tunggu sebentar</p>
            </div>
          ) : waterings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="text-4xl">📋</div>
              <p className="text-gray-600 dark:text-gray-400">Belum ada data penyiraman untuk filter ini</p>
            </div>
          ) : (
            <>
              {/* Stats Summary */}
              <div className="mb-6 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p className="text-xs text-blue-600 dark:text-blue-300">Total Penyiraman</p>
                  <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {total}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <p className="text-xs text-green-600 dark:text-green-300">Otomatis</p>
                  <p className="mt-1 text-2xl font-bold text-green-900 dark:text-green-100">
                    {waterings.filter(w => w.pemicu === "otomatis").length}
                  </p>
                </div>
                <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
                  <p className="text-xs text-orange-600 dark:text-orange-300">Manual</p>
                  <p className="mt-1 text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {waterings.filter(w => w.pemicu === "manual").length}
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
                  <p className="text-xs text-purple-600 dark:text-purple-300">Durasi Rata-rata</p>
                  <p className="mt-1 text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {waterings.length > 0 ? Math.round(waterings.reduce((sum, w) => sum + w.durationSec, 0) / waterings.length) : 0}s
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/3">
                      {[
                        "Tanggal & Waktu",
                        "Tipe",
                        "Durasi",
                        "Awal",
                        "Akhir",
                        "Efisiensi",
                        "Status",
                        "Diminta Oleh",
                      ].map((label, i) => (
                        <th
                          key={label}
                          className={`px-5 py-3 text-start text-xs font-medium whitespace-nowrap text-gray-500 dark:text-gray-400 ${
                            i >= 2 && i <= 5 ? "text-right" : ""
                          }`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {waterings.map((watering) => {
                      const efficiency = calculateEfficiency(
                        watering.moistureBeforePct,
                        watering.moistureAfterPct
                      );
                      return (
                        <tr
                          key={watering.id}
                          className="hover:bg-gray-50/60 dark:hover:bg-white/2"
                        >
                          <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                            {formatDateTime(watering.startedAt)}
                          </td>
                          <td className="px-5 py-4 text-sm whitespace-nowrap">
                            {getTriggerBadge(watering.pemicu)}
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-medium text-gray-800 dark:text-white/95 whitespace-nowrap">
                            {formatDuration(watering.durationSec)}
                          </td>
                          <td className="px-5 py-4 text-right text-sm whitespace-nowrap">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {watering.moistureBeforePct}%
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right text-sm whitespace-nowrap">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {watering.moistureAfterPct}%
                            </span>
                          </td>
                          <td className={`px-5 py-4 text-right text-sm font-semibold whitespace-nowrap ${getEfficiencyColor(efficiency)}`}>
                            {Math.round(efficiency)}%
                          </td>
                          <td className="px-5 py-4 text-sm whitespace-nowrap">
                            {getStatusBadge(watering.status)}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {watering.namaDimintaOleh || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    size="sm"
                  >
                    ← Sebelumnya
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setPage(i + 1)}
                        className={`h-8 w-8 rounded text-sm font-medium transition-colors ${
                          page === i + 1
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    size="sm"
                  >
                    Berikutnya →
                  </Button>
                </div>
              )}
              <div className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
                Halaman {page} dari {totalPages} • Total {total} record
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
