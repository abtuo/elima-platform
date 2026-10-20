import { NextResponse } from "next/server";
import { callElimaApi } from "@/lib/elima-api";
import { normalizeStoreLoginPhone } from "@/lib/phone";
import { createIdentityClient, isIdentityConfigured } from "@/lib/supabase-server";

export async function POST(request: Request) {
  if (!isIdentityConfigured()) return NextResponse.json({ message: "La connexion est momentanément indisponible." }, { status: 503 });
  const body = await request.json().catch(() => null) as { phone?: string; password?: string; authorization?: string; action?: string; firstName?: string; lastName?: string } | null;
  const phone = normalizeStoreLoginPhone(String(body?.phone ?? ""));
  const password = String(body?.password ?? "");
  const authorization = String(body?.authorization ?? "");
  if (!phone || password.length < 8 || authorization.length < 32) return NextResponse.json({ message: "Les informations saisies sont incomplètes." }, { status: 400 });
  try {
    let recentSignup = false;
    if (body?.action === "create_account") {
      const signup = await callElimaApi("/api/elima-store-signup", { phone, password, authorization, firstName: body.firstName, lastName: body.lastName });
      const result = await signup.json().catch(() => null) as { message?: string } | null;
      if (!signup.ok) return NextResponse.json({ message: result?.message || "Le compte n’a pas pu être créé." }, { status: signup.status >= 400 && signup.status < 500 ? signup.status : 503 });
      recentSignup = true;
    } else {
      const reset = await callElimaApi("/api/auth-password-reset", { action: "confirm", phone, password, authorization });
      const result = await reset.json().catch(() => null) as { message?: string } | null;
      if (!reset.ok) return NextResponse.json({ message: result?.message || "Le mot de passe n’a pas pu être enregistré." }, { status: reset.status >= 400 && reset.status < 500 ? reset.status : 503 });
    }
    const login = await callElimaApi("/api/elima-password-login", { identifier: phone, password, recentSignup });
    const session = await login.json().catch(() => null) as { access_token?: string; refresh_token?: string } | null;
    if (!login.ok || !session?.access_token || !session.refresh_token) return NextResponse.json({ message: "Votre mot de passe est enregistré. Connectez-vous pour continuer." }, { status: 409 });
    const supabase = await createIdentityClient();
    const { error } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (error) return NextResponse.json({ message: "Votre mot de passe est enregistré. Connectez-vous pour continuer." }, { status: 409 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("store_password_completion_failed", { code: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ message: "Le service est momentanément indisponible." }, { status: 503 });
  }
}
