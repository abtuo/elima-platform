import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth";
import { isValidRole } from "@/lib/rbac";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as null | { email?: string; password?: string; redirect?: string };
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ message: "Email et mot de passe requis" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  // Resolve role + set cookie so middleware / UI spaces can redirect properly.
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: true, redirectTo: "/" });
  }

  let role: string | null = null;
  try {
    const admin = await createSupabaseAdminServerClient();
    const { data: userRow } = await admin.from("users").select("role").eq("id", userId).maybeSingle();
    role = userRow?.role ? String(userRow.role) : null;
  } catch {
    // If server role isn't configured, we still don't want to crash login.
    role = null;
  }

  const resolvedRole = role && isValidRole(role) ? role : null;
  const requestedRedirect = safeRedirect(String(body?.redirect ?? ""));
  const redirectTo = requestedRedirect ?? (resolvedRole ? getRoleHomePath(resolvedRole) : "/dashboard");
  const response = NextResponse.json({ ok: true, redirectTo });
  if (resolvedRole) {
    response.cookies.set("elima_role", resolvedRole, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }
  return response;
}

function safeRedirect(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    const allowed = url.origin === "https://app.elima.ci" || (process.env.NODE_ENV !== "production" && url.origin === "http://localhost:5173");
    return allowed && url.pathname.startsWith("/auth/elima/") ? url.toString() : null;
  } catch { return null; }
}
