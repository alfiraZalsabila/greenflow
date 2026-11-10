import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@greenflow/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";

import { ApiError, api } from "@/api/client";
import { PageMeta } from "@/components/shared/page-meta";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ChevronLeftIcon } from "@/icons";

export default function ResetPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  const handleFormSubmit = async (data: ForgotPasswordInput) => {
    setMessage(null);
    setErrorMessage(null);

    try {
      await api.post("/auth/forgot-password", data);
      setMessage(
        "Jika email terdaftar, tautan reset kata sandi telah dikirim. Periksa kotak masuk Anda.",
      );
      reset();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Tidak dapat terhubung ke server. Coba lagi.",
      );
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col lg:w-1/2">
      <PageMeta
        title="Lupa Kata Sandi | GREENFLOW"
        description="Minta tautan reset kata sandi GREENFLOW melalui email."
      />

      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="rtl:rotate-180" />
          Kembali ke halaman masuk
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-5 sm:mb-8">
          <h1 className="sm:text-title-md mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90">
            Lupa kata sandi
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat
            kata sandi baru.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={handleSubmit(handleFormSubmit)}
          noValidate
        >
          {message ? (
            <Alert variant="success">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel className="mb-1.5 block">
              Email <span className="text-red-500">*</span>
            </FieldLabel>
            <Input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="nama@contoh.com"
              aria-invalid={errors.email ? "true" : undefined}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Button
            className="w-full"
            size="lg"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Mengirim..." : "Kirim tautan reset"}
          </Button>
        </form>
      </div>
    </div>
  );
}
