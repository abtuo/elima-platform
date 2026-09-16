import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { brandingFileUrl, normalizeBrandingUrl } from "@/lib/school-branding";

export const dynamic = "force-dynamic";

const ALLOWED = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
]);

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

function contentTypeForPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user?.id) {
      return NextResponse.json({ message: "Utilisateur non authentifiÃ©" }, { status: 401 });
    }

    const { data: userRow } = await admin
      .from("users")
      .select("school_id")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!userRow?.school_id) return NextResponse.json({ message: "Ã‰cole introuvable." }, { status: 404 });

    const schoolId = String(userRow.school_id);
    const path = new URL(request.url).searchParams.get("path") ?? "";
    if (!path.startsWith(`branding/${schoolId}/`)) {
      return NextResponse.json({ message: "AccÃ¨s refusÃ©." }, { status: 403 });
    }

    const { data, error } = await admin.storage.from("documents").download(path);
    if (error || !data) return NextResponse.json({ message: error?.message ?? "Image introuvable." }, { status: 404 });

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentTypeForPath(path),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

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

    const column = kind === "logo" ? "logo_url" : "stamp_url";
    const fileUrl = brandingFileUrl(filePath);
    const { data: updatedSchool, error: updateErr } = await admin
      .from("schools")
      .update({ [column]: fileUrl })
      .eq("id", schoolId)
      .select("logo_url, stamp_url")
      .maybeSingle();
    if (updateErr) return NextResponse.json({ message: updateErr.message }, { status: 400 });

    const savedSchool = updatedSchool as { logo_url?: string | null; stamp_url?: string | null } | null;
    const savedRawUrl = kind === "logo" ? savedSchool?.logo_url : savedSchool?.stamp_url;
    const savedUrl = normalizeBrandingUrl(savedRawUrl ?? fileUrl);
    return NextResponse.json(
      { ok: true, kind, url: savedUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
