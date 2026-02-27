import { NextResponse } from "next/server";
import { isValidRole } from "@/lib/rbac";
import { getRoleHomePath } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const role = String(formData.get("role") ?? "");

  if (!isValidRole(role)) {
    return NextResponse.redirect(new URL("/login?error=role", request.url));
  }

  const destination = getRoleHomePath(role);
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set("elima_role", role, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
