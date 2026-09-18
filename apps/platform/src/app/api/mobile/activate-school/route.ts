import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const { code } = await request.json().catch(() => ({ code: "" })) as { code?: string };
  const normalized = String(code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!token || normalized.length !== 8) return NextResponse.json({ message: "Code ou authentification invalide." }, { status: 400 });
  const admin = await createSupabaseAdminServerClient();
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ message: "Session Elima expirée." }, { status: 401 });
  const hash = createHash("sha256").update(normalized).digest("hex");
  const { data: activation } = await admin.from("student_activation_codes").select("id, school_id, student_id, expires_at, used_at, revoked_at").eq("code_hash", hash).maybeSingle();
  if (!activation || activation.used_at || activation.revoked_at || new Date(activation.expires_at).getTime() <= Date.now()) return NextResponse.json({ message: "Code invalide ou expiré." }, { status: 400 });
  const { data: user } = await admin.from("users").select("role, school_id").eq("id", auth.user.id).maybeSingle();
  if (user?.role !== "STUDENT") return NextResponse.json({ message: "Compte élève requis." }, { status: 403 });
  if (user.school_id && user.school_id !== activation.school_id) return NextResponse.json({ message: "Compte déjà rattaché à un autre établissement." }, { status: 409 });
  const { data: student } = await admin.from("students").select("user_id").eq("id", activation.student_id).maybeSingle();
  if (student?.user_id && student.user_id !== auth.user.id) return NextResponse.json({ message: "Ce code a déjà été associé." }, { status: 409 });
  const now = new Date().toISOString();
  const [userUpdate, studentUpdate, codeUpdate] = await Promise.all([
    admin.from("users").update({ school_id: activation.school_id }).eq("id", auth.user.id),
    admin.from("students").update({ user_id: auth.user.id }).eq("id", activation.student_id).is("user_id", null),
    admin.from("student_activation_codes").update({ used_at: now, used_by: auth.user.id }).eq("id", activation.id).is("used_at", null),
  ]);
  const failure = [userUpdate, studentUpdate, codeUpdate].find((result) => result.error)?.error;
  if (failure) return NextResponse.json({ message: failure.message }, { status: 400 });
  const { data: school } = await admin.from("schools").select("name").eq("id", activation.school_id).single();
  return NextResponse.json({ ok: true, schoolId: activation.school_id, schoolName: school?.name ?? "Établissement", studentId: activation.student_id });
}
