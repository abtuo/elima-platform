import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { AuthVerificationError, consumeAuthChallenge, normalizeAuthIdentifier, normalizeVerificationPhone, verifyAuthCode } from "@/lib/auth-verification";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as null | {
      identifier?: string;
      phone?: string;
      challengeId?: string;
      code?: string;
      password?: string;
    };
    const identifier = normalizeAuthIdentifier(String(body?.identifier ?? ""));
    const phone = normalizeVerificationPhone(String(body?.phone ?? ""));
    const password = String(body?.password ?? "");
    if (password.length < 8) return NextResponse.json({ message: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });

    const challengeId = await verifyAuthCode({
      challengeId: String(body?.challengeId ?? ""),
      identifier,
      phone,
      code: String(body?.code ?? ""),
      purpose: "password_reset",
    });
    const admin = await createSupabaseAdminServerClient();
    const query = admin.from("users").select("id,phone");
    const found = identifier.includes("@")
      ? await query.eq("email", identifier).maybeSingle()
      : await query.eq("phone", identifier).maybeSingle();
    if (!found.data?.id || normalizeVerificationPhone(String(found.data.phone ?? "")) !== phone) {
      return NextResponse.json({ message: "Compte introuvable." }, { status: 400 });
    }

    const updated = await admin.auth.admin.updateUserById(String(found.data.id), { password });
    if (updated.error) return NextResponse.json({ message: updated.error.message }, { status: 400 });
    await consumeAuthChallenge(challengeId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof AuthVerificationError ? error.status : 500;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Réinitialisation impossible." }, { status });
  }
}
