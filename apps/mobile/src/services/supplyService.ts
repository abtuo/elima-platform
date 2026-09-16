import type { StoreOrderSummary, SupplyListSummary } from "@/types/school";
import { isDemoModeActive } from "./env";
import { mainDbClient } from "./mainDbClient";

async function context() {
  if (!mainDbClient) return null;
  const { data: auth } = await mainDbClient.auth.getUser();
  if (!auth.user) return null;
  const { data } = await mainDbClient.from("users").select("id, school_id, role").eq("id", auth.user.id).maybeSingle();
  return data as { id: string; school_id: string; role: string } | null;
}

export async function getSupplyLists(): Promise<SupplyListSummary[]> {
  if (isDemoModeActive() || !mainDbClient) return [];
  const actor = await context(); if (!actor?.school_id) return [];
  const { data, error } = await mainDbClient.from("supply_lists").select("id, title, academic_year, status, class:classes(name), items:supply_list_items(count)").eq("school_id", actor.school_id).order("updated_at", { ascending: false });
  if (error) { console.error("[Elima data] fournitures", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => ({ id: String(row.id), title: String(row.title), className: (row.class as { name?: string } | null)?.name ?? "Classe", academicYear: String(row.academic_year), status: row.status as SupplyListSummary["status"], itemCount: ((row.items as Array<{ count?: number }> | null)?.[0]?.count ?? 0) }));
}

export async function getStoreOrders(): Promise<StoreOrderSummary[]> {
  if (isDemoModeActive() || !mainDbClient) return [];
  const actor = await context(); if (!actor?.school_id) return [];
  const { data, error } = await mainDbClient.from("store_orders").select("id, total_amount, payment_status, order_status, created_at, student:students(full_name)").eq("school_id", actor.school_id).order("created_at", { ascending: false }).limit(20);
  if (error) { console.error("[Elima data] commandes fournitures", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => ({ id: String(row.id), studentName: (row.student as { full_name?: string } | null)?.full_name ?? "Élève", totalAmount: Number(row.total_amount), paymentStatus: String(row.payment_status), orderStatus: String(row.order_status), createdAt: String(row.created_at).slice(0, 10) }));
}
