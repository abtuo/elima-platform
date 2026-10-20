import { NextResponse } from "next/server";
import { callElimaApi } from "@/lib/elima-api";
import { normalizeStoreLoginPhone } from "@/lib/phone";
import { consumeLoginAttempt } from "@/lib/rate-limit";
import { createIdentityClient, isIdentityConfigured } from "@/lib/supabase-server";

export async function POST(request: Request) {
  if (!isIdentityConfigured()) return NextResponse.json({ message: "La connexion est momentanément indisponible." }, { status: 503 });
  const body = await request.json().catch(() => null) as { phone?: string; password?: string } | null;
  const phone = normalizeStoreLoginPhone(String(body?.phone ?? ""));
  const password = String(body?.password ?? "");
  if (!phone || !password) return NextResponse.json({ message: "Saisissez votre numéro et votre mot de passe." }, { status: 400 });
  if (!consumeLoginAttempt(phone)) return NextResponse.json({ message: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  try {
    const upstream = await callElimaApi("/api/elima-password-login", { identifier: phone, password });
    const session = await upstream.json().catch(() => null) as { access_token?: string; refresh_token?: string } | null;
    if (!upstream.ok || !session?.access_token || !session.refresh_token) return NextResponse.json({ message: upstream.status === 429 ? "Trop de tentatives. Réessayez dans quelques minutes." : "Numéro ou mot de passe incorrect." }, { status: upstream.status === 429 ? 429 : 401 });
    const supabase = await createIdentityClient();
    const { error } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (error) return NextResponse.json({ message: "La connexion est momentanément indisponible." }, { status: 503 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("store_password_login_failed", { code: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ message: "La connexion est momentanément indisponible." }, { status: 503 });
  }
}
