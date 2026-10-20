export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 500;

export const importFields = [
  ["product_name", "Nom du produit", true], ["product_slug", "Slug produit", false], ["description", "Description", false],
  ["category_slug", "Catégorie", true], ["brand", "Marque", false], ["product_type", "Type", false], ["sku", "SKU", true],
  ["variant_name", "Variante", true], ["price_xof", "Prix public FCFA", true], ["promotion_xof", "Prix promotionnel", false],
  ["purchase_cost_xof", "Coût d’achat", false], ["stock", "Quantité", true], ["availability", "Disponibilité", true],
  ["status", "Statut", false], ["grade_slugs", "Classes", false], ["image_reference", "Référence image", false],
] as const;

export type ImportField = typeof importFields[number][0];
export type ColumnMapping = Partial<Record<ImportField, string>>;
