import { NextResponse } from "next/server";
import { callElimaApi } from "@/lib/elima-api";
import { normalizeStoreLoginPhone } from "@/lib/phone";
import { isIdentityConfigured } from "@/lib/supabase-server";

export async function POST(request: Request) {
  if (!isIdentityConfigured()) return NextResponse.json({ message: "La vérification du numéro est momentanément indisponible." }, { status: 503 });
  const body = await request.json().catch(() => null) as { phone?: string; token?: string; requestToken?: string; flow?: string } | null;
  const phone = normalizeStoreLoginPhone(String(body?.phone ?? ""));
  const token = String(body?.token ?? "").trim();
  const requestToken = String(body?.requestToken ?? "");
  const flow = ["signup", "activation", "password_reset"].includes(String(body?.flow)) ? String(body?.flow) : "signup";
  if (!phone || !/^\d{4,10}$/.test(token) || requestToken.length < 32) return NextResponse.json({ message: "Vérifiez le numéro et le code saisis." }, { status: 400 });
  try {
    const checked = await callElimaApi("/api/auth-verification-check", { phone, code: token, requestToken });
    const proof = await checked.json().catch(() => null) as { accountExists?: boolean; purpose?: string; authorization?: string; message?: string } | null;
    if (!checked.ok) return NextResponse.json({ message: proof?.message || "Code invalide ou expiré." }, { status: checked.status >= 400 && checked.status < 500 ? checked.status : 503 });
    if (!proof?.authorization) return NextResponse.json({ message: "Ce code ne permet pas de continuer. Demandez-en un nouveau." }, { status: 400 });
    if (flow === "password_reset" && proof.purpose !== "password_reset") return NextResponse.json({ message: "Ce code ne permet pas de continuer. Demandez-en un nouveau." }, { status: 400 });
    if (flow === "activation" && (!proof.accountExists || proof.purpose !== "phone_control")) return NextResponse.json({ message: "Après vérification, aucun accès existant ne peut être activé avec ce numéro." }, { status: 400 });
    if (proof.purpose === "phone_control") {
      const exchanged = await callElimaApi("/api/auth-password-reset", { action: "authorize", phone, authorization: proof.authorization });
      const reset = await exchanged.json().catch(() => null) as { authorization?: string; message?: string } | null;
      if (!exchanged.ok || !reset?.authorization) return NextResponse.json({ message: reset?.message || "Impossible de poursuivre pour le moment." }, { status: exchanged.status >= 400 && exchanged.status < 500 ? exchanged.status : 503 });
      return NextResponse.json({ ok: true, authorization: reset.authorization, action: "set_password" }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: true, authorization: proof.authorization, action: proof.purpose === "signup" ? "create_account" : "set_password" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("store_otp_check_failed", { code: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ message: "La vérification du numéro est momentanément indisponible." }, { status: 503 });
  }
}
