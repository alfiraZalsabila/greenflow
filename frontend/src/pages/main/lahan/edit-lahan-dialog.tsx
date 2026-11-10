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
import { useUpdateLahan } from "@/hooks/use-update-lahan";

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

const editLahanSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(1, "Nama lahan wajib diisi")
    .max(100, "Nama lahan maksimal 100 karakter"),
  lokasi: z
    .string()
    .trim()
    .min(1, "Lokasi lahan wajib diisi")
    .max(200, "Lokasi maksimal 200 karakter"),
  luasM2: z
    .number()
    .gt(0, "Luas lahan harus lebih besar dari 0"),
  ambangKering: z
    .number()
    .min(0, "Ambang kering minimal 0%")
    .max(100, "Ambang kering maksimal 100%"),
  ambangCukup: z
    .number()
    .min(0, "Ambang cukup minimal 0%")
    .max(100, "Ambang cukup maksimal 100%"),
}).refine(
  (data) => data.ambangKering < data.ambangCukup,
  {
    message: "Ambang kering harus lebih kecil dari ambang cukup",
    path: ["ambangKering"],
  }
);

type EditLahanFormData = z.infer<typeof editLahanSchema>;

interface EditLahanDialogProps {
  lahan: LahanData | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: (message: string) => void;
}

export function EditLahanDialog({
  lahan,
  onOpenChange,
  onUpdated,
}: EditLahanDialogProps) {
  return (
    <Dialog open={lahan !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {lahan ? (
          <EditLahanForm
            key={lahan.id}
            lahan={lahan}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditLahanForm({
  lahan,
  onOpenChange,
  onUpdated,
}: {
  lahan: LahanData;
  onOpenChange: (open: boolean) => void;
  onUpdated: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const updateMutation = useUpdateLahan(lahan.id);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditLahanFormData>({
    resolver: zodResolver(editLahanSchema),
    defaultValues: {
      nama: lahan.nama,
      lokasi: lahan.lokasi,
      luasM2: lahan.luasM2,
      ambangKering: lahan.parameter.ambangKering,
      ambangCukup: lahan.parameter.ambangCukup,
    },
    mode: "onTouched",
  });

  const handleSubmitForm = async (data: EditLahanFormData) => {
    setErrorMessage(null);

    try {
      await updateMutation.mutateAsync(data);
      await queryClient.invalidateQueries({ queryKey: ["lahan"] });
      onOpenChange(false);
      onUpdated(`Lahan ${lahan.nama} berhasil diperbarui.`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Gagal memperbarui lahan.",
      );
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ubah lahan</DialogTitle>
        <DialogDescription>{lahan.nama}</DialogDescription>
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

        <Field data-invalid={Boolean(errors.nama)}>
          <FieldLabel className="mb-1.5 block">Nama lahan</FieldLabel>
          <Input
            {...register("nama")}
            type="text"
            aria-invalid={errors.nama ? "true" : undefined}
          />
          <FieldError errors={[errors.nama]} />
        </Field>

        <Field data-invalid={Boolean(errors.lokasi)}>
          <FieldLabel className="mb-1.5 block">Lokasi</FieldLabel>
          <Input
            {...register("lokasi")}
            type="text"
            aria-invalid={errors.lokasi ? "true" : undefined}
          />
          <FieldError errors={[errors.lokasi]} />
        </Field>

        <Field data-invalid={Boolean(errors.luasM2)}>
          <FieldLabel className="mb-1.5 block">Luas (m²)</FieldLabel>
          <Input
            {...register("luasM2", { valueAsNumber: true })}
            type="number"
            min="0.1"
            step="0.1"
            aria-invalid={errors.luasM2 ? "true" : undefined}
          />
          <FieldError errors={[errors.luasM2]} />
        </Field>

        <Field data-invalid={Boolean(errors.ambangKering)}>
          <FieldLabel className="mb-1.5 block">Ambang kering (%)</FieldLabel>
          <Input
            {...register("ambangKering", { valueAsNumber: true })}
            type="number"
            min="0"
            max="100"
            aria-invalid={errors.ambangKering ? "true" : undefined}
          />
          <FieldError errors={[errors.ambangKering]} />
        </Field>

        <Field data-invalid={Boolean(errors.ambangCukup)}>
          <FieldLabel className="mb-1.5 block">Ambang cukup (%)</FieldLabel>
          <Input
            {...register("ambangCukup", { valueAsNumber: true })}
            type="number"
            min="0"
            max="100"
            aria-invalid={errors.ambangCukup ? "true" : undefined}
          />
          <FieldError errors={[errors.ambangCukup]} />
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
            {isSubmitting ? "Menyimpan..." : "Simpan perubahan"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
