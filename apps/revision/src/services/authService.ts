import type { Session } from "@supabase/supabase-js";
import { mainDbClient } from "./mainDbClient";

export async function getCurrentSession(): Promise<Session | null> {
  if (!mainDbClient) return null;
  const { data } = await mainDbClient.auth.getSession();
  return data.session;
}

export async function signOut() {
  if (!mainDbClient) return;
  await mainDbClient.auth.signOut();
}

export async function getBearerToken() {
  const session = await getCurrentSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}
