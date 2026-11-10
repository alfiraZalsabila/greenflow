import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "@/api/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateDevice } from "@/hooks/use-create-device";

interface LahanData {
  id: string;
  nama: string;
}

const createDeviceSchema = z.object({
  kodePerangkat: z
    .string()
    .trim()
    .min(1, "Kode perangkat wajib diisi")
    .max(50, "Kode perangkat maksimal 50 karakter"),
  nama: z
    .string()
    .trim()
    .min(1, "Nama perangkat wajib diisi")
    .max(100, "Nama perangkat maksimal 100 karakter"),
  tipe: z.enum(["pengendali", "sensor", "pompa"]),
  lahanId: z
    .string()
    .min(1, "Lahan wajib dipilih"),
});

type CreateDeviceFormData = z.infer<typeof createDeviceSchema>;

interface CreateDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (message: string) => void;
  lahanList: LahanData[];
  selectedLahanId?: string;
}

export function CreateDeviceDialog({
  open,
  onOpenChange,
  onCreated,
  lahanList,
  selectedLahanId,
}: CreateDeviceDialogProps) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createMutation = useCreateDevice();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateDeviceFormData>({
    resolver: zodResolver(createDeviceSchema),
    defaultValues: {
      kodePerangkat: "",
      nama: "",
      tipe: "sensor",
      lahanId: selectedLahanId || "",
    },
    mode: "onTouched",
  });

  const tipe = watch("tipe") as "pengendali" | "sensor" | "pompa";
  const lahanId = watch("lahanId") as string;

  const handleSubmitForm = async (data: CreateDeviceFormData) => {
    setErrorMessage(null);

    try {
      await createMutation.mutateAsync({
        ...data,
        lahanId: data.lahanId || selectedLahanId || "",
      });
      await queryClient.invalidateQueries({ queryKey: ["devices"] });
      reset({
        kodePerangkat: "",
        nama: "",
        tipe: "sensor",
        lahanId: selectedLahanId || "",
      });
      onOpenChange(false);
      onCreated(`Perangkat ${data.nama} berhasil ditambahkan.`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Gagal menambahkan perangkat.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah perangkat</DialogTitle>
          <DialogDescription>
            Masukkan informasi perangkat baru termasuk kode, nama, dan tipe.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleSubmitForm)}
          className="space-y-4"
          noValidate
        >
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Field>
            <FieldLabel className="mb-1.5 block">Lahan</FieldLabel>
            <Select
              value={lahanId || ""}
              onValueChange={(value) => {
                if (value) {
                  setValue("lahanId", value, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger>
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
            <FieldError errors={[errors.lahanId]} />
          </Field>

          <Field data-invalid={Boolean(errors.kodePerangkat)}>
            <FieldLabel className="mb-1.5 block">Kode perangkat</FieldLabel>
            <Input
              {...register("kodePerangkat")}
              type="text"
              placeholder="Contoh: ESP32-001"
              aria-invalid={errors.kodePerangkat ? "true" : undefined}
            />
            <FieldError errors={[errors.kodePerangkat]} />
          </Field>

          <Field data-invalid={Boolean(errors.nama)}>
            <FieldLabel className="mb-1.5 block">Nama perangkat</FieldLabel>
            <Input
              {...register("nama")}
              type="text"
              placeholder="Contoh: Pengendali Lahan A"
              aria-invalid={errors.nama ? "true" : undefined}
            />
            <FieldError errors={[errors.nama]} />
          </Field>

          <Field>
            <FieldLabel className="mb-1.5 block">Tipe</FieldLabel>
            <Select
              value={tipe || "sensor"}
              onValueChange={(value) => {
                const v = value as string;
                if (["pengendali", "sensor", "pompa"].includes(v)) {
                  setValue("tipe", v as "pengendali" | "sensor" | "pompa", {
                    shouldValidate: true,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pengendali">Pengendali</SelectItem>
                <SelectItem value="sensor">Sensor</SelectItem>
                <SelectItem value="pompa">Pompa</SelectItem>
              </SelectContent>
            </Select>
            <FieldError errors={[errors.tipe]} />
          </Field>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Tambah perangkat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
