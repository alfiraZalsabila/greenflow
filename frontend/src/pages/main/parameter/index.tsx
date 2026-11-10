import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

const parameterSchema = z.object({
  keringSec: z.number().min(0, "Harus bilangan positif"),
  lembapSec: z.number().min(0, "Harus bilangan positif"),
  basahSec: z.number().min(0, "Harus bilangan positif"),
  ambangKering: z.number().min(0).max(100, "Harus antara 0-100"),
  titikTengah: z.number().min(0).max(100, "Harus antara 0-100"),
  ambangCukup: z.number().min(0).max(100, "Harus antara 0-100"),
});

type ParameterForm = z.infer<typeof parameterSchema>;

interface Parameter {
  id: string;
  lahanId: string;
  keringSec: number;
  lembapSec: number;
  basahSec: number;
  ambangKering: number;
  titikTengah: number;
  ambangCukup: number;
  diperbaruiPada: string;
  diperbaruiOleh: string;
}

interface LahanData {
  id: string;
  nama: string;
}

export default function ParameterPage() {
  const [lahanId, setLahanId] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ParameterForm>({
    resolver: zodResolver(parameterSchema),
    defaultValues: {
      keringSec: 60,
      lembapSec: 120,
      basahSec: 180,
      ambangKering: 30,
      titikTengah: 45,
      ambangCukup: 60,
    },
  });

  // Fetch lahan list
  const { data: lahanList = [] } = useQuery({
    queryKey: ["lahan"],
    queryFn: async () => {
      const result = await api.get<{ lahan: LahanData[] }>("/lahan");
      return result.lahan || [];
    },
  });

  // Fetch parameter for selected lahan
  const { data: parameter, isLoading: paramLoading } = useQuery({
    queryKey: ["parameter", lahanId],
    queryFn: async () => {
      if (!lahanId) return null;
      try {
        const result = await api.get<Parameter>(`/parameter/${lahanId}`);
        return result;
      } catch {
        return null;
      }
    },
    enabled: !!lahanId,
  });

  // Update form when parameter loads
  useEffect(() => {
    if (parameter) {
      form.reset({
        keringSec: parameter.keringSec,
        lembapSec: parameter.lembapSec,
        basahSec: parameter.basahSec,
        ambangKering: parameter.ambangKering,
        titikTengah: parameter.titikTengah,
        ambangCukup: parameter.ambangCukup,
      });
    }
  }, [parameter, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: ParameterForm) => {
      if (!lahanId) throw new Error("Lahan tidak dipilih");
      return api.put(`/parameter/${lahanId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parameter", lahanId] });
      setIsEditOpen(false);
    },
  });

  const onSubmit = (data: ParameterForm) => {
    updateMutation.mutate(data);
  };

  const selectedLahan = lahanList.find(l => l.id === lahanId);

  return (
    <>
      <PageMeta title="Parameter Lahan" description="Atur parameter fuzzy Sugeno" />
      <PageBreadcrumb pageTitle="Parameter Lahan" />

      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pilih Lahan
            </label>
            <Select value={lahanId} onValueChange={(value) => setLahanId(value || "")}>
              <SelectTrigger className="w-full md:w-64">
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
          </div>
        </Card>

        {lahanId && (
          <>
            {paramLoading ? (
              <Card className="flex items-center justify-center p-12">
                <Spinner />
              </Card>
            ) : parameter ? (
              <>
                {/* Overview */}
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Parameter Lahan: {selectedLahan?.nama}</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Durasi Kering (detik)</p>
                      <p className="mt-2 text-2xl font-semibold">{parameter.keringSec}s</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Durasi Lembap (detik)</p>
                      <p className="mt-2 text-2xl font-semibold">{parameter.lembapSec}s</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Durasi Basah (detik)</p>
                      <p className="mt-2 text-2xl font-semibold">{parameter.basahSec}s</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Terakhir Diubah</p>
                      <p className="mt-2 text-sm font-medium">
                        {new Date(parameter.diperbaruiPada).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg border border-gray-200 bg-blue-50 p-4 dark:border-gray-700 dark:bg-blue-900/20">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Ambang Kelembapan</h4>
                    <div className="mt-3 space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      <p>
                        <span className="font-medium">Ambang Kering:</span> {parameter.ambangKering}%
                      </p>
                      <p>
                        <span className="font-medium">Titik Tengah:</span> {parameter.titikTengah}%
                      </p>
                      <p>
                        <span className="font-medium">Ambang Cukup:</span> {parameter.ambangCukup}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button onClick={() => setIsEditOpen(true)}>
                      Edit Parameter
                    </Button>
                  </div>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Parameter Lahan</DialogTitle>
                      <DialogDescription>
                        Ubah nilai durasi dan ambang kelembapan
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <Field>
                        <FieldLabel htmlFor="keringSec">Durasi Kering (detik)</FieldLabel>
                        <input
                          id="keringSec"
                          type="number"
                          {...form.register("keringSec")}
                          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                        />
                        {form.formState.errors.keringSec && (
                          <FieldError>{form.formState.errors.keringSec.message}</FieldError>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="lembapSec">Durasi Lembap (detik)</FieldLabel>
                        <input
                          id="lembapSec"
                          type="number"
                          {...form.register("lembapSec")}
                          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                        />
                        {form.formState.errors.lembapSec && (
                          <FieldError>{form.formState.errors.lembapSec.message}</FieldError>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="basahSec">Durasi Basah (detik)</FieldLabel>
                        <input
                          id="basahSec"
                          type="number"
                          {...form.register("basahSec")}
                          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                        />
                        {form.formState.errors.basahSec && (
                          <FieldError>{form.formState.errors.basahSec.message}</FieldError>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="ambangKering">Ambang Kering (%)</FieldLabel>
                        <input
                          id="ambangKering"
                          type="number"
                          min="0"
                          max="100"
                          {...form.register("ambangKering")}
                          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                        />
                        {form.formState.errors.ambangKering && (
                          <FieldError>{form.formState.errors.ambangKering.message}</FieldError>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="titikTengah">Titik Tengah (%)</FieldLabel>
                        <input
                          id="titikTengah"
                          type="number"
                          min="0"
                          max="100"
                          {...form.register("titikTengah")}
                          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                        />
                        {form.formState.errors.titikTengah && (
                          <FieldError>{form.formState.errors.titikTengah.message}</FieldError>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="ambangCukup">Ambang Cukup (%)</FieldLabel>
                        <input
                          id="ambangCukup"
                          type="number"
                          min="0"
                          max="100"
                          {...form.register("ambangCukup")}
                          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                        />
                        {form.formState.errors.ambangCukup && (
                          <FieldError>{form.formState.errors.ambangCukup.message}</FieldError>
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
              </>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">Parameter tidak ditemukan untuk lahan ini</p>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
