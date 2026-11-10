import { Timestamp } from "firebase-admin/firestore";

export type NotificationType =
  | "kering_soil"
  | "pump_failure"
  | "sensor_error"
  | "manual_trigger"
  | "system_alert";

export type NotificationSeverity = "info" | "warning" | "error";

export interface NotifikasiDocument {
  id: string; // doc ID (auto-generated)
  tipe: NotificationType;
  lahanId: string;
  perangkatId?: string; // optional device ID
  pesan: string;
  severity: NotificationSeverity;
  baca: boolean;
  dibuatPada: Timestamp;
  versiSkema: number;
}

export interface NotifikasiResponse {
  id: string;
  tipe: NotificationType;
  lahanId: string;
  perangkatId?: string;
  pesan: string;
  severity: NotificationSeverity;
  baca: boolean;
  dibuatPada: string; // ISO string
}
