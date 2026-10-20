import { NextResponse } from "next/server";
import { catalogRoles, requireStoreApi } from "@/lib/admin-auth";
import { buildCatalogTemplate } from "@/lib/catalog-template";

export async function GET() {
  const auth = await requireStoreApi(catalogRoles); if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const workbook = await buildCatalogTemplate();
  return new Response(new Uint8Array(workbook), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="modele-catalogue-elima.xlsx"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
