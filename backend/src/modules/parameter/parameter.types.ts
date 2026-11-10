import { Timestamp } from "firebase-admin/firestore";

export interface ParameterDocument {
  id: string; // doc ID = lahanId
  lahanId: string;
  keringSec: number; // dry zone duration (seconds)
  lembapSec: number; // medium zone duration (seconds)
  basahSec: number; // wet zone duration (seconds)
  ambangKering: number; // dry threshold percentage (0-100)
  titikTengah: number; // medium point percentage (0-100)
  ambangCukup: number; // wet threshold percentage (0-100)
  dibuatPada: Timestamp;
  diperbaruiPada: Timestamp;
  diperbaruiOleh: string; // uid
  versiSkema: number;
}

export interface ParameterResponse {
  id: string;
  lahanId: string;
  keringSec: number;
  lembapSec: number;
  basahSec: number;
  ambangKering: number;
  titikTengah: number;
  ambangCukup: number;
  diperbaruiPada: string; // ISO string
  diperbaruiOleh: string;
}
