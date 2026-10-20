export type CatalogMode = "database" | "demo";
export function getCatalogMode(): CatalogMode {
  return process.env.NODE_ENV !== "production" && process.env.STORE_CATALOG_MODE === "demo" ? "demo" : "database";
}
