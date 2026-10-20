import { NextResponse } from "next/server";
import { CatalogUnavailableError, getProductsByIds, listProducts } from "@/lib/catalog-repository";
import { parseCatalogQuery } from "@/lib/catalog-query";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams; const params = Object.fromEntries(searchParams.entries());
  try { const ids = searchParams.get("ids")?.split(",").map((id) => id.trim()).filter((id) => /^[a-zA-Z0-9-]{1,64}$/.test(id)); const payload = ids?.length ? { items: await getProductsByIds(ids), total: ids.length } : await listProducts(parseCatalogQuery(params)); return NextResponse.json(payload, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }); }
  catch (error) { if (error instanceof CatalogUnavailableError) return NextResponse.json({ message: "Catalogue temporairement indisponible." }, { status: 503 }); throw error; }
}
