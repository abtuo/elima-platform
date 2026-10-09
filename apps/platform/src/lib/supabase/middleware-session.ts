import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// Refresh in middleware, where cookies can be written before Server Components run.
// Authorization for school roles remains in the existing server pages/handlers.
export async function refreshSchoolSession(request: NextRequest, makeClient = createServerClient) {
  let response = NextResponse.next({ request });
  try {
    const client = makeClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data, error } = await client.auth.getUser();
    if (!error && data.user) { response.headers.set('Cache-Control', 'private, no-store'); return response; }
  } catch { /* Never authorize based only on an unverified cookie. */ }
  const rejected = request.nextUrl.pathname.startsWith('/api')
    ? NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    : NextResponse.redirect(new URL('/login/phone-password', request.url));
  response.cookies.getAll().forEach(cookie => rejected.cookies.set(cookie));
  rejected.headers.set('Cache-Control', 'no-store');
  return rejected;
}
