import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedCategoryRow, NormalizedImportRow, NormalizedKitRow } from "./catalog-import";

type Strategy = "skip" | "update";
type ResultRow = { row_number: number; sku: string; action: "create" | "update" | "skip" | "error"; product_id?: string; variant_id?: string; errors: string[]; warnings: string[] };

const categoryName = (slug: string) => slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

export async function applyCatalogRows(client: SupabaseClient, userId: string, rows: NormalizedImportRow[], strategy: Strategy, categories:NormalizedCategoryRow[]=[]) {
  const skus = rows.map((row) => row.sku);
  const [{ data: seller }, { data: variants }, { data: gradeRows }, { data: rootCategory }] = await Promise.all([
    client.from("store_sellers").select("id").eq("slug", "elima-store").eq("status", "active").single(),
    client.from("store_product_variants").select("id,product_id,sku,quantity_available").in("sku", skus),
    client.from("store_grade_levels").select("id,slug").in("slug", rows.flatMap((row) => row.gradeSlugs)),
    client.from("store_categories").select("id").eq("slug", "fournitures-scolaires").maybeSingle(),
  ]);
  if (!seller) throw new Error("Vendeur Elima Store introuvable.");
  const existingBySku = new Map((variants ?? []).map((variant) => [variant.sku, variant]));
  const gradeBySlug = new Map((gradeRows ?? []).map((grade) => [grade.slug, grade.id]));
  const categoryBySlug = new Map<string, string>(); const productBySlug = new Map<string, string>(); const results: ResultRow[] = [];

  for (const row of rows) {
    const existing = existingBySku.get(row.sku);
    if (existing && strategy === "skip") { results.push({ row_number: row.rowNumber, sku: row.sku, action: "skip", product_id: existing.product_id, variant_id: existing.id, errors: [], warnings: [...row.warnings, "SKU existant ignoré selon la stratégie choisie."] }); continue; }
    try {
      let categoryId = categoryBySlug.get(row.categorySlug);
      if (!categoryId) {
        const { data: found } = await client.from("store_categories").select("id").eq("slug", row.categorySlug).maybeSingle();
        if (found) categoryId = found.id;
        else {
          const definition=categories.find((category)=>category.slug===row.categorySlug); let parentId=rootCategory?.id??null;
          if(definition?.parentSlug&&definition.parentSlug!=="fournitures-scolaires"){const{data:parent}=await client.from("store_categories").select("id").eq("slug",definition.parentSlug).maybeSingle();parentId=parent?.id??parentId;}
          const { data: created, error } = await client.from("store_categories").insert({ slug: row.categorySlug, name: definition?.name??categoryName(row.categorySlug), description:definition?.description??"",sort_order:definition?.sortOrder??0,parent_id:parentId, is_active: definition?.active??true }).select("id").single();
          if (error || !created) throw new Error(error?.message ?? "Catégorie impossible à créer."); categoryId = created.id;
        }
        categoryBySlug.set(row.categorySlug, categoryId!);
      }
      let productId: string; let variantId: string; let action: ResultRow["action"];
      if (existing) {
        productId = existing.product_id; variantId = existing.id; action = "update";
        const delta = row.stock - Number(existing.quantity_available);
        if (delta !== 0) { const { error } = await client.rpc("adjust_store_inventory", { p_variant_id: variantId, p_delta: delta, p_reason: "manual_correction", p_note: `Import catalogue confirmé du SKU ${row.sku}` }); if (error) throw new Error(error.message); }
        const { error: productError } = await client.from("store_catalog_products").update({ name: row.productName, slug: row.productSlug, description: row.description, category_id: categoryId, brand: row.brand ?? null, product_type: row.productType }).eq("id", productId);
        if (productError) throw new Error(productError.message);
        const { error: variantError } = await client.from("store_product_variants").update({ name: row.variantName, price_amount: row.price, promotional_price_amount: row.promotion ?? null, availability: row.availability }).eq("id", variantId);
        if (variantError) throw new Error(variantError.message);
      } else {
        productId = productBySlug.get(row.productSlug) ?? "";
        if (!productId) {
          const { data: found } = await client.from("store_catalog_products").select("id").eq("slug", row.productSlug).maybeSingle();
          if (found) productId = found.id;
          else {
            const { data: product, error } = await client.from("store_catalog_products").insert({ seller_id: seller.id, category_id: categoryId, name: row.productName, slug: row.productSlug, description: row.description, short_description: "", brand: row.brand ?? null, product_type: row.productType, status: "draft" }).select("id").single();
            if (error || !product) throw new Error(error?.message ?? "Produit impossible à créer."); productId = product.id;
          }
          productBySlug.set(row.productSlug, productId);
        }
        const { data: variant, error } = await client.from("store_product_variants").insert({ product_id: productId, sku: row.sku, name: row.variantName, price_amount: row.price, promotional_price_amount: row.promotion ?? null, quantity_available: row.stock, availability: row.availability, status: "active", is_default: true }).select("id").single();
        if (error || !variant) throw new Error(error?.message ?? "Variante impossible à créer."); variantId = variant.id; action = "create";
      }
      if (row.purchaseCost !== undefined) { const { error } = await client.from("store_variant_commercial_costs").upsert({ variant_id: variantId, purchase_cost_amount: row.purchaseCost, updated_by: userId, updated_at: new Date().toISOString() }); if (error) throw new Error(error.message); }
      await client.from("store_product_grades").delete().eq("product_id", productId);
      if (row.gradeSlugs.length) { const gradeLinks = row.gradeSlugs.map((slug) => gradeBySlug.get(slug)).filter(Boolean).map((grade_id) => ({ product_id: productId, grade_id })); const { error } = await client.from("store_product_grades").insert(gradeLinks); if (error) throw new Error(error.message); }
      if (row.imageReference) {
        const image = row.imageReference.startsWith("https://") ? { external_url: row.imageReference, storage_path: null } : { storage_path: row.imageReference, external_url: null };
        const { data: current } = await client.from("store_product_images").select("id").eq("product_id", productId).eq("is_primary", true).maybeSingle();
        if (!current) await client.from("store_product_images").insert({ product_id: productId, ...image, alt_text: row.productName, is_primary: true, sort_order: 0 });
      }
      results.push({ row_number: row.rowNumber, sku: row.sku, action, product_id: productId, variant_id: variantId, errors: [], warnings: row.warnings });
    } catch (error) { results.push({ row_number: row.rowNumber, sku: row.sku, action: "error", errors: [error instanceof Error ? error.message : "Erreur d’import."], warnings: row.warnings }); }
  }
  return results;
}

export async function applyKitRows(client: SupabaseClient, kits: NormalizedKitRow[]) {
  let created = 0; const errors: Array<{slug:string;message:string}> = [];
  const [{data:grades},{data:seller}] = await Promise.all([
    client.from("store_grade_levels").select("id,slug").in("slug",kits.map((kit)=>kit.gradeSlug)),
    client.from("store_sellers").select("id").eq("slug","elima-store").single(),
  ]);
  const gradeBySlug = new Map((grades??[]).map((grade)=>[grade.slug,grade.id]));
  for (const kit of kits) {
    try {
      const {data:existing}=await client.from("store_catalog_kits").select("id").eq("slug",kit.slug).maybeSingle(); if(existing) continue;
      const {data:variants}=await client.from("store_product_variants").select("id,product_id,sku").in("sku",kit.items.map((entry)=>entry.sku));
      const bySku=new Map((variants??[]).map((variant)=>[variant.sku,variant])); if(kit.items.some((entry)=>!bySku.has(entry.sku))) throw new Error("Un composant du kit est introuvable.");
      const {data:createdKit,error}=await client.from("store_catalog_kits").insert({seller_id:seller?.id,slug:kit.slug,name:kit.name,description:kit.description,grade_id:gradeBySlug.get(kit.gradeSlug),pricing_strategy:kit.pricingStrategy,fixed_price_amount:kit.pricingStrategy==="fixed"?kit.fixedPrice:null,availability:kit.availability,status:"draft"}).select("id").single();
      if(error||!createdKit) throw new Error(error?.message??"Kit impossible à créer.");
      const {error:itemError}=await client.from("store_kit_items").insert(kit.items.map((entry,index)=>({kit_id:createdKit.id,product_id:bySku.get(entry.sku)!.product_id,variant_id:bySku.get(entry.sku)!.id,quantity:entry.quantity,sort_order:index})));
      if(itemError){await client.from("store_catalog_kits").delete().eq("id",createdKit.id);throw new Error(itemError.message);} created++;
    } catch(error) { errors.push({slug:kit.slug,message:error instanceof Error?error.message:"Erreur kit."}); }
  }
  return {created,errors};
}
