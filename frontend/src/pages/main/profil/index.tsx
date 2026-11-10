import {
  ROLE_LABELS,
  USER_STATUS_LABELS,
  updateProfileSchema,
} from "@greenflow/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError, api } from "@/api/client";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { PageMeta } from "@/components/shared/page-meta";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts";
import { formatWita } from "@/utils";

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Kata sandi lama wajib diisi."),
    newPassword: z.string().min(8, "Kata sandi baru minimal 8 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Kata sandi baru dan konfirmasi tidak sama.",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordFormSchema>;

export default function ProfilPage() {
  const { user, refreshUser } = useAuth();
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<{ nama: string }>({
    resolver: zodResolver(updateProfileSchema),
    values: { nama: user?.nama ?? "" },
    mode: "onTouched",
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const handleProfileSubmit = async (data: { nama: string }) => {
    setProfileMessage(null);
    setProfileError(null);

    try {
      await api.patch("/me", data);
      await refreshUser();
      setProfileMessage("Profil berhasil diperbarui.");
    } catch (error) {
      setProfileError(
        error instanceof ApiError ? error.message : "Gagal menyimpan profil.",
      );
    }
  };

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    setPasswordMessage(null);
    setPasswordError(null);

    try {
      await api.post("/me/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      passwordForm.reset();
      setPasswordMessage("Kata sandi berhasil diubah.");
    } catch (error) {
      setPasswordError(
        error instanceof ApiError
          ? error.message
          : "Gagal mengubah kata sandi.",
      );
      if (error instanceof ApiError) {
        for (const detail of error.details ?? []) {
          if (detail.field === "currentPassword") {
            passwordForm.setError("currentPassword", {
              message: detail.issue,
            });
          }
        }
      }
    }
  };

  return (
    <div>
      <PageMeta
        title="Profil | GREENFLOW"
        description="Ubah nama dan ganti kata sandi akun GREENFLOW Anda."
      />
      <PageBreadcrumb pageTitle="Profil" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informasi akun</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="mt-1 font-medium break-all text-gray-800 dark:text-white/90">
                  {user?.email ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Peran</dt>
                <dd className="mt-1">
                  {user ? (
                    <Badge
                      color={user.peran === "admin" ? "primary" : "gray"}
                      size="sm"
                    >
                      {ROLE_LABELS[user.peran]}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="mt-1">
                  {user ? (
                    <Badge
                      color={user.status === "aktif" ? "success" : "error"}
                      size="sm"
                    >
                      {USER_STATUS_LABELS[user.status]}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">
                  Terakhir masuk
                </dt>
                <dd className="mt-1 font-medium text-gray-800 dark:text-white/90">
                  {formatWita(user?.terakhirMasukPada)}
                </dd>
              </div>
            </dl>

            <form
              className="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800"
              onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
              noValidate
            >
              {profileMessage ? (
                <Alert variant="success">
                  <AlertDescription>{profileMessage}</AlertDescription>
                </Alert>
              ) : null}
              {profileError ? (
                <Alert variant="destructive">
                  <AlertDescription>{profileError}</AlertDescription>
                </Alert>
              ) : null}

              <Field data-invalid={Boolean(profileForm.formState.errors.nama)}>
                <FieldLabel className="mb-1.5 block">Nama lengkap</FieldLabel>
                <Input
                  {...profileForm.register("nama")}
                  type="text"
                  autoComplete="name"
                  aria-invalid={
                    profileForm.formState.errors.nama ? "true" : undefined
                  }
                />
                <FieldError
                  errors={[profileForm.formState.errors.nama]}
                />
              </Field>

              <Button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
              >
                {profileForm.formState.isSubmitting
                  ? "Menyimpan..."
                  : "Simpan perubahan"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ganti kata sandi</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
              noValidate
            >
              {passwordMessage ? (
                <Alert variant="success">
                  <AlertDescription>{passwordMessage}</AlertDescription>
                </Alert>
              ) : null}
              {passwordError ? (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              ) : null}

              <Field
                data-invalid={Boolean(
                  passwordForm.formState.errors.currentPassword,
                )}
              >
                <FieldLabel className="mb-1.5 block">
                  Kata sandi lama
                </FieldLabel>
                <Input
                  {...passwordForm.register("currentPassword")}
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={
                    passwordForm.formState.errors.currentPassword
                      ? "true"
                      : undefined
                  }
                />
                <FieldError
                  errors={[passwordForm.formState.errors.currentPassword]}
                />
              </Field>

              <Field
                data-invalid={Boolean(
                  passwordForm.formState.errors.newPassword,
                )}
              >
                <FieldLabel className="mb-1.5 block">
                  Kata sandi baru
                </FieldLabel>
                <Input
                  {...passwordForm.register("newPassword")}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  aria-invalid={
                    passwordForm.formState.errors.newPassword
                      ? "true"
                      : undefined
                  }
                />
                <FieldError
                  errors={[passwordForm.formState.errors.newPassword]}
                />
              </Field>

              <Field
                data-invalid={Boolean(
                  passwordForm.formState.errors.confirmPassword,
                )}
              >
                <FieldLabel className="mb-1.5 block">
                  Konfirmasi kata sandi baru
                </FieldLabel>
                <Input
                  {...passwordForm.register("confirmPassword")}
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={
                    passwordForm.formState.errors.confirmPassword
                      ? "true"
                      : undefined
                  }
                />
                <FieldError
                  errors={[passwordForm.formState.errors.confirmPassword]}
                />
              </Field>

              <Button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
              >
                {passwordForm.formState.isSubmitting
                  ? "Mengubah..."
                  : "Ubah kata sandi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
