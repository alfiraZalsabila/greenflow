import { Timestamp } from "firebase-admin/firestore";

export interface LahanParameter {
  ambangKering: number; // kelembapan % dry threshold
  titikTengah: number; // medium point
  ambangCukup: number; // wet threshold
  maxDurationSec: number; // max irrigation duration
  intervalSec: number; // interval between readings
  fuzzy: {
    keringSec: number; // dry zone duration (Sugeno output 1)
    lembapSec: number; // medium zone duration (output 2)
    basahSec: number; // wet zone duration (output 0)
  };
}

export interface LahanDocument {
  id: string; // doc ID = lahanId (e.g., "lh-demo-01")
  nama: string; // field name
  lokasi: string; // location
  luasM2: number | null; // area in m²
  status: "aktif" | "nonaktif";
  parameter: LahanParameter;
  dibuatPada: Timestamp;
  diperbaruiPada: Timestamp;
  dibuatOleh: string; // uid
  versiSkema: number;
}

export interface LahanResponse {
  id: string;
  nama: string;
  lokasi: string;
  luasM2: number | null;
  status: "aktif" | "nonaktif";
  parameter: LahanParameter;
}
