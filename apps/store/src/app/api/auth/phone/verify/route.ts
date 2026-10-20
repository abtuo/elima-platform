import { NextResponse } from "next/server";
import { normalizeStoreLoginPhone } from "@/lib/phone";
import { callElimaApi } from "@/lib/elima-api";
import { createIdentityClient, isIdentityConfigured } from "@/lib/supabase-server";
export async function POST(request: Request) {
  if (!isIdentityConfigured()) return NextResponse.json({ message: "Le service SMS n’est pas encore configuré pour Elima Store." }, { status: 503 });
  const body = await request.json().catch(() => null) as { phone?: string; token?: string; requestToken?: string } | null;
  const phone = normalizeStoreLoginPhone(String(body?.phone ?? "")); const token = String(body?.token ?? "").trim();
  const requestToken = String(body?.requestToken ?? "");
  if (!phone || !/^\d{4,10}$/.test(token) || requestToken.length < 32) return NextResponse.json({ message: "Numéro, demande ou code invalide." }, { status: 400 });
  try {
    const checked = await callElimaApi("/api/auth-verification-check", { phone, code: token, requestToken });
    const proof = await checked.json().catch(() => null) as { accountExists?: boolean; purpose?: string; authorization?: string; message?: string } | null;
    if (!checked.ok) return NextResponse.json({ message: proof?.message || "Code invalide ou expiré." }, { status: checked.status >= 400 && checked.status < 500 ? checked.status : 503 });
    if (!proof?.accountExists || proof.purpose !== "phone_control" || !proof.authorization) return NextResponse.json({ message: "Aucun compte Elima existant n’est associé à ce numéro." }, { status: 404 });

    const login = await callElimaApi("/api/elima-phone-login", { phone, authorization: proof.authorization });
    const session = await login.json().catch(() => null) as { access_token?: string; refresh_token?: string; userId?: string; message?: string } | null;
    if (!login.ok || !session?.access_token || !session.refresh_token || !session.userId) return NextResponse.json({ message: session?.message || "La session Elima n’a pas pu être ouverte." }, { status: login.status >= 400 && login.status < 500 ? login.status : 503 });

    const supabase = await createIdentityClient();
    const { data, error } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (error || data.user?.id !== session.userId) {
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.json({ message: "La session Elima n’a pas pu être vérifiée." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, needsProfile: !data.user.user_metadata?.first_name || !data.user.user_metadata?.last_name }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Le service de connexion Elima est momentanément indisponible." }, { status: 503 });
  }
}
