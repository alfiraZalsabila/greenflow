import {
  emailSchema,
  nameSchema,
  passwordSchema,
  roleSchema,
} from "@greenflow/shared";
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

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (message: string) => void;
}

const createUserFormSchema = z.object({
  nama: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  peran: roleSchema,
});

type CreateUserFormData = z.infer<typeof createUserFormSchema>;

export function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateUserDialogProps) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      nama: "",
      email: "",
      password: "",
      peran: "pengguna",
    },
    mode: "onTouched",
  });

  const peran = watch("peran");

  const handleSubmitForm = async (data: CreateUserFormData) => {
    setErrorMessage(null);

    try {
      await api.post("/users", data);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      reset();
      onOpenChange(false);
      onCreated(`Akun ${data.email} berhasil ditambahkan.`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Gagal menambahkan akun.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah pengguna</DialogTitle>
          <DialogDescription>
            Akun baru langsung aktif dan dapat masuk dengan kata sandi yang
            Anda tetapkan.
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
            <FieldLabel className="mb-1.5 block">Nama lengkap</FieldLabel>
            <Input
              {...register("nama")}
              type="text"
              autoComplete="off"
              aria-invalid={errors.nama ? "true" : undefined}
            />
            <FieldError errors={[errors.nama]} />
          </Field>

          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel className="mb-1.5 block">Email</FieldLabel>
            <Input
              {...register("email")}
              type="email"
              autoComplete="off"
              aria-invalid={errors.email ? "true" : undefined}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel className="mb-1.5 block">Kata sandi awal</FieldLabel>
            <Input
              {...register("password")}
              type="password"
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              aria-invalid={errors.password ? "true" : undefined}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          <Field>
            <FieldLabel className="mb-1.5 block">Peran</FieldLabel>
            <Select
              value={peran}
              onValueChange={(value) => {
                if (value === "admin" || value === "pengguna") {
                  setValue("peran", value, { shouldValidate: true });
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
              {isSubmitting ? "Menyimpan..." : "Tambah pengguna"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
