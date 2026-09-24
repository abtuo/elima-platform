import type { Session } from "@supabase/supabase-js";
import { normalizeEmail, normalizePhone, phoneToEmail } from "@elima/auth";
import { mainDbClient } from "./mainDbClient";

export async function getCurrentSession(): Promise<Session | null> {
  if (!mainDbClient) return null;
  const { data } = await mainDbClient.auth.getSession();
  return data.session;
}

export async function signInWithEmailPassword(email: string, password: string) {
  if (!mainDbClient) throw new Error("Connexion indisponible. Vérifiez la configuration de l'établissement.");
  return mainDbClient.auth.signInWithPassword({ email: normalizeEmail(email), password });
}

export { normalizePhone, phoneToEmail };

export async function signInWithIdentifier(identifier: string, password: string) {
  const cleaned = identifier.trim();
  if (!cleaned) throw new Error("Email ou téléphone requis.");
  if (cleaned.includes("@")) {
    return signInWithEmailPassword(cleaned, password);
  }
  return signInWithEmailPassword(phoneToEmail(cleaned), password);
}

export type StudentSignUpInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  schoolLevelId: string;
  declaredSchoolName?: string;
  declaredSchoolCity?: string;
};

export async function signUpStandaloneStudent(input: StudentSignUpInput) {
  if (!mainDbClient) throw new Error("Inscription indisponible. Vérifiez la configuration Elima.");
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  return mainDbClient.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        role: "STUDENT",
        full_name: fullName,
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        school_level_id: input.schoolLevelId,
        declared_school_name: input.declaredSchoolName?.trim() || null,
        declared_school_city: input.declaredSchoolCity?.trim() || null,
        cgu_accepted: true,
        cgu_version: "2026-07",
      },
    },
  });
}

export async function signOut() {
  if (!mainDbClient) return;
  await mainDbClient.auth.signOut();
}

export async function getBearerToken() {
  const session = await getCurrentSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}
