import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/teacher", "/parent", "/student", "/api"];

function hasSupabaseSessionCookie(request: NextRequest) {
  // Supabase SSR stores the session across multiple cookies.
  // Cookie names look like: sb-<project-ref>-auth-token (and chunked variants).
  // We keep this check intentionally simple so it works on Edge.
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && Boolean(c.value));
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/api/auth/email/login") ||
    pathname.startsWith("/api/auth/signup") ||
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

  // Supabase Auth (mode 2): we only check session presence here.
  // Role-based authorization is enforced inside server components / API routes.
  const hasSession = hasSupabaseSessionCookie(request);
  if (!hasSession) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login/email", request.url);
    loginUrl.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/teacher/:path*", "/parent/:path*", "/student/:path*", "/api/:path*"],
};
