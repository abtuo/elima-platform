import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { refreshSchoolSession } from './lib/supabase/middleware-session';

const protectedPrefixes = ["/dashboard", "/teacher", "/parent", "/student", "/api"];

function hasSupabaseSessionCookie(request: NextRequest) {
  // Supabase SSR stores the session across multiple cookies.
  // Cookie names look like: sb-<project-ref>-auth-token (and chunked variants).
  // We keep this check intentionally simple so it works on Edge.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return false;
  const prefix = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
  return request.cookies.getAll().some((c) => (c.name === prefix || c.name.startsWith(`${prefix}.`)) && Boolean(c.value));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/api/auth/email/login") ||
    pathname === "/api/auth/password/login" ||
    pathname === "/api/auth/teacher-code/login" ||
    pathname.startsWith("/api/auth/signup") ||
    pathname === "/api/auth/verification/request" ||
    pathname.startsWith("/api/mobile/me") ||
    pathname.startsWith("/api/mobile/activate-school") ||
    pathname.startsWith("/api/demo-requests") ||
    pathname.startsWith("/api/schools")
  ) {
    return NextResponse.next();
  }

  const needsAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!needsAuth) return NextResponse.next();

  // Allow public access for demo PDF reports
  if (pathname.startsWith("/api/reports")) {
    return NextResponse.next();
  }

  // Only the school/Identity project cookie is eligible. It is verified and refreshed
  // below; role-based authorization remains in server components / API routes.
  const hasSession = hasSupabaseSessionCookie(request);
  if (!hasSession) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login/phone-password", request.url);
    loginUrl.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return refreshSchoolSession(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/teacher/:path*", "/parent/:path*", "/student/:path*", "/api/:path*"],
};
