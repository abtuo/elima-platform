import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

type TeacherRow = {
  id: string;
  user_id: string;
};

type UserRow = {
  id: string;
  full_name: string | null;
};

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
      .select("school_id")
      .eq("id", userId)
      .maybeSingle();

    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow?.school_id) return NextResponse.json({ teachers: [] });

    const { data: teachersData, error: teachersErr } = await admin
      .from("teachers")
      .select("id, user_id")
      .eq("school_id", userRow.school_id)
      .order("created_at", { ascending: true });

    if (teachersErr) return NextResponse.json({ message: teachersErr.message }, { status: 400 });

    const teachers = (teachersData ?? []) as TeacherRow[];
    if (!teachers.length) return NextResponse.json({ teachers: [] });

    const userIds = teachers.map((teacher) => teacher.user_id);
    const { data: usersData, error: usersErr } = await admin
      .from("users")
      .select("id, full_name")
      .in("id", userIds);

    if (usersErr) return NextResponse.json({ message: usersErr.message }, { status: 400 });

    const usersById = new Map<string, UserRow>((usersData ?? []).map((row) => [row.id, row as UserRow]));
    const payload = teachers.map((teacher) => ({
      id: teacher.id,
      fullName: usersById.get(teacher.user_id)?.full_name ?? "Enseignant sans nom",
    }));

    return NextResponse.json({ teachers: payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
