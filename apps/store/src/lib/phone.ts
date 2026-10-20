import { normalizePhone as normalizeSharedPhone } from "@elima/auth";

export function normalizeIvorianPhone(input: string): string | null {
  const compact = normalizeSharedPhone(input).replace(/^00/, "+");
  const digits = compact.replace(/\D/g, "");
  const local = digits.startsWith("225") ? digits.slice(3) : digits;
  if (!/^0[157]\d{8}$/.test(local)) return null;
  return `+225${local}`;
}

export function normalizeStoreLoginPhone(input: string): string | null {
  const compact = normalizeSharedPhone(input).replace(/^00/, "+");

  if (!compact.startsWith("+")) return normalizeIvorianPhone(compact);
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) return null;

  return compact;
}
