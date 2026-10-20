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

export type PhoneCountryCode = "CI" | "FR";

export function normalizeCountryPhone(country: PhoneCountryCode, input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (country === "CI") {
    const local = digits.startsWith("225") ? digits.slice(3) : digits;
    return /^0[157]\d{8}$/.test(local) ? `+225${local}` : null;
  }
  const local = digits.startsWith("33") ? digits.slice(2) : digits.replace(/^0/, "");
  return /^[1-9]\d{8}$/.test(local) ? `+33${local}` : null;
}

export function formatPhoneNational(country: PhoneCountryCode, input: string): string {
  const digits = input.replace(/\D/g, "");
  const local = country === "CI"
    ? (digits.startsWith("225") ? digits.slice(3) : digits).slice(0, 10)
    : (digits.startsWith("33") ? digits.slice(2) : digits).replace(/^0/, "").slice(0, 9);
  if (country === "FR") return [local.slice(0, 1), ...(local.slice(1).match(/.{1,2}/g) ?? [])].filter(Boolean).join(" ");
  return local.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}
