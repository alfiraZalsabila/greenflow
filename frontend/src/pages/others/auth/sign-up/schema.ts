import { z } from "zod";

export const signUpSchema = z
  .object({
    nama: z.string().trim().min(1, "Nama wajib diisi."),
    email: z
      .string()
      .trim()
      .min(1, "Email wajib diisi.")
      .email("Format email tidak valid."),
    password: z.string().min(8, "Kata sandi minimal 8 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Kata sandi dan konfirmasi tidak sama.",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;
