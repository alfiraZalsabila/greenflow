import { Timestamp } from "firebase-admin/firestore";

/** Timestamp Firestore -> ISO 8601 UTC (atau null). */
export function toIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

export function toTimestamp(value: string | Date): Timestamp {
  return Timestamp.fromDate(value instanceof Date ? value : new Date(value));
}

/** Angka aman untuk respons JSON. */
export function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
