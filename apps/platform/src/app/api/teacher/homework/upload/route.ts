import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { assertTeacherAssignment, resolveTeacher } from "@/lib/teacher/server";

const ALLOWED = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["text/plain", "txt"],
]);

const MAX_BYTES = 10 * 1024 * 1024;

function safeSegment(value: string, fallback: string) {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;

    const admin = await createSupabaseAdminServerClient();
    const form = await request.formData();
    const classId = String(form.get("classId") ?? "").trim();
    const subjectId = String(form.get("subjectId") ?? "").trim();
    const file = form.get("file");

    if (!classId || !subjectId) {
      return NextResponse.json({ message: "Classe et matiere requises." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Fichier manquant." }, { status: 400 });
    }

    const assignmentError = await assertTeacherAssignment(admin, ctx, classId, subjectId);
    if (assignmentError) return assignmentError;

    const ext = ALLOWED.get(file.type) ?? safeSegment(file.name.split(".").pop() ?? "", "bin");
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ message: "Format non supporte. Utilisez PDF, image, Word, Excel ou TXT." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: "Fichier trop lourd (max 10 Mo)." }, { status: 400 });
    }

    const { data: classRow } = await admin
      .from("classes")
      .select("name")
      .eq("id", classId)
      .eq("school_id", ctx.schoolId)
      .maybeSingle();
    const className = String((classRow as { name?: string | null } | null)?.name ?? "classe");
    const originalName = safeSegment(file.name.replace(/\.[^.]+$/, ""), "document");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const filePath = [
      "devoirs",
      ctx.schoolId,
      safeSegment(className, "classe"),
      `${Date.now()}-${originalName}-${crypto.randomUUID()}.${ext}`,
    ].join("/");

    const { error: uploadErr } = await admin.storage.from("documents").upload(filePath, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadErr) return NextResponse.json({ message: uploadErr.message }, { status: 400 });

    const { data: urlData } = admin.storage.from("documents").getPublicUrl(filePath);
    return NextResponse.json({
      ok: true,
      url: urlData.publicUrl,
      path: filePath,
      name: file.name,
      size: file.size,
      contentType: file.type,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
