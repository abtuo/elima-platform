import { NextResponse } from "next/server";
import { CatalogUnavailableError, getProductBySlug, listRelatedProducts } from "@/lib/catalog-repository";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { const product = await getProductBySlug(slug); if (!product) return NextResponse.json({ message: "Produit introuvable." }, { status: 404 }); return NextResponse.json({ product, related: await listRelatedProducts(product) }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }); }
  catch (error) { if (error instanceof CatalogUnavailableError) return NextResponse.json({ message: "Catalogue temporairement indisponible." }, { status: 503 }); throw error; }
}
