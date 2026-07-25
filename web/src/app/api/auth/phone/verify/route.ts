import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth";
import { isValidRole } from "@/lib/rbac";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as null | { phone?: string; token?: string; type?: "sms" };
  const phone = String(body?.phone ?? "").trim();
  const token = String(body?.token ?? "").trim();
  const type = body?.type ?? "sms";

  if (!phone || !token) {
    return NextResponse.json({ message: "Téléphone et code requis" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  // Resolve role + set cookie + return redirect
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
    role = null;
  }

  const resolvedRole = role && isValidRole(role) ? role : null;
  const redirectTo = resolvedRole ? getRoleHomePath(resolvedRole) : "/dashboard";
  const response = NextResponse.json({ ok: true, redirectTo });
  if (resolvedRole) {
    response.cookies.set("elima_role", resolvedRole, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }
  return response;
}
