import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const authorizationId = String(form.get("authorization_id") ?? "").trim();
  const decision = String(form.get("decision") ?? "");
  if (!authorizationId || !["approve", "deny"].includes(decision)) {
    return NextResponse.json({ message: "Décision OAuth invalide." }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  const result = decision === "approve"
    ? await supabase.auth.oauth.approveAuthorization(authorizationId)
    : await supabase.auth.oauth.denyAuthorization(authorizationId);
  if (result.error || !result.data?.redirect_url) {
    return NextResponse.json({ message: result.error?.message ?? "Décision impossible." }, { status: 400 });
  }
  return NextResponse.redirect(result.data.redirect_url, 303);
}
