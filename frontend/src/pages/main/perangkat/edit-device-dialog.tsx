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
import { useUpdateDevice } from "@/hooks/use-update-device";

interface DeviceData {
  id: string;
  nama: string;
  tipe: "pengendali" | "sensor" | "pompa";
  lahanId: string;
  status: "aktif" | "nonaktif";
}

interface LahanData {
  id: string;
  nama: string;
}

const editDeviceSchema = z.object({
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

type EditDeviceFormData = z.infer<typeof editDeviceSchema>;

interface EditDeviceDialogProps {
  device: DeviceData | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: (message: string) => void;
  lahanList: LahanData[];
}

export function EditDeviceDialog({
  device,
  onOpenChange,
  onUpdated,
  lahanList,
}: EditDeviceDialogProps) {
  return (
    <Dialog open={device !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {device ? (
          <EditDeviceForm
            key={device.id}
            device={device}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
            lahanList={lahanList}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditDeviceForm({
  device,
  onOpenChange,
  onUpdated,
  lahanList,
}: {
  device: DeviceData;
  onOpenChange: (open: boolean) => void;
  onUpdated: (message: string) => void;
  lahanList: LahanData[];
}) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const updateMutation = useUpdateDevice(device.id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditDeviceFormData>({
    resolver: zodResolver(editDeviceSchema),
    defaultValues: {
      nama: device.nama,
      tipe: device.tipe,
      lahanId: device.lahanId,
    },
    mode: "onTouched",
  });

  const tipe = watch("tipe") as "pengendali" | "sensor" | "pompa";
  const lahanId = watch("lahanId") as string;

  const handleSubmitForm = async (data: EditDeviceFormData) => {
    setErrorMessage(null);

    try {
      await updateMutation.mutateAsync(data);
      await queryClient.invalidateQueries({ queryKey: ["devices"] });
      onOpenChange(false);
      onUpdated(`Perangkat ${device.nama} berhasil diperbarui.`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Gagal memperbarui perangkat.",
      );
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ubah perangkat</DialogTitle>
        <DialogDescription>{device.id}</DialogDescription>
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
              <SelectValue />
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

        <Field data-invalid={Boolean(errors.nama)}>
          <FieldLabel className="mb-1.5 block">Nama perangkat</FieldLabel>
          <Input
            {...register("nama")}
            type="text"
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
            {isSubmitting ? "Menyimpan..." : "Simpan perubahan"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
