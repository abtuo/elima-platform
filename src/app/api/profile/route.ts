import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userRes.user?.id) {
    return NextResponse.json({ message: "Utilisateur non connecté" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, phone, role")
    .eq("id", userRes.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userRes.user?.id) {
    return NextResponse.json({ message: "Utilisateur non connecté" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | null
    | {
        fullName?: string;
        email?: string;
        phone?: string;
      };

  const fullName = String(body?.fullName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const phone = String(body?.phone ?? "").trim();

  if (!fullName || !email) {
    return NextResponse.json({ message: "Nom complet et email requis." }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ full_name: fullName, email, phone: phone || null })
    .eq("id", userRes.user.id);

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}