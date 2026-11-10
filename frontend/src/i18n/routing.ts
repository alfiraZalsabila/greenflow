export const routing = {
  locales: ["id"] as const,
  defaultLocale: "id",
} as const;

export type Locale = (typeof routing.locales)[number];

export const isLocale = (v: unknown): v is Locale =>
  routing.locales.includes(v as Locale);

/** GREENFLOW hanya memakai Bahasa Indonesia; tidak ada locale RTL aktif. */
export const isRtl = (_locale: Locale): boolean => false;
