import type { AuthUser, Role, UserStatus } from "@greenflow/shared";
import type { Timestamp } from "firebase-admin/firestore";

import { toIso } from "../../lib/firestore.js";

export interface UserDocument {
  uid: string;
  nama: string;
  email: string;
  peran: Role;
  status: UserStatus;
  dibuatPada: Timestamp;
  diperbaruiPada: Timestamp;
  terakhirMasukPada: Timestamp | null;
  dinonaktifkanPada: Timestamp | null;
  dinonaktifkanOleh: string | null;
  versiSkema: number;
}

export function toAuthUser(user: UserDocument): AuthUser {
  return {
    id: user.uid,
    nama: user.nama,
    email: user.email,
    peran: user.peran,
    status: user.status,
    terakhirMasukPada: toIso(user.terakhirMasukPada),
  };
}
