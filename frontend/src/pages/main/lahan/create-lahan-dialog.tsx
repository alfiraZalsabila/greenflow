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
import { useCreateLahan } from "@/hooks/use-create-lahan";

const createLahanSchema = z.object({
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

type CreateLahanFormData = z.infer<typeof createLahanSchema>;

interface CreateLahanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (message: string) => void;
}

export function CreateLahanDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateLahanDialogProps) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createMutation = useCreateLahan();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateLahanFormData>({
    resolver: zodResolver(createLahanSchema),
    defaultValues: {
      nama: "",
      lokasi: "",
      luasM2: 0,
      ambangKering: 30,
      ambangCukup: 70,
    },
    mode: "onTouched",
  });

  const handleSubmitForm = async (data: CreateLahanFormData) => {
    setErrorMessage(null);

    try {
      await createMutation.mutateAsync(data);
      await queryClient.invalidateQueries({ queryKey: ["lahan"] });
      reset();
      onOpenChange(false);
      onCreated(`Lahan ${data.nama} berhasil ditambahkan.`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Gagal menambahkan lahan.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah lahan</DialogTitle>
          <DialogDescription>
            Masukkan informasi lahan baru termasuk nama, lokasi, dan ambang kelembapan.
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

          <Field data-invalid={Boolean(errors.nama)}>
            <FieldLabel className="mb-1.5 block">Nama lahan</FieldLabel>
            <Input
              {...register("nama")}
              type="text"
              placeholder="Contoh: Lahan Sawi A"
              aria-invalid={errors.nama ? "true" : undefined}
            />
            <FieldError errors={[errors.nama]} />
          </Field>

          <Field data-invalid={Boolean(errors.lokasi)}>
            <FieldLabel className="mb-1.5 block">Lokasi</FieldLabel>
            <Input
              {...register("lokasi")}
              type="text"
              placeholder="Contoh: Jl. Raya No. 123"
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
              placeholder="Contoh: 100"
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
              placeholder="Contoh: 30"
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
              placeholder="Contoh: 70"
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
              {isSubmitting ? "Menyimpan..." : "Tambah lahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
