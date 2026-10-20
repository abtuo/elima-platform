import { NextResponse } from "next/server";
import { catalogRoles, requireStoreApi } from "@/lib/admin-auth";
import { applyCatalogRows, applyKitRows } from "@/lib/catalog-import-apply";
import { MAX_IMPORT_BYTES, parseCatalogFile, type ColumnMapping } from "@/lib/catalog-import";

export async function POST(request: Request) {
  const auth = await requireStoreApi(catalogRoles); if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const form = await request.formData(); const file = form.get("file"); const strategy = form.get("strategy");
  if (!(file instanceof File) || file.size > MAX_IMPORT_BYTES) return NextResponse.json({ message: "Fichier absent ou trop volumineux." }, { status: 400 });
  if(file.type&&!['text/csv','application/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type))return NextResponse.json({message:"Type de fichier non autorisé."},{status:415});
  if (strategy !== "skip" && strategy !== "update") return NextResponse.json({ message: "Stratégie de SKU requise." }, { status: 400 });
  let parsed;
  try { const raw = form.get("mapping"); parsed = await parseCatalogFile(await file.arrayBuffer(), file.name, typeof raw === "string" && raw ? JSON.parse(raw) as ColumnMapping : undefined); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Fichier invalide." }, { status: 400 }); }
  const invalid = parsed.rows.filter((row) => row.errors.length); const invalidKits=parsed.kits.filter((kit)=>kit.errors.length); if (invalid.length||invalidKits.length) return NextResponse.json({ message: "Corrigez toutes les erreurs avant de confirmer.", errors: [...invalid,...invalidKits] }, { status: 422 });
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const { data: imported, error: createError } = await auth.client.from("store_catalog_imports").insert({ created_by: auth.user.id, filename: file.name.slice(0, 255), file_format: parsed.format, file_checksum: checksum, conflict_strategy: strategy, total_rows: parsed.rows.length }).select("id").single();
  if (createError || !imported) return NextResponse.json({ message: createError?.message ?? "Journal d’import indisponible." }, { status: 400 });
  try {
    const results = await applyCatalogRows(auth.client, auth.user.id, parsed.rows, strategy,parsed.categories);
    const kitResult=await applyKitRows(auth.client,parsed.kits);
    const counts = { created: results.filter((row) => row.action === "create").length, updated: results.filter((row) => row.action === "update").length, skipped: results.filter((row) => row.action === "skip").length, errors: results.filter((row) => row.action === "error").length+kitResult.errors.length, kitsCreated:kitResult.created };
    const {error:rowsError}=await auth.client.from("store_catalog_import_rows").insert(results.map((row) => ({ import_id: imported.id, ...row }))); if(rowsError)throw new Error(`Journal des lignes incomplet : ${rowsError.message}`);
    const {error:reportError}=await auth.client.from("store_catalog_imports").update({ status: counts.errors ? "completed_with_errors" : "completed", created_rows: counts.created, updated_rows: counts.updated, skipped_rows: counts.skipped, error_rows: counts.errors, report: { counts,kitErrors:kitResult.errors }, completed_at: new Date().toISOString() }).eq("id", imported.id); if(reportError)throw new Error(`Rapport impossible à finaliser : ${reportError.message}`);
    return NextResponse.json({ importId: imported.id, counts, rows: results, kitErrors:kitResult.errors });
  } catch (error) {
    await auth.client.from("store_catalog_imports").update({ status: "failed", error_rows: parsed.rows.length, report: { message: error instanceof Error ? error.message : "Erreur inattendue." }, completed_at: new Date().toISOString() }).eq("id", imported.id);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Import impossible.", importId: imported.id }, { status: 500 });
  }
}
