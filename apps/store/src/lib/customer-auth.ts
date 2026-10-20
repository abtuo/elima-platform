import "server-only";
import { redirect } from "next/navigation";
import { createIdentityClient, isIdentityConfigured } from "./supabase-server";

export async function requireCustomerApi() {
  if (!isIdentityConfigured()) return { ok: false as const, status: 503, message: "Identité Supabase non configurée." };
  const client = await createIdentityClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { ok: false as const, status: 401, message: "Connexion requise." };
  return { ok: true as const, client, user: data.user };
}

export async function requireCustomerPage(next: string) {
  if (!isIdentityConfigured()) redirect(`/connexion?next=${encodeURIComponent(next)}&config=missing`);
  const client = await createIdentityClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return { client, user: data.user };
}
