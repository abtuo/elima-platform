import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { getSchoolKpisForCurrentUserSchool } from "@/lib/dashboard/kpis";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { checkSchoolFeature } from "@/lib/plans-server";

export async function GET(request: Request) {
  const role = await getSessionRole();
  if (role !== "SCHOOL_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user?.id) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  const { data: userRow } = await admin
    .from("users")
    .select("school_id")
    .eq("id", authData.user.id)
    .maybeSingle();
  const schoolId = (userRow as { school_id?: string | null } | null)?.school_id;
  if (!schoolId) {
    return NextResponse.json({ message: "École introuvable" }, { status: 404 });
  }
  const planErr = await checkSchoolFeature(String(schoolId), "kpis", role);
  if (planErr) return planErr;

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const classId = url.searchParams.get("classId") ?? undefined;

  try {
    const kpis = await getSchoolKpisForCurrentUserSchool({ from, to, classId });
    return NextResponse.json(kpis);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
