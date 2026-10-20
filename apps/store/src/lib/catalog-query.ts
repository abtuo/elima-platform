import type { SchoolLevel } from "./domain";

export type CatalogSort = "popularite" | "nouveautes" | "prix-croissant" | "prix-decroissant";
export type CatalogQuery = { search?: string; category?: string; level?: SchoolLevel; minPrice?: number; maxPrice?: number; promotions?: boolean; sort: CatalogSort; page: number; pageSize: number };

function positiveInteger(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function money(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}
function first(value: string | string[] | undefined) { return (Array.isArray(value) ? value[0] : value)?.trim() || undefined; }

export function parseCatalogQuery(params: Record<string, string | string[] | undefined>): CatalogQuery {
  const rawSort = first(params.tri);
  const sort: CatalogSort = ["popularite", "nouveautes", "prix-croissant", "prix-decroissant"].includes(rawSort || "") ? rawSort as CatalogSort : "popularite";
  const rawLevel = first(params.niveau);
  const level = ["primaire", "college", "lycee"].includes(rawLevel || "") ? rawLevel as SchoolLevel : undefined;
  const minPrice = money(params.prixMin); const maxPrice = money(params.prixMax);
  return {
    search: first(params.q)?.slice(0, 100), category: first(params.categorie)?.slice(0, 80), level,
    minPrice, maxPrice: maxPrice !== undefined && minPrice !== undefined && maxPrice < minPrice ? undefined : maxPrice, promotions: first(params.promotions) === "1",
    sort, page: positiveInteger(params.page, 1), pageSize: Math.min(48, positiveInteger(params.parPage, 12)),
  };
}

export function toWebSearchQuery(search: string) {
  return search.normalize("NFKC").replace(/[^\p{L}\p{N}\s'-]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 8).join(" ");
}
