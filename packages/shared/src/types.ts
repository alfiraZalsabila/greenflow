import type { Role, UserStatus } from "./constants.js";

/** Bentuk pengguna yang aman dikirim ke frontend (tanpa data rahasia). */
export interface AuthUser {
  id: string;
  nama: string;
  email: string;
  peran: Role;
  status: UserStatus;
  terakhirMasukPada?: string | null;
}

/** Bentuk galat API yang seragam (architecture.md 7.3). */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; issue: string }>;
  };
}
