import { NextResponse } from "next/server";
import { createIdentityClient, isIdentityConfigured } from "@/lib/supabase-server";

function publicContactEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^\S+@\S+\.\S+$/.test(email) && !email.endsWith("@phone.elima") ? email : "";
}

export async function GET() {
  if (!isIdentityConfigured()) return NextResponse.json({ configured: false, user: null });
  const supabase = await createIdentityClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ configured: true, user: null }, { headers: { "Cache-Control": "no-store" } });
  const meta = data.user.user_metadata || {};
  const [{ data: staff }, { data: profile }] = await Promise.all([
    supabase.from("store_staff").select("role,status").eq("user_id", data.user.id).maybeSingle(),
    supabase.from("users").select("phone").eq("id", data.user.id).maybeSingle(),
  ]);
  const phone = data.user.phone || profile?.phone || meta.phone || "";
  return NextResponse.json({ configured: true, user: { id: data.user.id, phone, phoneVerified: Boolean(data.user.phone_confirmed_at || profile?.phone), firstName: meta.first_name || "", lastName: meta.last_name || "", email: publicContactEmail(meta.contact_email), storeRole: staff?.status === "active" ? staff.role : null } }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!isIdentityConfigured()) return NextResponse.json({ message: "Le profil est momentanément indisponible." }, { status: 503 });
  const supabase = await createIdentityClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ message: "Connectez-vous pour continuer." }, { status: 401 });
  const body = await request.json().catch(() => null) as { firstName?: string; lastName?: string; email?: string } | null;
  const firstName = String(body?.firstName || "").trim();
  const lastName = String(body?.lastName || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  if (!firstName || !lastName || (email && !/^\S+@\S+\.\S+$/.test(email))) return NextResponse.json({ message: "Vérifiez votre prénom, votre nom et votre e-mail de contact." }, { status: 400 });
  const { error } = await supabase.auth.updateUser({ data: { ...auth.user.user_metadata, first_name: firstName, last_name: lastName, contact_email: email || null } });
  if (error) return NextResponse.json({ message: "Le profil n’a pas pu être enregistré." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
