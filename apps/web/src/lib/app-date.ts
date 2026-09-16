import { getAppMode, resolveAppMode, type AppMode } from "@/lib/app-mode";

export const DEMO_REFERENCE_DATE = "2026-06-25";

type EnvLike = Record<string, string | undefined>;

function dateAtNoon(date: string) {
  return new Date(`${date}T12:00:00.000Z`);
}

export function getReferenceDate() {
  return dateAtNoon(DEMO_REFERENCE_DATE);
}

export function getDemoNow() {
  return getReferenceDate();
}

export function getAppNow(env?: EnvLike) {
  const mode: AppMode = env ? resolveAppMode(env) : getAppMode();
  return mode === "demo" ? getDemoNow() : new Date();
}

export function getRelativeDemoDate(offsetDays: number) {
  const date = getDemoNow();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
}

export function formatAppDate(date: Date | string, locale = "fr-FR") {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }).format(value);
}

export function formatDemoDate(offsetDays = 0, locale = "fr-FR") {
  return formatAppDate(getRelativeDemoDate(offsetDays), locale);
}

export function relativeDemoDateLabel(offsetDays: number) {
  if (offsetDays === 0) return "aujourd'hui";
  if (offsetDays === -1) return "hier";
  if (offsetDays === 1) return "demain";
  return offsetDays < 0 ? `il y a ${Math.abs(offsetDays)} jours` : `dans ${offsetDays} jours`;
}
