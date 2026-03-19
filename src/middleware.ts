import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessRole, isValidRole } from "@/lib/rbac";
import type { AppRole } from "@/lib/types";

const protectedPrefixes = ["/dashboard", "/teacher", "/api"];

const pageRoleRules: Array<{ prefix: string; role: AppRole }> = [
  { prefix: "/dashboard", role: "SCHOOL_ADMIN" },
  { prefix: "/teacher", role: "TEACHER" },
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/logout")) {
    return NextResponse.next();
  }

  const needsAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!needsAuth) return NextResponse.next();

  // Allow public access for demo PDF reports
  if (pathname.startsWith("/api/reports")) {
    return NextResponse.next();
  }

  const role = request.cookies.get("elima_role")?.value;
  if (!role || !isValidRole(role)) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const pageRule = pageRoleRules.find((rule) => pathname.startsWith(rule.prefix));
  if (pageRule && !canAccessRole(role, pageRule.role)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const requiredRole = pathname.startsWith("/api/notifications") ? "TEACHER" : "SCHOOL_ADMIN";
  if (pathname.startsWith("/api") && !canAccessRole(role, requiredRole)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/teacher/:path*", "/api/:path*"],
};
