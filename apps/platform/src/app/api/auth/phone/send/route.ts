import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as null | { phone?: string; channel?: "sms" | "whatsapp" };
  const phone = String(body?.phone ?? "").trim();
  const channel = body?.channel ?? "whatsapp";

  if (!phone) {
    return NextResponse.json({ message: "Numéro requis" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      channel,
    },
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
