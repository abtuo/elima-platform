import type { AppRole } from "@elima/shared-domain/roles";

export type AuthUser = {
  id: string;
  email?: string;
  role?: AppRole;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s\-().]/g, "");
}

export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@phone.elima`;
}
