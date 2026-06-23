import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
]);

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user?.id) {
      return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 });
    }

    const { data: userRow } = await admin
      .from("users")
      .select("school_id, role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!userRow?.school_id) return NextResponse.json({ message: "École introuvable." }, { status: 404 });
    if (userRow.role !== "SCHOOL_ADMIN" && userRow.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Accès refusé." }, { status: 403 });
    }
    const schoolId = String(userRow.school_id);

    const form = await request.formData();
    const kind = String(form.get("kind") ?? "");
    const file = form.get("file");
    if (kind !== "logo" && kind !== "stamp") {
      return NextResponse.json({ message: "Type d’image invalide." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Fichier manquant." }, { status: 400 });
    }
    const ext = ALLOWED.get(file.type);
    if (!ext) {
      return NextResponse.json({ message: "Format non supporté. Utilisez PNG ou JPG." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: "Image trop lourde (max 2 Mo)." }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const filePath = `branding/${schoolId}/${kind}-${Date.now()}.${ext}`;

    const { error: uploadErr } = await admin.storage.from("documents").upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });
    if (uploadErr) return NextResponse.json({ message: uploadErr.message }, { status: 400 });

    const { data: urlData } = admin.storage.from("documents").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    const column = kind === "logo" ? "logo_url" : "stamp_url";
    const { error: updateErr } = await admin
      .from("schools")
      .update({ [column]: publicUrl })
      .eq("id", schoolId);
    if (updateErr) return NextResponse.json({ message: updateErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, kind, url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
