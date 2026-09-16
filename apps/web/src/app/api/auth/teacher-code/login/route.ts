import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { buildTeacherMatricule, isValidTeacherInitialCode, teacherCodeToAuthPassword } from "@/lib/teacher-access";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as null | { matricule?: string; code?: string };
  const matricule = String(body?.matricule ?? "").trim().toUpperCase();
  const code = String(body?.code ?? "").trim().toUpperCase();

  if (matricule.length !== 5 || !isValidTeacherInitialCode(code)) {
    return NextResponse.json({ message: "Matricule et code requis (5 caractères)." }, { status: 400 });
  }

  const admin = await createSupabaseAdminServerClient();
  const supabase = await createSupabaseServerClient();

  const { data: teachersData, error: teachersErr } = await admin.from("teachers").select("id, user_id");
  if (teachersErr) return NextResponse.json({ message: teachersErr.message }, { status: 400 });

  const teacher = (teachersData ?? []).find((t) => buildTeacherMatricule(String(t.id)) === matricule);
  if (!teacher) {
    return NextResponse.json({ message: "Matricule introuvable." }, { status: 404 });
  }

  const { data: userProfile, error: userErr } = await admin
    .from("users")
    .select("id, email, role")
    .eq("id", teacher.user_id)
    .maybeSingle();
  if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
  if (!userProfile?.email || userProfile.role !== "TEACHER") {
    return NextResponse.json({ message: "Profil enseignant invalide." }, { status: 400 });
  }

  const signIn = await supabase.auth.signInWithPassword({
    email: String(userProfile.email).toLowerCase(),
    password: teacherCodeToAuthPassword(code),
  });
  if (signIn.error) return NextResponse.json({ message: "Code invalide." }, { status: 400 });

  const authUser = await admin.auth.admin.getUserById(String(userProfile.id));
  const mustChange = Boolean((authUser.data.user?.user_metadata ?? {}).teacher_must_change_code);

  const redirectTo = mustChange ? "/teacher/onboarding" : "/teacher";
  const response = NextResponse.json({ ok: true, redirectTo });
  response.cookies.set("elima_role", "TEACHER", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
