export type NotificationType = "kering_soil" | "pump_failure" | "sensor_error" | "manual_trigger" | "system_alert";
export type NotificationSeverity = "info" | "warning" | "error";

export interface NotificationItem {
  id: string;
  tipe: NotificationType;
  lahanId: string;
  perangkatId?: string;
  pesan: string;
  severity: NotificationSeverity;
  baca: boolean;
  dibuatPada: string;
}
