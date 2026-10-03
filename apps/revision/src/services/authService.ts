import type { Session } from "@supabase/supabase-js";
import { mainDbClient, revisionSessionStorageKey } from "./mainDbClient";
import { sensitiveAuthStorage } from "./authStorage";

export async function getCurrentSession(): Promise<Session | null> {
  if (!mainDbClient) return null;
  const { data } = await mainDbClient.auth.getSession();
  return data.session;
}

export async function signOut() {
  try {
    await mainDbClient?.auth.signOut({ scope: "local" });
  } finally {
    await Promise.all([revisionSessionStorageKey, `${revisionSessionStorageKey}-user`, `${revisionSessionStorageKey}-code-verifier`]
      .map((key) => sensitiveAuthStorage.removeItem(key)));
  }
}

export async function getBearerToken() {
  const session = await getCurrentSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}
