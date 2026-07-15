import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { studentId } = await request.json().catch(() => ({ studentId: "" })) as { studentId?: string };
  if (!studentId) return NextResponse.json({ message: "Élève requis." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  const { data: actor } = await admin.from("users").select("role, school_id").eq("id", auth.user.id).maybeSingle();
  if (!actor?.school_id || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(String(actor.role))) return NextResponse.json({ message: "Accès refusé." }, { status: 403 });
  const { data: student } = await admin.from("students").select("id, school_id, user_id").eq("id", studentId).eq("school_id", actor.school_id).maybeSingle();
  if (!student) return NextResponse.json({ message: "Élève introuvable." }, { status: 404 });
  if (student.user_id) return NextResponse.json({ message: "Cet élève possède déjà un compte activé." }, { status: 409 });
  const raw = randomBytes(4).toString("hex").toUpperCase();
  const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  await admin.from("student_activation_codes").update({ revoked_at: new Date().toISOString() }).eq("student_id", studentId).is("used_at", null).is("revoked_at", null);
  const { error } = await admin.from("student_activation_codes").insert({ school_id: actor.school_id, student_id: studentId, code_hash: hash, created_by: auth.user.id });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ code, expiresInDays: 30 });
}
