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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  PencilIcon,
  PlusIcon,
  TrashBinIcon,
} from "@/icons";
import { useDeleteDevice } from "@/hooks/use-delete-device";
import { CreateDeviceDialog } from "./create-device-dialog";
import { EditDeviceDialog } from "./edit-device-dialog";

interface LahanData {
  id: string;
  nama: string;
}

interface DeviceData {
  id: string;
  nama: string;
  tipe: "pengendali" | "sensor" | "pompa";
  lahanId: string;
  status: "aktif" | "nonaktif";
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

async function fetchDevices(lahanId: string, signal: AbortSignal): Promise<DeviceData[]> {
  const data = await api.get<{ devices: DeviceData[] }>(
    `/devices?lahanId=${lahanId}`,
    signal,
  );
  return data.devices;
}

const TIPE_LABELS: Record<string, string> = {
  pengendali: "Pengendali",
  sensor: "Sensor",
  pompa: "Pompa",
};

export default function PerangkatPage() {
  const queryClient = useQueryClient();

  const [selectedLahanId, setSelectedLahanId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DeviceData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeviceData | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const lahanQuery = useQuery({
    queryKey: ["lahan"],
    queryFn: ({ signal }) => fetchLahan(signal),
  });

  const devicesQuery = useQuery({
    queryKey: ["devices", selectedLahanId],
    queryFn: ({ signal }) => fetchDevices(selectedLahanId, signal),
    enabled: !!selectedLahanId,
  });

  const deleteMutation = useDeleteDevice(deleteTarget?.id || "");

  const notify = (variant: Feedback["variant"], text: string) => {
    setFeedback({ variant, text });
  };

  const handleDeleteDevice = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;

    setBusyId(target.id);
    setFeedback(null);

    try {
      await deleteMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["devices"] });
      notify("success", `Perangkat ${target.nama} berhasil dihapus.`);
      setDeleteTarget(null);
    } catch (error) {
      notify(
        "destructive",
        error instanceof ApiError
          ? error.message
          : "Gagal menghapus perangkat. Silakan coba lagi.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const lahanList = lahanQuery.data ?? [];
  const devices = devicesQuery.data ?? [];
  const lahanIsLoading = lahanQuery.isPending;
  const lahanIsError = lahanQuery.isError;
  const devicesIsLoading = devicesQuery.isPending;
  const devicesIsError = devicesQuery.isError;

  // Set first lahan as default if available
  if (!selectedLahanId && lahanList.length > 0) {
    setSelectedLahanId(lahanList[0].id);
  }

  return (
    <div>
      <PageMeta
        title="Kelola Perangkat | GREENFLOW"
        description="Daftarkan pengendali ESP32, sensor, dan pompa. Kelola token perangkat, rotasi, dan pencabutan token."
      />
      <PageBreadcrumb pageTitle="Kelola Perangkat" />

      {feedback ? (
        <Alert variant={feedback.variant} className="mb-5">
          <AlertDescription>{feedback.text}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pilih Lahan:
            </label>
            <Select
              value={selectedLahanId || ""}
              onValueChange={(value) => setSelectedLahanId(value || "")}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Pilih lahan" />
              </SelectTrigger>
              <SelectContent>
                {lahanList.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={() => setCreateOpen(true)}
            disabled={!selectedLahanId}
          >
            <PlusIcon />
            Tambah perangkat
          </Button>
        </div>

        {lahanIsError ? (
          <div className="px-5 pb-6 sm:px-6">
            <Alert variant="destructive">
              <AlertDescription>
                Daftar lahan gagal dimuat. Pastikan server berjalan lalu coba
                lagi.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {selectedLahanId && devicesIsError ? (
          <div className="px-5 pb-6 sm:px-6">
            <Alert variant="destructive">
              <AlertDescription>
                Daftar perangkat gagal dimuat. Pastikan server berjalan lalu coba
                lagi.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {!selectedLahanId && !lahanIsLoading ? (
          <div className="px-5 pb-6 sm:px-6">
            <Alert>
              <AlertDescription>
                {lahanList.length === 0
                  ? "Belum ada lahan. Silakan tambahkan lahan terlebih dahulu di halaman Lahan."
                  : "Pilih lahan untuk melihat perangkat."}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {selectedLahanId ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/3">
                  {[
                    "Kode",
                    "Nama",
                    "Tipe",
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
                {devicesIsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <Spinner className="mx-auto size-6 text-brand-600 dark:text-brand-400" />
                      <span className="sr-only">Memuat perangkat…</span>
                    </td>
                  </tr>
                ) : null}

                {!devicesIsLoading && devices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      Belum ada perangkat. Silakan tambahkan perangkat baru.
                    </td>
                  </tr>
                ) : null}

                {devices.map((item) => {
                  const isBusy = busyId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-white/2"
                    >
                      <td className="px-5 py-4 text-sm font-mono font-medium text-gray-800 dark:text-white/90">
                        {item.id}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {item.nama}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {TIPE_LABELS[item.tipe]}
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
                            title="Ubah perangkat"
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
                            title="Hapus perangkat"
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
        ) : null}

        {selectedLahanId && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:border-gray-800 dark:text-gray-400">
            <span>
              {devices.length} perangkat ditampilkan
            </span>
            <span>Hanya admin yang dapat mengelola perangkat.</span>
          </div>
        )}
      </Card>

      <CreateDeviceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(message) => {
          notify("success", message);
          setCreateOpen(false);
        }}
        lahanList={lahanList}
        selectedLahanId={selectedLahanId}
      />

      <EditDeviceDialog
        device={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onUpdated={(message) => notify("success", message)}
        lahanList={lahanList}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus perangkat?</DialogTitle>
            <DialogDescription>
              Perangkat {deleteTarget?.nama} akan dinonaktifkan (soft delete).
              Data historis perangkat akan tetap tersimpan.
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
              onClick={() => void handleDeleteDevice()}
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
