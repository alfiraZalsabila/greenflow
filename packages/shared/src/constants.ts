/**
 * Konstanta yang dipakai bersama oleh frontend, backend, dan simulator.
 * Sumber kebenaran: PRD v0.2 bagian 3, 7, 9.5 dan architecture.md bagian 8.
 */

export const ROLES = ["admin", "pengguna"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  pengguna: "Pengguna",
};

/** Kode pesan SRS Tabel 3.5 + kode teknis (architecture.md 7.3). */
export const ERROR_CODES = {
  E01: "E-01",
  E02: "E-02",
  E03: "E-03",
  E04: "E-04",
  E05: "E-05",
  E06: "E-06",
  E07: "E-07",
  E08: "E-08",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.E01]: "Terjadi kesalahan. Silakan coba lagi.",
  [ERROR_CODES.E02]: "Email atau kata sandi salah.",
  [ERROR_CODES.E03]: "Anda tidak memiliki hak akses untuk tindakan ini.",
  [ERROR_CODES.E04]: "Sesi Anda telah berakhir. Silakan masuk kembali.",
  [ERROR_CODES.E05]: "Data sudah usang. Periksa koneksi perangkat.",
  [ERROR_CODES.E06]: "Layanan sedang sibuk. Silakan coba beberapa saat lagi.",
  [ERROR_CODES.E07]:
    "Nilai tidak valid. Pastikan ambang kering lebih kecil dari ambang cukup dan keduanya berada di antara 0 dan 100.",
  [ERROR_CODES.E08]:
    "Data tidak dapat dihapus karena masih digunakan data lain. Nonaktifkan data tersebut sebagai gantinya.",
  [ERROR_CODES.AUTH_REQUIRED]: "Silakan masuk terlebih dahulu.",
  [ERROR_CODES.FORBIDDEN]: "Anda tidak memiliki hak akses untuk tindakan ini.",
  [ERROR_CODES.NOT_FOUND]: "Data atau alamat yang diminta tidak ditemukan.",
  [ERROR_CODES.RATE_LIMITED]:
    "Terlalu banyak percobaan. Silakan tunggu sebentar.",
  [ERROR_CODES.INTERNAL]: "Terjadi kesalahan pada server.",
};

/** Zona waktu tampilan (PRD A3). Waktu tetap disimpan dalam UTC. */
export const APP_TIMEZONE = "Asia/Makassar";
export const APP_LOCALE = "id-ID";

/** Nilai bawaan parameter penyiraman (PRD bagian 7, Q6). */
export const DEFAULT_PARAMETERS = {
  ambangKering: 30,
  ambangCukup: 60,
  maxDurationSec: 20,
  intervalSec: 300,
} as const;

export const INTERVAL_SEC_MIN = 60;
export const INTERVAL_SEC_MAX = 600;

export const DEFAULT_FUZZY_CONFIG = {
  ambangKering: 30,
  ambangCukup: 60,
  titikTengah: 45,
  keluaran: {
    kering: 20,
    lembap: 5,
    basah: 0,
  },
  maxDurationSec: 20,
} as const;

export const MOISTURE_LABELS = ["Kering", "Lembap", "Basah"] as const;
export type MoistureLabel = (typeof MOISTURE_LABELS)[number];

/** Perangkat dianggap offline setelah 2x interval kirim (PRD bagian 8). */
export const OFFLINE_MULTIPLIER = 2;

/** Nama cookie sesi (architecture AD-03). */
export const SESSION_COOKIE_NAME = "__session";

export const USER_STATUSES = ["aktif", "nonaktif"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  aktif: "Aktif",
  nonaktif: "Nonaktif",
};
