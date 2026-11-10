import { APP_TIMEZONE } from "@greenflow/shared";

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: APP_TIMEZONE,
});

export function formatWita(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return `${dateTimeFormatter.format(date)} WITA`;
}
