import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { AuthVerificationError, normalizeAuthIdentifier, normalizeVerificationPhone, requestVerificationCode } from "@/lib/auth-verification";
import { randomUUID } from "node:crypto";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as null | { identifier?: string; phone?: string };
    const identifier = normalizeAuthIdentifier(String(body?.identifier ?? ""));
    const phone = normalizeVerificationPhone(String(body?.phone ?? ""));
    const admin = await createSupabaseAdminServerClient();
    const query = admin.from("users").select("id,email,phone");
    const found = identifier.includes("@")
      ? await query.eq("email", identifier).maybeSingle()
      : await query.eq("phone", identifier).maybeSingle();
    const accountPhone = found.data?.phone ? normalizeVerificationPhone(String(found.data.phone)) : null;

    // Réponse volontairement identique pour ne pas révéler l'existence d'un compte.
    if (!found.data || accountPhone !== phone) return NextResponse.json({ ok: true, challengeId: randomUUID(), expiresIn: 600 });
    const result = await requestVerificationCode({
      identifier,
      phone,
      purpose: "password_reset",
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof AuthVerificationError ? error.status : 500;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Demande impossible." }, { status });
  }
}
