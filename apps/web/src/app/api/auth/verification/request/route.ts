import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { AuthVerificationError, normalizeAuthIdentifier, requestVerificationCode } from "@/lib/auth-verification";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as null | { identifier?: string; phone?: string };
    const identifier = normalizeAuthIdentifier(String(body?.identifier ?? ""));
    const phone = String(body?.phone ?? "");
    const admin = await createSupabaseAdminServerClient();
    const query = admin.from("users").select("id");
    const existing = identifier.includes("@")
      ? await query.eq("email", identifier).maybeSingle()
      : await query.eq("phone", identifier).maybeSingle();
    if (existing.data) return NextResponse.json({ message: "Un compte existe déjà avec cet identifiant." }, { status: 409 });

    const result = await requestVerificationCode({
      identifier,
      phone,
      purpose: "signup",
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof AuthVerificationError ? error.status : 500;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Envoi du code impossible." }, { status });
  }
}
