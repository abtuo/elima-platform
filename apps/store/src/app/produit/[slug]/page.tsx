import { notFound } from "next/navigation";
import { ProductDetails } from "./ProductDetails";
import { ProductCard } from "@/components/ProductCard";
import { CatalogUnavailableError, getProductBySlug, listRelatedProducts } from "@/lib/catalog-repository";
import type { Product } from "@/lib/domain";

export const dynamic = "force-dynamic";
async function load(slug: string): Promise<{ product: Product; related: Product[] } | "missing" | null> { try { const product = await getProductBySlug(slug); if (!product) return "missing"; return { product, related: await listRelatedProducts(product) }; } catch (error) { if (error instanceof CatalogUnavailableError) return null; throw error; } }
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const result = await load((await params).slug); if (result === "missing") notFound();
  if (!result) return <div className="store-shell py-20 text-center"><h1 className="text-3xl font-bold">Produit temporairement indisponible</h1><p className="mt-3 text-slate-500">Le catalogue réel ne peut pas être consulté actuellement.</p></div>;
  return <div className="store-shell py-10"><ProductDetails product={result.product} />{result.related.length > 0 && <section className="mt-16"><h2 className="mb-6 text-2xl font-bold">À associer avec</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{result.related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}</div>;
}
