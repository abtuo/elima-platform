import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as null | { phone?: string; token?: string; type?: "sms" };
  const phone = String(body?.phone ?? "").trim();
  const token = String(body?.token ?? "").trim();
  const type = body?.type ?? "sms";

  if (!phone || !token) {
    return NextResponse.json({ message: "Téléphone et code requis" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
