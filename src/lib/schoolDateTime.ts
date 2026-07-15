export const SCHOOL_TIME_ZONE = "Africa/Abidjan";
export const DEMO_REFERENCE_DATE = "2026-06-25";

export function schoolDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function formatSchoolTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString("fr-FR", { timeZone: SCHOOL_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
}

export function formatSchoolDate(value: string | Date, options: Intl.DateTimeFormatOptions = {}) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("fr-FR", { timeZone: SCHOOL_TIME_ZONE, ...options });
}

export function calendarDayDifference(date: string, referenceDate: string) {
  const [year, month, day] = schoolDateKey(date).split("-").map(Number);
  const [referenceYear, referenceMonth, referenceDay] = referenceDate.split("-").map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(referenceYear, referenceMonth - 1, referenceDay)) / 86_400_000);
}
