import "dotenv/config";

import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    APP_ORIGIN: z.url().default("http://localhost:5173"),
    SESSION_COOKIE_DAYS: z.coerce.number().int().positive().default(7),
    FIREBASE_PROJECT_ID: z.string().min(1).optional(),
    FIREBASE_WEB_API_KEY: z.string().min(1).optional(),
    FIREBASE_USE_EMULATOR: booleanFromEnv.optional(),
    FIREBASE_AUTH_EMULATOR_HOST: z.string().min(1).optional(),
    FIRESTORE_EMULATOR_HOST: z.string().min(1).optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
    FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
    ADMIN_SEED_EMAIL: z.string().min(1).optional(),
    ADMIN_SEED_PASSWORD: z.string().min(8).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production") {
      if (!value.FIREBASE_PROJECT_ID) {
        ctx.addIssue({
          code: "custom",
          path: ["FIREBASE_PROJECT_ID"],
          message: "Wajib diisi pada produksi.",
        });
      }
      if (!value.FIREBASE_WEB_API_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["FIREBASE_WEB_API_KEY"],
          message: "Wajib diisi pada produksi.",
        });
      }
      if (value.FIREBASE_USE_EMULATOR) {
        ctx.addIssue({
          code: "custom",
          path: ["FIREBASE_USE_EMULATOR"],
          message: "Emulator tidak boleh dipakai pada produksi.",
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Gagal cepat: konfigurasi tidak lengkap tidak boleh berjalan diam-diam.
  console.error("Konfigurasi lingkungan tidak valid:");
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  process.exit(1);
}

export const isProduction = parsed.data.NODE_ENV === "production";
export const isTest = parsed.data.NODE_ENV === "test";

const useEmulator =
  parsed.data.FIREBASE_USE_EMULATOR ??
  (parsed.data.NODE_ENV === "development" || parsed.data.NODE_ENV === "test");

export const env = {
  ...parsed.data,
  FIREBASE_PROJECT_ID: parsed.data.FIREBASE_PROJECT_ID ?? "irigasisawi-a28c1",
  FIREBASE_WEB_API_KEY: parsed.data.FIREBASE_WEB_API_KEY ?? "AIzaSyAgepS0HbWw_mmXa_HuTc1_iBSoFXAZ8wA",
  FIREBASE_USE_EMULATOR: useEmulator,
  FIREBASE_AUTH_EMULATOR_HOST:
    parsed.data.FIREBASE_AUTH_EMULATOR_HOST ??
    (useEmulator ? "127.0.0.1:9099" : undefined),
  FIRESTORE_EMULATOR_HOST:
    parsed.data.FIRESTORE_EMULATOR_HOST ??
    (useEmulator ? "127.0.0.1:8080" : undefined),
};

export type Env = typeof env;
