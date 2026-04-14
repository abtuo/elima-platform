import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidTeacherNewPin, teacherCodeToAuthPassword } from "@/lib/teacher-access";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 });

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("id, full_name, email, school_id, role")
      .eq("id", userId)
      .maybeSingle();
    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow || userRow.role !== "TEACHER") {
      return NextResponse.json({ message: "Profil enseignant introuvable" }, { status: 404 });
    }

    const { data: schoolRow } = await admin
      .from("schools")
      .select("name")
      .eq("id", userRow.school_id)
      .maybeSingle();

    const { data: teacherRow } = await admin
      .from("teachers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let classes: string[] = [];
    if (teacherRow?.id) {
      const { data: classRows } = await admin
        .from("class_teachers")
        .select("class:classes(name)")
        .eq("teacher_id", teacherRow.id);
      classes = (classRows ?? [])
        .map((row) => ((row as { class?: Array<{ name?: string }> }).class?.[0]?.name ?? "").trim())
        .filter(Boolean);
    }

    const authUser = await admin.auth.admin.getUserById(userId);
    const mustChangeCode = Boolean((authUser.data.user?.user_metadata ?? {}).teacher_must_change_code);

    return NextResponse.json({
      profile: {
        fullName: userRow.full_name,
        email: userRow.email,
        schoolName: schoolRow?.name ?? "",
        classes,
      },
      mustChangeCode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as null | { newCode?: string };
    const newCode = String(body?.newCode ?? "").trim();
    if (!isValidTeacherNewPin(newCode)) {
      return NextResponse.json({ message: "Le nouveau code doit contenir 5 chiffres." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 });

    const authUser = await admin.auth.admin.getUserById(userId);
    const currentMeta = (authUser.data.user?.user_metadata ?? {}) as Record<string, unknown>;
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      password: teacherCodeToAuthPassword(newCode),
      user_metadata: {
        ...currentMeta,
        teacher_must_change_code: false,
        teacher_last_code_change_at: new Date().toISOString(),
      },
    });
    if (updateErr) return NextResponse.json({ message: updateErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, redirectTo: "/teacher" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
