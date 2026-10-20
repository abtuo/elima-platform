import { NextResponse } from "next/server";
import { normalizeStoreLoginPhone } from "@/lib/phone";
import { consumeOtpRequest } from "@/lib/rate-limit";
import { callElimaApi } from "@/lib/elima-api";
import { isIdentityConfigured } from "@/lib/supabase-server";

export async function POST(request: Request) {
  if (!isIdentityConfigured()) return NextResponse.json({ message: "Le service SMS n’est pas encore configuré pour Elima Store." }, { status: 503 });
  const body = await request.json().catch(() => null) as { phone?: string } | null;
  const phone = normalizeStoreLoginPhone(String(body?.phone ?? ""));
  if (!phone) return NextResponse.json({ message: "Saisissez un numéro valide avec son indicatif international, par exemple +225 ou +33." }, { status: 400 });
  if (!consumeOtpRequest(phone)) return NextResponse.json({ message: "Trop de demandes. Réessayez dans quelques minutes." }, { status: 429, headers: { "Retry-After": "600" } });
  try {
    const upstream = await callElimaApi("/api/auth-verification-request", { phone, purpose: "signup" });
    const data = await upstream.json().catch(() => null) as { requestToken?: string; message?: string } | null;
    if (!upstream.ok || !data?.requestToken) return NextResponse.json({ message: data?.message || "Le code n’a pas pu être envoyé." }, { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 503 });
    return NextResponse.json({ ok: true, phone, requestToken: data.requestToken, channel: "whatsapp" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Le service de connexion Elima est momentanément indisponible." }, { status: 503 });
  }
}
