import "server-only";
import { createClient } from "@supabase/supabase-js";
import { categories as demoCategories, kits as demoKits, products as demoProducts } from "./catalog";
import { getCatalogMode } from "./catalog-mode";
import { toWebSearchQuery, type CatalogQuery } from "./catalog-query";
import type { Availability, Category, Grade, Kit, Product, ProductVariant, SchoolLevel } from "./domain";

export type CatalogPage = { items: Product[]; total: number; page: number; pageSize: number; pageCount: number; source: "database" | "demo" };
export class CatalogUnavailableError extends Error { constructor() { super("CATALOG_UNAVAILABLE"); } }

type Relation<T> = T | T[] | null;
type CategoryRow = { id: string; name: string; slug: string; description: string | null; parent_id: string | null; icon: string | null; sort_order: number };
type VariantRow = { id: string; sku: string; name: string; attributes: unknown; price_amount: number; promotional_price_amount: number | null; promotion_starts_at: string | null; promotion_ends_at: string | null; currency: "XOF"; quantity_available: number; quantity_reserved: number; availability: Availability; is_default: boolean; image_path: string | null };
type ImageRow = { storage_path: string | null; external_url: string | null; alt_text: string; is_primary: boolean; sort_order: number };
type GradeLinkRow = { grade: Relation<{ label: Grade; school_level: SchoolLevel }> };
type ProductRow = { id: string; slug: string; name: string; description: string; short_description: string; popularity_score: number; created_at: string; category: Relation<CategoryRow>; seller: Relation<{ id: string; name: string; slug: string }>; variants: VariantRow[] | null; images: ImageRow[] | null; grades: GradeLinkRow[] | null };
type KitRow = { id: string; slug: string; name: string; description: string; pricing_strategy: "fixed" | "sum_components"; fixed_price_amount: number | null; currency: "XOF"; availability: Availability; is_customizable: boolean; grade: Relation<{ label: Grade; school_level: SchoolLevel }>; images: ImageRow[] | null; items: Array<{ product_id: string; variant_id: string | null; quantity: number }> | null };

function one<T>(relation: Relation<T>): T | null { return Array.isArray(relation) ? relation[0] ?? null : relation; }
function mediaUrl(row?: ImageRow) { return row?.external_url || (row?.storage_path ? `/api/catalogue/media?path=${encodeURIComponent(row.storage_path)}` : undefined); }
function attributes(value: unknown): Record<string, string> { if (!value || typeof value !== "object" || Array.isArray(value)) return {}; return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")); }
function categoryFromRow(row: CategoryRow): Category { return { id: row.id, name: row.name, slug: row.slug, description: row.description ?? undefined, parentId: row.parent_id ?? undefined, icon: row.icon ?? undefined, sortOrder: row.sort_order }; }
function variantFromRow(row: VariantRow): ProductVariant { const now = Date.now(); const promotionActive = row.promotional_price_amount !== null && (!row.promotion_starts_at || new Date(row.promotion_starts_at).getTime() <= now) && (!row.promotion_ends_at || new Date(row.promotion_ends_at).getTime() > now); const quantityAvailable=Math.max(0,row.quantity_available-(row.quantity_reserved??0)); return { id: row.id, sku: row.sku, name: row.name, attributes: attributes(row.attributes), price: { amount: Number(row.price_amount), currency: row.currency }, promotionalPrice: promotionActive ? { amount: Number(row.promotional_price_amount), currency: row.currency } : undefined, quantityAvailable, availability: quantityAvailable===0&&row.availability==="in_stock"?"out_of_stock":row.availability, isDefault: row.is_default, imageUrl: row.image_path ? `/api/catalogue/media?path=${encodeURIComponent(row.image_path)}` : undefined }; }
function productFromRow(row: ProductRow): Product | null {
  const category = one(row.category); const seller = one(row.seller); const variants = (row.variants ?? []).map(variantFromRow);
  const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
  if (!category || !seller || !defaultVariant) return null;
  const images = [...(row.images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  const grades = (row.grades ?? []).flatMap((link) => { const grade = one(link.grade); return grade ? [grade] : []; });
  return { id: row.id, slug: row.slug, name: row.name, description: row.description, shortDescription: row.short_description, category: categoryFromRow(category), levels: [...new Set(grades.map((grade) => grade.school_level))], grades: [...new Set(grades.map((grade) => grade.label))], price: defaultVariant.price, promotionalPrice: defaultVariant.promotionalPrice, imageUrl: mediaUrl(images[0]), imageAlt: images[0]?.alt_text ?? row.name, popularity: row.popularity_score, createdAt: row.created_at, variants, defaultVariantId: defaultVariant.id, seller: { id: seller.id, name: seller.name, slug: seller.slug, verified: seller.slug === "elima-store" }, availability: defaultVariant.availability, isDemo: false };
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new CatalogUnavailableError();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

const productSelection = "id,slug,name,description,short_description,popularity_score,created_at,category:store_categories(id,name,slug,description,parent_id,icon,sort_order),seller:store_sellers(id,name,slug),variants:store_product_variants(id,sku,name,attributes,price_amount,promotional_price_amount,promotion_starts_at,promotion_ends_at,currency,quantity_available,quantity_reserved,availability,is_default,image_path),images:store_product_images(storage_path,external_url,alt_text,is_primary,sort_order),grades:store_product_grades(grade:store_grade_levels(label,school_level))";

export async function listCategories(): Promise<Category[]> {
  if (getCatalogMode() === "demo") return demoCategories;
  const { data, error } = await publicClient().from("store_categories").select("id,name,slug,description,parent_id,icon,sort_order").eq("is_active", true).order("sort_order");
  if (error) throw new CatalogUnavailableError();
  return ((data ?? []) as CategoryRow[]).map(categoryFromRow);
}

export async function listProducts(input: CatalogQuery): Promise<CatalogPage> {
  if (getCatalogMode() === "demo") {
    const filtered = demoProducts.filter((product) => (!input.promotions || product.promotionalPrice) && (!input.category || product.category.slug === input.category) && (!input.level || product.levels.includes(input.level)) && (!input.search || `${product.name} ${product.description}`.toLocaleLowerCase("fr").includes(input.search.toLocaleLowerCase("fr"))) && (input.minPrice === undefined || product.price.amount >= input.minPrice) && (input.maxPrice === undefined || product.price.amount <= input.maxPrice)).sort((a, b) => input.sort === "prix-croissant" ? a.price.amount - b.price.amount : input.sort === "prix-decroissant" ? b.price.amount - a.price.amount : input.sort === "nouveautes" ? b.createdAt.localeCompare(a.createdAt) : b.popularity - a.popularity);
    const from = (input.page - 1) * input.pageSize; return { items: filtered.slice(from, from + input.pageSize), total: filtered.length, page: input.page, pageSize: input.pageSize, pageCount: Math.ceil(filtered.length / input.pageSize), source: "demo" };
  }
  const client = publicClient(); let productIds: string[] | undefined;
  if (input.category) { const category = await client.from("store_categories").select("id").eq("slug", input.category).eq("is_active", true).maybeSingle(); if (category.error || !category.data) return { items: [], total: 0, page: input.page, pageSize: input.pageSize, pageCount: 0, source: "database" }; productIds = undefined; }
  if (input.level) { const links = await client.from("store_product_grades").select("product_id,grade:store_grade_levels!inner(school_level)").eq("grade.school_level", input.level); if (links.error) throw new CatalogUnavailableError(); productIds = [...new Set((links.data ?? []).map((row) => String(row.product_id)))]; if (!productIds.length) return { items: [], total: 0, page: input.page, pageSize: input.pageSize, pageCount: 0, source: "database" }; }
  if (input.promotions) { const now = new Date().toISOString(); const links = await client.from("store_product_variants").select("product_id").eq("status", "active").not("promotional_price_amount", "is", null).or(`promotion_starts_at.is.null,promotion_starts_at.lte.${now}`).or(`promotion_ends_at.is.null,promotion_ends_at.gt.${now}`); if (links.error) throw new CatalogUnavailableError(); const promotionIds = [...new Set((links.data ?? []).map((row) => String(row.product_id)))]; productIds = productIds ? productIds.filter((id) => promotionIds.includes(id)) : promotionIds; if (!productIds.length) return { items: [], total: 0, page: input.page, pageSize: input.pageSize, pageCount: 0, source: "database" }; }
  let query = client.from("store_catalog_products").select(productSelection, { count: "exact" }).eq("status", "active").not("starting_price_amount", "is", null);
  if (input.category) { const category = await client.from("store_categories").select("id").eq("slug", input.category).maybeSingle(); if (category.data?.id) query = query.eq("category_id", category.data.id); }
  if (productIds) query = query.in("id", productIds);
  const search = input.search ? toWebSearchQuery(input.search) : ""; if (search) query = query.textSearch("search_document", search, { config: "simple", type: "websearch" });
  if (input.minPrice !== undefined) query = query.gte("starting_price_amount", input.minPrice);
  if (input.maxPrice !== undefined) query = query.lte("starting_price_amount", input.maxPrice);
  query = input.sort === "nouveautes" ? query.order("published_at", { ascending: false }) : input.sort === "prix-croissant" ? query.order("starting_price_amount", { ascending: true }) : input.sort === "prix-decroissant" ? query.order("starting_price_amount", { ascending: false }) : query.order("popularity_score", { ascending: false });
  const from = (input.page - 1) * input.pageSize; const { data, error, count } = await query.range(from, from + input.pageSize - 1);
  if (error) throw new CatalogUnavailableError(); const items = ((data ?? []) as unknown as ProductRow[]).flatMap((row) => { const product = productFromRow(row); return product ? [product] : []; });
  return { items, total: count ?? 0, page: input.page, pageSize: input.pageSize, pageCount: Math.ceil((count ?? 0) / input.pageSize), source: "database" };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (getCatalogMode() === "demo") return demoProducts.find((product) => product.slug === slug) ?? null;
  const { data, error } = await publicClient().from("store_catalog_products").select(productSelection).eq("slug", slug).eq("status", "active").maybeSingle();
  if (error) throw new CatalogUnavailableError(); return data ? productFromRow(data as unknown as ProductRow) : null;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const uniqueIds = [...new Set(ids)].slice(0, 50);
  if (!uniqueIds.length) return [];
  if (getCatalogMode() === "demo") return demoProducts.filter((product) => uniqueIds.includes(product.id));
  const { data, error } = await publicClient().from("store_catalog_products").select(productSelection).eq("status", "active").in("id", uniqueIds);
  if (error) throw new CatalogUnavailableError();
  return ((data ?? []) as unknown as ProductRow[]).flatMap((row) => { const product = productFromRow(row); return product ? [product] : []; });
}

export async function listRelatedProducts(product: Product, limit = 4) { const result = await listProducts({ category: product.category.slug, sort: "popularite", page: 1, pageSize: limit + 1 }); return result.items.filter((item) => item.id !== product.id).slice(0, limit); }

export async function listKits(level?: SchoolLevel): Promise<{ items: Kit[]; source: "database" | "demo" }> {
  if (getCatalogMode() === "demo") return { items: level ? demoKits.filter((kit) => kit.level === level) : demoKits, source: "demo" };
  let query = publicClient().from("store_catalog_kits").select("id,slug,name,description,pricing_strategy,fixed_price_amount,currency,availability,is_customizable,grade:store_grade_levels!inner(label,school_level),images:store_kit_images(storage_path,external_url,alt_text,is_primary,sort_order),items:store_kit_items(product_id,variant_id,quantity)").eq("status", "active").order("published_at", { ascending: false });
  if (level) query = query.eq("grade.school_level", level); const { data, error } = await query; if (error) throw new CatalogUnavailableError();
  const items = ((data ?? []) as unknown as KitRow[]).flatMap((row) => { const grade = one(row.grade); if (!grade) return []; const images = [...(row.images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order); return [{ id: row.id, slug: row.slug, name: row.name, grade: grade.label, level: grade.school_level, description: row.description, price: row.fixed_price_amount === null ? undefined : { amount: Number(row.fixed_price_amount), currency: row.currency }, pricingStrategy: row.pricing_strategy, availability: row.availability, imageUrl: mediaUrl(images[0]), items: (row.items ?? []).map((item) => ({ productId: item.product_id, variantId: item.variant_id ?? undefined, quantity: item.quantity })), isCustomizableLater: row.is_customizable, isDemo: false }]; });
  return { items, source: "database" };
}
