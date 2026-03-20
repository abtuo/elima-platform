import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhone, phoneToEmail } from "@/lib/phone-auth";
import { getRoleHomePath } from "@/lib/auth";
import { isValidRole } from "@/lib/rbac";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as null | { phone?: string; password?: string };
  const phone = normalizePhone(String(body?.phone ?? ""));
  const password = String(body?.password ?? "");

  if (!phone || !password) {
    return NextResponse.json({ message: "Téléphone et mot de passe requis" }, { status: 400 });
  }

  // We need to resolve which Supabase Auth identity (email) corresponds to that phone.
  // This lookup must bypass RLS -> service role.
  const admin = await createSupabaseAdminServerClient();
  const { data: profile, error: profileErr } = await admin
    .from("users")
    .select("email, role")
    .eq("phone", phone)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ message: profileErr.message }, { status: 400 });
  }

  const resolvedEmail = String(profile?.email ?? "").trim().toLowerCase();
  const roleRaw = String(profile?.role ?? "");

  // Fallback for older datasets where we created auth users with a deterministic email.
  const emailForAuth = resolvedEmail || phoneToEmail(phone);

  const supabase = await createSupabaseServerClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: emailForAuth,
    password,
  });

  if (signInErr) {
    return NextResponse.json({ message: "Identifiants invalides" }, { status: 400 });
  }

  // Resolve role (prefer the service-role lookup, but keep a fallback using the logged-in user).
  let resolvedRole = roleRaw;
  if (!resolvedRole) {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      return NextResponse.json({ message: userErr.message }, { status: 400 });
    }
    const userId = userRes.user?.id;
    if (!userId) {
      return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 400 });
    }
    const { data: profile2, error: profileErr2 } = await admin
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr2) {
      return NextResponse.json({ message: profileErr2.message }, { status: 400 });
    }
    resolvedRole = String(profile2?.role ?? "");
  }

  if (!resolvedRole || !isValidRole(resolvedRole)) {
    return NextResponse.json(
      {
        message: "Votre compte n’est pas encore rattaché à une école. Contactez l’administrateur.",
      },
      { status: 403 },
    );
  }

  const redirectTo = getRoleHomePath(resolvedRole);
  const response = NextResponse.json({ ok: true, redirectTo });
  response.cookies.set("elima_role", resolvedRole, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
