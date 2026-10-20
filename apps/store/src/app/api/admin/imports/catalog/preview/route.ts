import { NextResponse } from "next/server";
import { catalogRoles, requireStoreApi } from "@/lib/admin-auth";
import { MAX_IMPORT_BYTES, parseCatalogFile, type ColumnMapping } from "@/lib/catalog-import";

export async function POST(request: Request) {
  const auth = await requireStoreApi(catalogRoles); if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  try {
    const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return NextResponse.json({ message: "Fichier requis." }, { status: 400 });
    if(file.type&&!['text/csv','application/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type))return NextResponse.json({message:"Type de fichier non autorisé."},{status:415});
    if (file.size > MAX_IMPORT_BYTES) return NextResponse.json({ message: "Le fichier dépasse 5 Mo." }, { status: 413 });
    const mappingRaw = form.get("mapping"); const mapping = typeof mappingRaw === "string" && mappingRaw ? JSON.parse(mappingRaw) as ColumnMapping : undefined;
    const parsed = await parseCatalogFile(await file.arrayBuffer(), file.name, mapping);
    const skus = parsed.rows.filter((row) => !row.errors.length).map((row) => row.sku); const { data: existing } = skus.length ? await auth.client.from("store_product_variants").select("sku").in("sku", skus) : { data: [] };
    const existingSkus = new Set((existing ?? []).map((row) => row.sku));
    return NextResponse.json({ ...parsed, rows: parsed.rows.map((row) => ({ ...row, existingSku: existingSkus.has(row.sku) })), summary: { total: parsed.rows.length, valid: parsed.rows.filter((row) => !row.errors.length).length, errors: parsed.rows.filter((row) => row.errors.length).length, existing: existingSkus.size } });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Fichier illisible." }, { status: 400 }); }
}
