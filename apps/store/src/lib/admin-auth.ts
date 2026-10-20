import "server-only";
import { redirect } from "next/navigation";
import { createIdentityClient, isIdentityConfigured } from "./supabase-server";

export type StoreRole = "store_admin" | "catalog_manager" | "inventory_manager" | "order_manager";
export type StoreStaffSession = { userId: string; phone?: string; role: StoreRole };

export async function getStoreStaffSession(): Promise<StoreStaffSession | null> {
  if (!isIdentityConfigured()) return null;
  const client = await createIdentityClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return null;
  const { data: staff, error } = await client.from("store_staff").select("role,status").eq("user_id", auth.user.id).maybeSingle();
  if (error || !staff || staff.status !== "active") return null;
  return { userId: auth.user.id, phone: auth.user.phone ?? undefined, role: staff.role as StoreRole };
}

export async function requireStorePage(roles?: StoreRole[]) {
  if (!isIdentityConfigured()) redirect("/connexion?next=/admin&config=missing");
  const client = await createIdentityClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect("/connexion?next=/admin");
  const { data: staff } = await client.from("store_staff").select("role,status").eq("user_id", auth.user.id).maybeSingle();
  if (!staff || staff.status !== "active") redirect("/compte?admin=interdit");
  const role = staff.role as StoreRole;
  if (roles && !roles.includes(role)) redirect("/admin?acces=interdit");
  return { client, session: { userId: auth.user.id, phone: auth.user.phone ?? undefined, role } satisfies StoreStaffSession };
}

export async function requireStoreApi(roles?: StoreRole[]) {
  if (!isIdentityConfigured()) return { ok: false as const, status: 503, message: "Identité Supabase non configurée pour Elima Store." };
  const client = await createIdentityClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return { ok: false as const, status: 401, message: "Session administrateur requise." };
  const { data: staff } = await client.from("store_staff").select("role,status").eq("user_id", auth.user.id).maybeSingle();
  const role = staff?.role as StoreRole | undefined;
  if (!role || staff?.status !== "active" || (roles && !roles.includes(role))) return { ok: false as const, status: 403, message: "Permission Elima Store insuffisante." };
  return { ok: true as const, client, user: auth.user, role };
}

export const catalogRoles: StoreRole[] = ["store_admin", "catalog_manager"];
export const inventoryRoles: StoreRole[] = ["store_admin", "inventory_manager"];
export const orderRoles: StoreRole[] = ["store_admin", "order_manager"];
