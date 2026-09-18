import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

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
    if (!userRow?.school_id) return NextResponse.json({ classes: [] });

    const { data: classes, error: classesErr } = await admin
      .from("classes")
      .select("id, name, level, academic_year")
      .eq("school_id", userRow.school_id)
      .order("level", { ascending: true })
      .order("name", { ascending: true });

    if (classesErr) return NextResponse.json({ message: classesErr.message }, { status: 400 });

    return NextResponse.json({ classes: classes ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}