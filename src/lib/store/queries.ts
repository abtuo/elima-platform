import type { SupabaseClient } from "@supabase/supabase-js";

export type SupplyListItemRow = {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  unitPrice: number;
  productId: string | null;
};

export type ClassSupplyList = {
  listId: string;
  title: string;
  status: "draft" | "pending_validation" | "published";
  academicYear: string;
  classId: string;
  className: string;
  items: SupplyListItemRow[];
  packId: string | null;
};

function toNum(v: unknown) {
  return Number(v ?? 0) || 0;
}

export async function getSupplyListForClass(
  admin: SupabaseClient,
  schoolId: string,
  classId: string,
  options?: { publishedOnly?: boolean },
): Promise<ClassSupplyList | null> {
  let query = admin
    .from("supply_lists")
    .select("id, title, status, academic_year, class_id, class:classes!supply_lists_class_id_fkey(name)")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (options?.publishedOnly) query = query.eq("status", "published");

  const { data: listRow } = await query.maybeSingle();
  if (!listRow) return null;

  const list = listRow as {
    id: string;
    title: string;
    status: string;
    academic_year: string;
    class_id: string;
    class?: Array<{ name?: string }> | { name?: string } | null;
  };
  const className = Array.isArray(list.class) ? list.class[0]?.name : list.class?.name;

  const { data: itemRows } = await admin
    .from("supply_list_items")
    .select("id, name, quantity, notes, recommended_product_id, product:store_products!supply_list_items_recommended_product_id_fkey(price)")
    .eq("supply_list_id", list.id)
    .order("created_at", { ascending: true });

  const items: SupplyListItemRow[] = ((itemRows ?? []) as Array<{
    id: string;
    name: string;
    quantity: number;
    notes: string | null;
    recommended_product_id: string | null;
    product?: Array<{ price?: number }> | { price?: number } | null;
  }>).map((row) => {
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    return {
      id: String(row.id),
      name: String(row.name),
      quantity: Number(row.quantity ?? 1),
      notes: row.notes ? String(row.notes) : null,
      unitPrice: toNum(product?.price),
      productId: row.recommended_product_id ? String(row.recommended_product_id) : null,
    };
  });

  const { data: packRow } = await admin
    .from("store_packs")
    .select("id")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("type", "recommended")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    listId: String(list.id),
    title: String(list.title),
    status:
      list.status === "published"
        ? "published"
        : list.status === "pending_validation"
          ? "pending_validation"
          : "draft",
    academicYear: String(list.academic_year),
    classId: String(list.class_id),
    className: String(className ?? "—"),
    items,
    packId: (packRow as { id?: string } | null)?.id ? String((packRow as { id: string }).id) : null,
  };
}

export async function getSchoolSupplyLists(admin: SupabaseClient, schoolId: string) {
  const { data: lists } = await admin
    .from("supply_lists")
    .select("id, title, status, academic_year, class_id, updated_at, class:classes!supply_lists_class_id_fkey(name)")
    .eq("school_id", schoolId)
    .order("class_id", { ascending: true });

  const rows = (lists ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    academic_year: string;
    class_id: string;
    updated_at: string;
    class?: Array<{ name?: string }> | { name?: string } | null;
  }>;

  const result = [];
  for (const list of rows) {
    const { count } = await admin
      .from("supply_list_items")
      .select("id", { count: "exact", head: true })
      .eq("supply_list_id", list.id);
    const className = Array.isArray(list.class) ? list.class[0]?.name : list.class?.name;
    result.push({
      id: String(list.id),
      title: String(list.title),
      status:
        list.status === "published"
          ? ("published" as const)
          : list.status === "pending_validation"
            ? ("pending_validation" as const)
            : ("draft" as const),
      academicYear: String(list.academic_year),
      classId: String(list.class_id),
      className: String(className ?? "—"),
      itemCount: count ?? 0,
      updatedAt: String(list.updated_at),
    });
  }
  return result;
}
