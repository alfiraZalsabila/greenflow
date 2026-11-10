import { Timestamp } from "firebase-admin/firestore";

export interface KalibrasiDocument {
  id: string; // doc ID = deviceId
  deviceId: string;
  lahanId: string;
  adcKering: number; // ADC value for dry state
  adcBasah: number; // ADC value for wet state
  dibuatPada: Timestamp;
  diperbaruiPada: Timestamp;
  diperbaruiOleh: string; // uid
  versiSkema: number;
}

export interface KalibrasiResponse {
  id: string;
  deviceId: string;
  lahanId: string;
  adcKering: number;
  adcBasah: number;
  diperbaruiPada: string; // ISO string
  diperbaruiOleh: string;
}
