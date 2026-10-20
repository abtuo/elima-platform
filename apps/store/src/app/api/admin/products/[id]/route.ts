import { NextResponse } from "next/server";
import { catalogRoles, requireStoreApi } from "@/lib/admin-auth";
import { validateProductInput } from "@/lib/admin-product-input";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const auth = await requireStoreApi(catalogRoles);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const parsed = validateProductInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 });
  const input = parsed.value;
  const { error } = await auth.client.from("store_catalog_products").update({ category_id: input.categoryId, name: input.name, slug: input.slug, short_description: String(input.shortDescription ?? "").trim(), description: String(input.description ?? "").trim(), product_type: input.productType }).eq("id", id);
  if (error) return NextResponse.json({ message: error.code === "23505" ? "Ce slug existe déjà." : error.message }, { status: 400 });
  const submittedIds = input.variants!.flatMap((variant) => variant.id ? [variant.id] : []);
  for (const variant of input.variants!) {
    if (variant.id) { const { data: current } = await auth.client.from("store_product_variants").select("quantity_available").eq("id", variant.id).eq("product_id", id).maybeSingle(); if (!current) return NextResponse.json({ message: "Variante introuvable." }, { status: 404 }); if (current.quantity_available !== variant.quantity) return NextResponse.json({ message: "Le stock doit être ajusté depuis la page Stocks afin de conserver son historique." }, { status: 400 }); }
    const row = { product_id: id, name: variant.name, sku: variant.sku, price_amount: variant.price, promotional_price_amount: variant.promotionalPrice ?? null, promotion_starts_at: variant.promotionalPrice && variant.promotionStartsAt ? new Date(variant.promotionStartsAt).toISOString() : null, promotion_ends_at: variant.promotionalPrice && variant.promotionEndsAt ? new Date(variant.promotionEndsAt).toISOString() : null, low_stock_threshold: variant.threshold, availability: variant.availability, status: variant.status ?? "active", is_default: Boolean(variant.isDefault) };
    const result = variant.id ? await auth.client.from("store_product_variants").update(row).eq("id", variant.id).eq("product_id", id) : await auth.client.from("store_product_variants").insert({ ...row, quantity_available: variant.quantity });
    if (result.error) return NextResponse.json({ message: result.error.code === "23505" ? "Un SKU existe déjà." : result.error.message }, { status: 400 });
  }
  if (submittedIds.length) await auth.client.from("store_product_variants").update({ status: "archived", is_default: false }).eq("product_id", id).not("id", "in", `(${submittedIds.join(",")})`);
  const { data: existingGrades } = await auth.client.from("store_product_grades").select("grade_id,series_id").eq("product_id", id);
  const seriesByGrade = new Map((existingGrades ?? []).map((link) => [link.grade_id, link.series_id]));
  await auth.client.from("store_product_grades").delete().eq("product_id", id);
  if (input.grades?.length) { const { error: gradeError } = await auth.client.from("store_product_grades").insert([...new Set(input.grades)].map((grade_id) => ({ product_id: id, grade_id, series_id: seriesByGrade.get(grade_id) ?? null }))); if (gradeError) return NextResponse.json({ message: gradeError.message }, { status: 400 }); }
  const { error: statusError } = await auth.client.rpc("set_store_product_publication", { p_product_id: id, p_status: input.status });
  if (statusError) return NextResponse.json({ message: statusError.message }, { status: 400 });
  return NextResponse.json({ id });
}
