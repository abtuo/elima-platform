import { NextResponse } from "next/server";
import { callElimaApi } from "@/lib/elima-api";
import { normalizeStoreLoginPhone } from "@/lib/phone";
import { consumeOtpRequest } from "@/lib/rate-limit";
import { isIdentityConfigured } from "@/lib/supabase-server";

export async function POST(request: Request) {
  if (!isIdentityConfigured()) return NextResponse.json({ message: "La vérification du numéro est momentanément indisponible." }, { status: 503 });
  const body = await request.json().catch(() => null) as { phone?: string; flow?: string } | null;
  const phone = normalizeStoreLoginPhone(String(body?.phone ?? ""));
  const flow = ["signup", "activation", "password_reset"].includes(String(body?.flow)) ? String(body?.flow) : "signup";
  if (!phone) return NextResponse.json({ message: "Saisissez un numéro de téléphone valide." }, { status: 400 });
  if (!consumeOtpRequest(phone)) return NextResponse.json({ message: "Trop de demandes. Réessayez dans quelques minutes." }, { status: 429, headers: { "Retry-After": "600" } });
  try {
    const upstream = await callElimaApi("/api/auth-verification-request", { phone, purpose: flow === "password_reset" ? "password_reset" : "signup" });
    const data = await upstream.json().catch(() => null) as { requestToken?: string; message?: string } | null;
    if (!upstream.ok || !data?.requestToken) return NextResponse.json({ message: data?.message || "Le code n’a pas pu être envoyé." }, { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 503 });
    return NextResponse.json({ ok: true, phone, requestToken: data.requestToken }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("store_otp_request_failed", { code: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ message: "La vérification du numéro est momentanément indisponible." }, { status: 503 });
  }
}
