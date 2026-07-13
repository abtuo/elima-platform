import type { Session } from "@supabase/supabase-js";
import { mainDbClient } from "./mainDbClient";

export async function getCurrentSession(): Promise<Session | null> {
  if (!mainDbClient) return null;
  const { data } = await mainDbClient.auth.getSession();
  return data.session;
}

export async function signInWithEmailPassword(email: string, password: string) {
  if (!mainDbClient) throw new Error("Connexion indisponible. Vérifiez la configuration de l'établissement.");
  return mainDbClient.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
}

export function normalizePhone(phone: string) {
  return phone.trim().replace(/[\s\-().]/g, "");
}

export function phoneToEmail(phone: string) {
  return `${normalizePhone(phone)}@phone.elima`;
}

export async function signInWithIdentifier(identifier: string, password: string) {
  const cleaned = identifier.trim();
  if (!cleaned) throw new Error("Email ou téléphone requis.");
  if (cleaned.includes("@")) {
    return signInWithEmailPassword(cleaned, password);
  }
  return signInWithEmailPassword(phoneToEmail(cleaned), password);
}

export async function signOut() {
  if (!mainDbClient) return;
  await mainDbClient.auth.signOut();
}

export async function getBearerToken() {
  const session = await getCurrentSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}
