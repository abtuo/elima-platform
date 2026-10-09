import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createRevisionServerClient } from '@/lib/supabase/revision-server';
import { cookies } from 'next/headers';
import { IDENTITY_PROJECT, REVISION_PROJECT, isSameOrigin } from '@/lib/elima-api';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: 'Origine non autorisée.' }, { status: 403 });
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch { /* Local logout must still succeed if Identity is unavailable. */ }
  // Revision uses its own cookie namespace; logout must clear both sessions.
  if (process.env.NEXT_PUBLIC_REVISION_SUPABASE_URL && process.env.NEXT_PUBLIC_REVISION_SUPABASE_ANON_KEY) {
    try {
      const revision = await createRevisionServerClient();
      await revision.auth.signOut({ scope: 'local' });
    } catch { /* Clear cookies below even if the upstream cannot revoke the session. */ }
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  const store = await cookies();
  for (const cookie of store.getAll()) {
    if ([IDENTITY_PROJECT, REVISION_PROJECT].some(ref => cookie.name.startsWith(`sb-${ref}-auth-token`))) {
      response.cookies.set(cookie.name, '', { path: '/', maxAge: 0, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    }
  }
  response.cookies.set("elima_role", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === 'production',
    path: "/",
    maxAge: 0,
  });
  return response;
}
