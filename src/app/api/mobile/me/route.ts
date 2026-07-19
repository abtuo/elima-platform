import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ message: "Jeton manquant." }, { status: 401 });
  const admin = await createSupabaseAdminServerClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ message: "Jeton invalide." }, { status: 401 });
  const userId = authData.user.id;
  const [{ data: user }, { data: student }, { data: prospect }] = await Promise.all([
    admin.from("users").select("id, email, full_name, role, school_id, school:schools(name, logo_url)").eq("id", userId).maybeSingle(),
    admin.from("students").select("id, class_id, photo_url, class:classes(name, level)").eq("user_id", userId).maybeSingle(),
    admin.from("student_prospects").select("declared_school_name, declared_school_city, school_level").eq("user_id", userId).maybeSingle(),
  ]);
  if (!user) return NextResponse.json({ message: "Profil Elima introuvable." }, { status: 404 });
  return NextResponse.json({
    id: userId,
    email: user.email ?? authData.user.email,
    fullName: user.full_name,
    role: user.role,
    schoolId: user.school_id,
    school: user.school,
    student,
    prospect,
  });
}
