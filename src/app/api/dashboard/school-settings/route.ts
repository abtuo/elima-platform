import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

type SchoolSettingsPayload = {
  current_term_id?: string | null;
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
      .select("school_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow?.school_id) return NextResponse.json({ message: "École introuvable." }, { status: 404 });
    if (userRow.role !== "SCHOOL_ADMIN") return NextResponse.json({ message: "Accès refusé." }, { status: 403 });

    const schoolId = String(userRow.school_id);

    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .select("id, name, current_term_id, logo_url, stamp_url")
      .eq("id", schoolId)
      .maybeSingle();

    if (schoolErr) return NextResponse.json({ message: schoolErr.message }, { status: 400 });

    const { data: terms, error: termsErr } = await admin
      .from("terms")
      .select("id, name, start_date, end_date")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: true });

    if (termsErr) return NextResponse.json({ message: termsErr.message }, { status: 400 });

    return NextResponse.json({
      school: school ?? null,
      terms: terms ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as SchoolSettingsPayload | null;
    if (!payload) return NextResponse.json({ message: "Données invalides." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 });

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("school_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow?.school_id) return NextResponse.json({ message: "École introuvable." }, { status: 404 });
    if (userRow.role !== "SCHOOL_ADMIN") return NextResponse.json({ message: "Accès refusé." }, { status: 403 });

    const schoolId = String(userRow.school_id);
    const currentTermId = payload.current_term_id ? String(payload.current_term_id) : null;

    if (currentTermId) {
      const { data: term, error: termErr } = await admin
        .from("terms")
        .select("id")
        .eq("id", currentTermId)
        .eq("school_id", schoolId)
        .maybeSingle();

      if (termErr) return NextResponse.json({ message: termErr.message }, { status: 400 });
      if (!term) return NextResponse.json({ message: "Trimestre invalide." }, { status: 400 });
    }

    const { error: updateErr } = await admin
      .from("schools")
      .update({ current_term_id: currentTermId })
      .eq("id", schoolId);

    if (updateErr) return NextResponse.json({ message: updateErr.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}