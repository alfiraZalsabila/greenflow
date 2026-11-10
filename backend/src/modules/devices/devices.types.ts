import { Timestamp } from "firebase-admin/firestore";

export interface DeviceStatusTerakhir {
  moisturePct: number;
  pumpState: "ON" | "OFF";
  online: boolean;
  readAt: string; // ISO8601
}

export interface DeviceDocument {
  id: string; // doc ID = kodePerangkat (e.g., "gf-01")
  kodePerangkat: string; // unique code
  nama: string;
  tipe: "pengendali" | "sensor" | "pompa";
  lahanId: string;
  status: "aktif" | "nonaktif";
  statusTerakhir?: DeviceStatusTerakhir;
  tokenHash: string; // SHA-256 hash of kodePerangkat.secret
  tokenHint: string; // last 8 chars of token for display
  dibuatPada: Timestamp;
  diperbaruiPada: Timestamp;
  versiSkema: number;
}

export interface DeviceResponse {
  id: string;
  nama: string;
  tipe: "pengendali" | "sensor" | "pompa";
  lahanId: string;
  status: "aktif" | "nonaktif";
  statusTerakhir?: DeviceStatusTerakhir;
}
