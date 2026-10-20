import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { ProductEditor, type ProductEditorValue } from "@/components/admin/ProductEditor";
import { ProductSeriesManager } from "@/components/admin/ProductSeriesManager";
import { catalogRoles, requireStorePage } from "@/lib/admin-auth";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { client } = await requireStorePage(catalogRoles);
  const [{ data: product }, { data: categories }, { data: grades }, { data: series }] = await Promise.all([
    client.from("store_catalog_products").select("id,name,slug,short_description,description,category_id,product_type,status,variants:store_product_variants(id,name,sku,price_amount,promotional_price_amount,promotion_starts_at,promotion_ends_at,quantity_available,low_stock_threshold,availability,status,is_default),grades:store_product_grades(grade_id,series_id,grade:store_grade_levels(label,allows_series)),images:store_product_images(id,storage_path,external_url,alt_text,is_primary,sort_order)").eq("id", id).maybeSingle(),
    client.from("store_categories").select("id,name").order("sort_order"),
    client.from("store_grade_levels").select("id,label,school_level").order("sort_order"),
    client.from("store_academic_series").select("id,label").eq("is_active", true).order("label"),
  ]);
  if (!product) notFound();
  const value: ProductEditorValue = { id: product.id, name: product.name, slug: product.slug, shortDescription: product.short_description, description: product.description, categoryId: product.category_id, productType: product.product_type, status: product.status, grades: (product.grades ?? []).map((grade: { grade_id: string }) => grade.grade_id), variants: (product.variants ?? []).map((variant) => ({ id: variant.id, name: variant.name, sku: variant.sku, price: Number(variant.price_amount), promotionalPrice: variant.promotional_price_amount === null ? undefined : Number(variant.promotional_price_amount), promotionStartsAt: variant.promotion_starts_at?.slice(0, 16), promotionEndsAt: variant.promotion_ends_at?.slice(0, 16), quantity: variant.quantity_available, threshold: variant.low_stock_threshold, availability: variant.availability, status: variant.status, isDefault: variant.is_default })), images: (product.images ?? []).sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order).map((image) => ({ id: image.id, url: image.external_url || `/api/catalogue/media?path=${encodeURIComponent(image.storage_path!)}`, alt: image.alt_text, isPrimary: image.is_primary, sortOrder: image.sort_order })) };
  const seriesLinks = (product.grades ?? []).flatMap((link) => { const grade = link.grade?.[0]; return grade?.allows_series ? [{ gradeId: link.grade_id, gradeLabel: grade.label, seriesId: link.series_id ?? undefined }] : []; });
  return <><AdminPageHeader title={product.name} description="Modifiez les informations, variantes, niveaux et médias du produit." back="/admin/produits" /><ProductEditor initial={value} categories={categories ?? []} grades={grades ?? []} /><ProductSeriesManager productId={product.id} links={seriesLinks} series={series ?? []} /></>;
}
