import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError, api } from "@/api/client";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { PageMeta } from "@/components/shared/page-meta";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  PencilIcon,
  PlusIcon,
  TrashBinIcon,
} from "@/icons";
import { useDeleteLahan } from "@/hooks/use-delete-lahan";
import { CreateLahanDialog } from "./create-lahan-dialog";
import { EditLahanDialog } from "./edit-lahan-dialog";

interface LahanData {
  id: string;
  nama: string;
  lokasi: string;
  luasM2: number;
  status: "aktif" | "nonaktif";
  parameter: {
    ambangKering: number;
    ambangCukup: number;
  };
}

interface Feedback {
  variant: "success" | "destructive";
  text: string;
}

async function fetchLahan(signal: AbortSignal): Promise<LahanData[]> {
  const data = await api.get<{ lahan: LahanData[] }>(
    "/lahan",
    signal,
  );
  return data.lahan;
}

export default function LahanPage() {
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LahanData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LahanData | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const lahanQuery = useQuery({
    queryKey: ["lahan"],
    queryFn: ({ signal }) => fetchLahan(signal),
  });

  const deleteMutation = useDeleteLahan(deleteTarget?.id || "");

  const notify = (variant: Feedback["variant"], text: string) => {
    setFeedback({ variant, text });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;

    setBusyId(target.id);
    setFeedback(null);

    try {
      await deleteMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["lahan"] });
      notify("success", `Lahan ${target.nama} berhasil dihapus.`);
      setDeleteTarget(null);
    } catch (error) {
      notify(
        "destructive",
        error instanceof ApiError
          ? error.message
          : "Gagal menghapus lahan. Silakan coba lagi.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const lahan = lahanQuery.data ?? [];
  const isLoading = lahanQuery.isPending;
  const isError = lahanQuery.isError;

  return (
    <div>
      <PageMeta
        title="Kelola Lahan | GREENFLOW"
        description="Tambah, ubah, dan hapus data lahan sawi beserta lokasi, luas, dan ambang kelembapan."
      />
      <PageBreadcrumb pageTitle="Kelola Lahan" />

      {feedback ? (
        <Alert variant={feedback.variant} className="mb-5">
          <AlertDescription>{feedback.text}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Daftar Lahan
          </h3>

          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Tambah lahan
          </Button>
        </div>

        {isError ? (
          <div className="px-5 pb-6 sm:px-6">
            <Alert variant="destructive">
              <AlertDescription>
                Daftar lahan gagal dimuat. Pastikan server berjalan lalu coba
                lagi.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/3">
                {[
                  "Nama",
                  "Lokasi",
                  "Luas (m²)",
                  "Ambang Kering (%)",
                  "Ambang Cukup (%)",
                  "Status",
                  "Aksi",
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
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <Spinner className="mx-auto size-6 text-brand-600 dark:text-brand-400" />
                    <span className="sr-only">Memuat lahan…</span>
                  </td>
                </tr>
              ) : null}

              {!isLoading && lahan.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Belum ada lahan. Silakan tambahkan lahan baru.
                  </td>
                </tr>
              ) : null}

              {lahan.map((item) => {
                const isBusy = busyId === item.id;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-white/2"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {item.nama}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {item.lokasi}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {item.luasM2}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {item.parameter.ambangKering}%
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {item.parameter.ambangCukup}%
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        color={item.status === "aktif" ? "success" : "error"}
                        size="sm"
                      >
                        {item.status === "aktif" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Ubah lahan"
                          aria-label={`Ubah ${item.nama}`}
                          onClick={() => setEditTarget(item)}
                          disabled={isBusy}
                        >
                          <PencilIcon />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10"
                          title="Hapus lahan"
                          aria-label={`Hapus ${item.nama}`}
                          onClick={() => setDeleteTarget(item)}
                          disabled={isBusy}
                        >
                          <TrashBinIcon />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:border-gray-800 dark:text-gray-400">
          <span>
            {lahan.length} lahan ditampilkan
          </span>
          <span>Hanya admin yang dapat mengelola lahan.</span>
        </div>
      </Card>

      <CreateLahanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(message) => {
          notify("success", message);
          setCreateOpen(false);
        }}
      />

      <EditLahanDialog
        lahan={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onUpdated={(message) => notify("success", message)}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus lahan?</DialogTitle>
            <DialogDescription>
              Lahan {deleteTarget?.nama} akan dinonaktifkan (soft delete).
              Data perangkat di lahan ini akan tetap tersimpan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={busyId !== null}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={busyId !== null}
            >
              {busyId !== null ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
