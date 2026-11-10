import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageMeta } from "@/components/shared/page-meta";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type NotificationType = "kering_soil" | "pump_failure" | "sensor_error" | "manual_trigger" | "system_alert";
type NotificationSeverity = "info" | "warning" | "error";

interface Notifikasi {
  id: string;
  tipe: NotificationType;
  lahanId: string;
  perangkatId?: string;
  pesan: string;
  severity: NotificationSeverity;
  baca: boolean;
  dibuatPada: string;
}

interface LahanData {
  id: string;
  nama: string;
}

const ITEMS_PER_PAGE = 10;

export default function NotifikasiPage() {
  const [severityFilter, setSeverityFilter] = useState<NotificationSeverity | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch lahan list for name mapping
  const { data: lahanList = [] } = useQuery({
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

  // Fetch notifications with auto-refresh
  const { data: notifikasi = [], isLoading, isError } = useQuery({
    queryKey: ["notifikasi"],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        params.append("limit", "100");
        const result = await api.get<{ notifikasi: Notifikasi[] }>(`/notifikasi?${params}`);
        return result.notifikasi || [];
      } catch (err) {
        console.error("Error fetching notifikasi:", err);
        return [];
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (notifId: string) => {
      return api.put(`/notifikasi/${notifId}/baca`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifikasi"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (notifId: string) => {
      return api.delete(`/notifikasi/${notifId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifikasi"] });
    },
  });

  // Create lahan name map
  const lahanNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    lahanList.forEach((lahan) => {
      map[lahan.id] = lahan.nama;
    });
    return map;
  }, [lahanList]);

  // Filter and sort notifications
  const filtered = useMemo(() => {
    return notifikasi
      .filter((n) => {
        if (severityFilter !== "all" && n.severity !== severityFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.dibuatPada).getTime() - new Date(a.dibuatPada).getTime());
  }, [notifikasi, severityFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedNotif = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  // Count unread
  const unreadCount = notifikasi.filter((n) => !n.baca).length;

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case "info":
        return <Badge color="primary" size="sm">Info</Badge>;
      case "warning":
        return <Badge color="warning" size="sm">Peringatan</Badge>;
      case "error":
        return <Badge color="error" size="sm">Error</Badge>;
    }
  };

  const getTypeLabel = (tipe: NotificationType) => {
    switch (tipe) {
      case "kering_soil":
        return "Tanah Kering";
      case "pump_failure":
        return "Pompa Gagal";
      case "sensor_error":
        return "Error Sensor";
      case "manual_trigger":
        return "Trigger Manual";
      case "system_alert":
        return "Alert Sistem";
      default:
        return tipe;
    }
  };

  const getTypeIcon = (tipe: NotificationType) => {
    switch (tipe) {
      case "kering_soil":
        return "🌵";
      case "pump_failure":
        return "💧";
      case "sensor_error":
        return "📡";
      case "manual_trigger":
        return "👤";
      case "system_alert":
        return "⚙️";
      default:
        return "📢";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "baru saja";
    if (diffMins < 60) return `${diffMins}m lalu`;
    if (diffHours < 24) return `${diffHours}h lalu`;
    if (diffDays < 7) return `${diffDays}d lalu`;
    return date.toLocaleString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <PageMeta title="Notifikasi" description="Lihat alert dan notifikasi sistem" />
      <PageBreadcrumb pageTitle="Notifikasi" />

      <div className="space-y-6">
        {/* Error Alert */}
        {isError && (
          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <AlertDescription>Gagal memuat notifikasi. Silakan coba lagi.</AlertDescription>
          </Alert>
        )}

        {/* Header with stats */}
        <Card className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold">Notifikasi Sistem</h3>
              <div className="mt-2 flex flex-wrap gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifikasi.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Belum Dibaca</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{unreadCount}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  // Mark all as read
                  notifikasi
                    .filter((n) => !n.baca)
                    .forEach((n) => markAsReadMutation.mutate(n.id));
                }}
                disabled={unreadCount === 0 || markAsReadMutation.isPending}
              >
                {markAsReadMutation.isPending ? "Memproses..." : "Tandai Semua Dibaca"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter Severity
            </label>
            <div className="flex flex-wrap gap-2">
              {(["all", "info", "warning", "error"] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => {
                    setSeverityFilter(sev);
                    setCurrentPage(1);
                  }}
                  className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                    severityFilter === sev
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {sev === "all"
                    ? `Semua (${notifikasi.length})`
                    : sev === "info"
                    ? `Info (${notifikasi.filter((n) => n.severity === "info").length})`
                    : sev === "warning"
                    ? `Peringatan (${notifikasi.filter((n) => n.severity === "warning").length})`
                    : `Error (${notifikasi.filter((n) => n.severity === "error").length})`}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Notifications Table */}
        <Card className="p-0">
          <div className="flex flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Daftar Notifikasi ({filtered.length}) • Halaman {currentPage}/{totalPages || 1}
            </h3>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 px-5 py-12">
              <Spinner />
              <p className="text-sm text-gray-600 dark:text-gray-400">Memuat notifikasi...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-5 py-12 text-center">
              <div className="text-5xl">📭</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada notifikasi untuk filter ini</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/3">
                      {["Tipe", "Lahan", "Pesan", "Severity", "Waktu", "Status", "Aksi"].map((label) => (
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
                    {paginatedNotif.map((notif) => (
                      <tr
                        key={notif.id}
                        className={`hover:bg-gray-50/60 dark:hover:bg-white/2 transition-colors ${
                          notif.baca ? "" : "bg-blue-50/50 dark:bg-blue-900/10"
                        }`}
                      >
                        <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getTypeIcon(notif.tipe)}</span>
                            <span>{getTypeLabel(notif.tipe)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                          {lahanNameMap[notif.lahanId] || notif.lahanId}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                          <p className="max-w-xl">{notif.pesan}</p>
                          {notif.perangkatId && (
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              ID Perangkat: <code className="bg-gray-100 px-1 py-0.5 dark:bg-gray-800">{notif.perangkatId}</code>
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {getSeverityBadge(notif.severity)}
                        </td>
                        <td className="px-5 py-4 text-sm whitespace-nowrap text-gray-600 dark:text-gray-300">
                          <div className="text-xs font-medium">{formatTime(notif.dibuatPada)}</div>
                          <div className="text-xs text-gray-400">{new Date(notif.dibuatPada).toLocaleString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {notif.baca ? (
                            <Badge color="gray" size="sm">
                              Dibaca
                            </Badge>
                          ) : (
                            <Badge color="success" size="sm">
                              Baru
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {!notif.baca && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsReadMutation.mutate(notif.id)}
                                disabled={markAsReadMutation.isPending}
                                title="Tandai sebagai dibaca"
                              >
                                ✓
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10"
                              onClick={() => deleteMutation.mutate(notif.id)}
                              disabled={deleteMutation.isPending}
                              title="Hapus notifikasi"
                            >
                              ✕
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-5 py-4 sm:px-6 dark:border-gray-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Menampilkan {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)} dari {filtered.length} notifikasi
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      ← Sebelumnya
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, currentPage - 2) + i;
                      if (pageNum > totalPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "ghost"}
                          onClick={() => setCurrentPage(pageNum)}
                          size="sm"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Berikutnya →
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:border-gray-800 dark:text-gray-400">
                <span>✓ Pembaruan otomatis aktif setiap 30 detik</span>
                <span>Ditampilkan: {paginatedNotif.length}/{filtered.length} notifikasi</span>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
