import { NextResponse } from "next/server";
import { CatalogUnavailableError, listKits } from "@/lib/catalog-repository";
import type { SchoolLevel } from "@/lib/domain";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { const value = new URL(request.url).searchParams.get("niveau"); const level = ["primaire", "college", "lycee"].includes(value || "") ? value as SchoolLevel : undefined; try { return NextResponse.json(await listKits(level), { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }); } catch (error) { if (error instanceof CatalogUnavailableError) return NextResponse.json({ message: "Kits temporairement indisponibles." }, { status: 503 }); throw error; } }
