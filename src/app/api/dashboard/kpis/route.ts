import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { getSchoolKpisForCurrentUserSchool } from "@/lib/dashboard/kpis";

export async function GET(request: Request) {
  const role = await getSessionRole();
  if (role !== "SCHOOL_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

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
