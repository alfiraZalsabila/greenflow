import { z } from "zod";

import { ROLES, USER_STATUSES } from "./constants.js";

export const roleSchema = z.enum(ROLES);

export const userStatusSchema = z.enum(USER_STATUSES);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Format email tidak valid."));

export const passwordSchema = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Nama wajib diisi.")
  .max(100, "Nama maksimal 100 karakter.");

export const idSchema = z.string().trim().min(1, "ID wajib diisi.");

export const isoDateTimeSchema = z.iso.datetime({
  message: "Format waktu tidak valid (gunakan ISO 8601 UTC).",
});

/* ------------------------------------------------------------------ */
/* Autentikasi & pengguna                                             */
/* ------------------------------------------------------------------ */

export const registerSchema = z
  .object({
    nama: nameSchema,
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Kata sandi wajib diisi."),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const updateProfileSchema = z
  .object({
    nama: nameSchema,
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Kata sandi lama wajib diisi."),
    newPassword: passwordSchema,
  })
  .strict();

export const createUserSchema = z
  .object({
    nama: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    peran: roleSchema.default("pengguna"),
  })
  .strict();

export const updateUserSchema = z
  .object({
    nama: nameSchema.optional(),
    peran: roleSchema.optional(),
  })
  .strict()
  .refine((value) => value.nama !== undefined || value.peran !== undefined, {
    message: "Tidak ada perubahan yang dikirim.",
  });

export const listUsersQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    peran: roleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
