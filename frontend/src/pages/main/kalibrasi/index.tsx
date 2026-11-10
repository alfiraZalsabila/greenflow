import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageMeta } from "@/components/shared/page-meta";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { api, ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const kalibrasiSchema = z.object({
  adcKering: z.number().min(0, "Harus bilangan positif"),
  adcBasah: z.number().min(0, "Harus bilangan positif"),
});

type KalibrasiForm = z.infer<typeof kalibrasiSchema>;

interface Kalibrasi {
  id: string;
  deviceId: string;
  lahanId: string;
  adcKering: number;
  adcBasah: number;
  diperbaruiPada: string;
  diperbaruiOleh: string;
}

interface LahanData {
  id: string;
  nama: string;
}

interface Device {
  id: string;
  nama: string;
  tipe: string;
}

export default function KalibrasiPage() {
  const [lahanId, setLahanId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetting, setIsResetting] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const queryClient = useQueryClient();

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

  // Fetch devices for selected lahan
  const { data: devices = [], isLoading: devicesLoading, isError: devicesError } = useQuery({
    queryKey: ["devices", lahanId],
    queryFn: async () => {
      if (!lahanId) return [];
      try {
        const result = await api.get<{ devices: Device[] }>(`/devices?lahanId=${lahanId}`);
        return result.devices || [];
      } catch (err) {
        console.error("Error fetching devices:", err);
        return [];
      }
    },
    enabled: !!lahanId,
  });

  // Fetch kalibrasi for selected device
  const { data: kalibrasi, isLoading: kaliLoading, isError: kaliError, error: kaliErrorDetail } = useQuery({
    queryKey: ["kalibrasi", selectedDeviceId],
    queryFn: async () => {
      if (!selectedDeviceId) return null;
      try {
        console.log("Fetching kalibrasi for device:", selectedDeviceId);
        const result = await api.get<Kalibrasi>(`/kalibrasi/${selectedDeviceId}`);
        console.log("Kalibrasi data:", result);
        return result;
      } catch (err) {
        console.error("Error fetching kalibrasi:", err);
        throw err;
      }
    },
    enabled: !!selectedDeviceId,
  });

  const form = useForm<KalibrasiForm>({
    resolver: zodResolver(kalibrasiSchema),
  });

  // Isi form hanya saat data kalibrasi berubah, bukan setiap render,
  // agar ketikan pengguna tidak ter-reset.
  useEffect(() => {
    if (kalibrasi) {
      form.reset({
        adcKering: kalibrasi.adcKering,
        adcBasah: kalibrasi.adcBasah,
      });
    }
  }, [kalibrasi, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: KalibrasiForm) => {
      if (!selectedDeviceId) throw new Error("Device tidak dipilih");
      if (!lahanId) throw new Error("Lahan tidak dipilih");
      
      // Coba update dulu
      try {
        return await api.put(`/kalibrasi/${selectedDeviceId}`, data);
      } catch (err: unknown) {
        // Jika belum ada kalibrasi (404), buat baru.
        if (err instanceof ApiError && err.status === 404) {
          return await api.post(`/kalibrasi`, {
            deviceId: selectedDeviceId,
            lahanId: lahanId,
            ...data,
          });
        }
        throw err;
      }
    },
    onSuccess: () => {
      setSaveError("");
      queryClient.invalidateQueries({ queryKey: ["kalibrasi", selectedDeviceId] });
      setIsEditOpen(false);
      form.reset();
    },
    onError: (error) => {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : "Gagal menyimpan kalibrasi. Silakan coba lagi.",
      );
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return api.post(`/kalibrasi/${deviceId}/reset`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kalibrasi"] });
      setIsResetting(null);
    },
  });

  const onSubmit = (data: KalibrasiForm) => {
    updateMutation.mutate(data);
  };

  const sensors = devices.filter(d => d.tipe === "sensor");

  console.log("Kalibrasi Page State:", {
    lahanLoading,
    devicesLoading,
    kaliLoading,
    lahanError,
    devicesError,
    kaliError,
    lahanList: lahanList.length,
    devices: devices.length,
    sensors: sensors.length,
    selectedDeviceId,
  });

  return (
    <>
      <PageMeta title="Kalibrasi Sensor" description="Atur nilai ADC sensor" />
      <PageBreadcrumb pageTitle="Kalibrasi Sensor" />

      <div className="space-y-6">
        {/* Error Alerts */}
        {lahanError && (
          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <AlertDescription>Gagal memuat data lahan. Silakan coba lagi.</AlertDescription>
          </Alert>
        )}

        {devicesError && (
          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <AlertDescription>Gagal memuat data perangkat. Silakan coba lagi.</AlertDescription>
          </Alert>
        )}

        {kaliError && (
          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <AlertDescription>
              Gagal memuat data kalibrasi. 
              {kaliErrorDetail && ` Detail: ${String(kaliErrorDetail)}`}
              Silakan coba lagi.
            </AlertDescription>
          </Alert>
        )}

        {/* Lahan Selection */}
        <Card className="p-6">
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pilih Lahan
            </label>
            <Select value={lahanId} onValueChange={(value) => {
              setLahanId(value || "");
              setSelectedDeviceId(null);
            }}>
              <SelectTrigger className="w-full md:w-64">
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
        </Card>

        {/* Devices List */}
        {lahanLoading ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Spinner />
              <p className="text-gray-600 dark:text-gray-400">Memuat data lahan...</p>
            </div>
          </Card>
        ) : lahanId && (
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Sensor di Lahan Ini</h3>
            
            {devicesLoading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <Spinner />
                <p className="text-gray-600 dark:text-gray-400">Memuat data perangkat...</p>
              </div>
            ) : sensors.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">Tidak ada sensor untuk lahan ini</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/3">
                      {["Nama Sensor", "ADC Kering", "ADC Basah", "Terakhir Diubah", "Aksi"].map((label) => (
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
                    {sensors.map((sensor) => {
                      const isSelected = selectedDeviceId === sensor.id;
                      return (
                        <tr
                          key={sensor.id}
                          className={`hover:bg-gray-50/60 dark:hover:bg-white/2 ${
                            isSelected ? "bg-blue-50/50 dark:bg-blue-900/20" : ""
                          }`}
                        >
                          <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                            {sensor.nama}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {kaliLoading && isSelected ? (
                              <Spinner className="h-4 w-4" />
                            ) : kalibrasi && isSelected ? (
                              kalibrasi.adcKering
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {kaliLoading && isSelected ? (
                              <Spinner className="h-4 w-4" />
                            ) : kalibrasi && isSelected ? (
                              kalibrasi.adcBasah
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {kaliLoading && isSelected ? (
                              <Spinner className="h-4 w-4" />
                            ) : kalibrasi && isSelected ? (
                              new Date(kalibrasi.diperbaruiPada).toLocaleString("id-ID")
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm whitespace-nowrap">
                            <Button
                              size="sm"
                              variant={isSelected ? "default" : "ghost"}
                              onClick={() => setSelectedDeviceId(sensor.id)}
                            >
                              Lihat
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Kalibrasi Details */}
        {selectedDeviceId && (
          <>
            {kaliLoading ? (
              <Card className="p-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Spinner />
                  <p className="text-gray-600 dark:text-gray-400">Memuat data kalibrasi...</p>
                </div>
              </Card>
            ) : kaliError ? (
              <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                <AlertDescription>
                  Gagal memuat data kalibrasi sensor. 
                  {kaliErrorDetail && ` (${String(kaliErrorDetail)})`}
                  Silakan coba lagi atau hubungi administrator.
                </AlertDescription>
              </Alert>
            ) : kalibrasi ? (
              <>
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Detail Kalibrasi: {sensors.find(s => s.id === selectedDeviceId)?.nama}</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                      <p className="text-sm text-gray-600 dark:text-gray-400">ADC Kering</p>
                      <p className="mt-2 text-2xl font-semibold">{kalibrasi.adcKering}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                      <p className="text-sm text-gray-600 dark:text-gray-400">ADC Basah</p>
                      <p className="mt-2 text-2xl font-semibold">{kalibrasi.adcBasah}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Panduan Kalibrasi</h4>
                    <ol className="mt-3 space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                      <li>1. Celupkan sensor ke tanah yang kering sepenuhnya</li>
                      <li>2. Catat nilai ADC yang ditampilkan</li>
                      <li>3. Celupkan sensor ke air (tanah sangat basah)</li>
                      <li>4. Catat nilai ADC tersebut</li>
                      <li>5. Update kedua nilai di sini</li>
                    </ol>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <Button onClick={() => {
                      setSaveError("");
                      setIsEditOpen(true);
                    }}>
                      Edit Kalibrasi
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setIsResetting(selectedDeviceId)}
                      disabled={resetMutation.isPending}
                    >
                      Reset ke Default
                    </Button>
                  </div>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Kalibrasi</DialogTitle>
                      <DialogDescription>
                        Update nilai ADC untuk tanah kering dan basah
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      {saveError && (
                        <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                          <AlertDescription>{saveError}</AlertDescription>
                        </Alert>
                      )}
                      <Field>
                        <FieldLabel htmlFor="adcKering">ADC Kering</FieldLabel>
                        <input
                          id="adcKering"
                          type="number"
                          {...form.register("adcKering", { valueAsNumber: true })}
                          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                        />
                        {form.formState.errors.adcKering && (
                          <FieldError>{form.formState.errors.adcKering.message}</FieldError>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="adcBasah">ADC Basah</FieldLabel>
                        <input
                          id="adcBasah"
                          type="number"
                          {...form.register("adcBasah", { valueAsNumber: true })}
                          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                        />
                        {form.formState.errors.adcBasah && (
                          <FieldError>{form.formState.errors.adcBasah.message}</FieldError>
                        )}
                      </Field>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setIsEditOpen(false)}
                        >
                          Batal
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Reset Confirmation Dialog */}
                <Dialog open={!!isResetting} onOpenChange={(open) => !open && setIsResetting(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset Kalibrasi ke Default?</DialogTitle>
                      <DialogDescription>
                        Tindakan ini akan mengatur ulang nilai ADC ke nilai default. Pastikan Anda sudah melakukan backup data.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="ghost"
                        onClick={() => setIsResetting(null)}
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={() => isResetting && resetMutation.mutate(isResetting)}
                        disabled={resetMutation.isPending}
                      >
                        {resetMutation.isPending ? "Mereset..." : "Ya, Reset"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <Card className="p-6">
                <div className="text-center">
                  <p className="mb-4 text-gray-600 dark:text-gray-400">Data kalibrasi untuk sensor ini belum ada.</p>
                  <p className="mb-6 text-sm text-gray-500 dark:text-gray-500">Silakan lakukan kalibrasi sensor terlebih dahulu.</p>
                  <Button onClick={() => {
                      setSaveError("");
                      setIsEditOpen(true);
                    }}>
                    Buat Kalibrasi Baru
                  </Button>
                  
                  {/* Edit Dialog for New Kalibrasi */}
                  <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Buat Kalibrasi Baru</DialogTitle>
                        <DialogDescription>
                          Masukkan nilai ADC untuk sensor kering dan basah
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {saveError && (
                          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                            <AlertDescription>{saveError}</AlertDescription>
                          </Alert>
                        )}
                        <Field>
                          <FieldLabel htmlFor="adcKering">ADC Kering</FieldLabel>
                          <input
                            id="adcKering"
                            type="number"
                            {...form.register("adcKering", { valueAsNumber: true })}
                            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                          />
                          {form.formState.errors.adcKering && (
                            <FieldError>{form.formState.errors.adcKering.message}</FieldError>
                          )}
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="adcBasah">ADC Basah</FieldLabel>
                          <input
                            id="adcBasah"
                            type="number"
                            {...form.register("adcBasah", { valueAsNumber: true })}
                            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                          />
                          {form.formState.errors.adcBasah && (
                            <FieldError>{form.formState.errors.adcBasah.message}</FieldError>
                          )}
                        </Field>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditOpen(false)}
                          >
                            Batal
                          </Button>
                          <Button
                            type="submit"
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
