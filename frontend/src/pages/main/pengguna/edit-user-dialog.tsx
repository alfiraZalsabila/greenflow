import type { AuthUser, Role } from "@greenflow/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError, api } from "@/api/client";
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

const editUserSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(100, "Nama maksimal 100 karakter."),
  peran: z.enum(["admin", "pengguna"]),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  user: AuthUser | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: (message: string) => void;
}

export function EditUserDialog({
  user,
  onOpenChange,
  onUpdated,
}: EditUserDialogProps) {
  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {user ? (
          <EditUserForm
            key={user.id}
            user={user}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({
  user,
  onOpenChange,
  onUpdated,
}: {
  user: AuthUser;
  onOpenChange: (open: boolean) => void;
  onUpdated: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { nama: user.nama, peran: user.peran },
    mode: "onTouched",
  });

  const peran = watch("peran");

  const handleSubmitForm = async (data: EditUserFormData) => {
    setErrorMessage(null);

    try {
      await api.patch(`/users/${user.id}`, data);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
      onUpdated(`Akun ${user.email} berhasil diperbarui.`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Gagal memperbarui akun.",
      );
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ubah pengguna</DialogTitle>
        <DialogDescription>{user.email}</DialogDescription>
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
          <FieldLabel className="mb-1.5 block">Nama lengkap</FieldLabel>
          <Input
            {...register("nama")}
            type="text"
            aria-invalid={errors.nama ? "true" : undefined}
          />
          <FieldError errors={[errors.nama]} />
        </Field>

        <Field>
          <FieldLabel className="mb-1.5 block">Peran</FieldLabel>
          <Select
            value={peran}
            onValueChange={(value) => {
              if (value === "admin" || value === "pengguna") {
                setValue("peran", value as Role, { shouldValidate: true });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pengguna">Pengguna</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <FieldError errors={[errors.peran]} />
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
