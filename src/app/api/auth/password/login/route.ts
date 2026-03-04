import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { phoneToEmail } from "@/lib/phone-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as null | { phone?: string; password?: string };
  const phone = String(body?.phone ?? "").trim();
  const password = String(body?.password ?? "");

  if (!phone || !password) {
    return NextResponse.json({ message: "Téléphone et mot de passe requis" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const email = phoneToEmail(phone);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
