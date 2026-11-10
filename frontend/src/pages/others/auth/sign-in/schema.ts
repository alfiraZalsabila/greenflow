import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi.")
    .email("Format email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export type SignInFormData = z.infer<typeof signInSchema>;
