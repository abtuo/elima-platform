import { NextResponse } from 'next/server';
import { createSupabaseAdminServerClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { createRevisionServerClient } from '@/lib/supabase/revision-server';
import { commonApi, IDENTITY_PROJECT, isSameOrigin, requireProject } from '@/lib/elima-api';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: 'Origine non autorisée.' }, { status: 403 });
  try {
    requireProject(process.env.NEXT_PUBLIC_SUPABASE_URL, IDENTITY_PROJECT);
    const identity = await createSupabaseServerClient();
    const verified = await identity.auth.getUser();
    if (verified.error || !verified.data.user) return NextResponse.json({ message: 'Connexion Elima requise.' }, { status: 401 });
    const admin = await createSupabaseAdminServerClient();
    const profile = await admin.from('users').select('role').eq('id', verified.data.user.id).maybeSingle();
    if (profile.error) throw new Error('Profil indisponible');
    if (profile.data?.role !== 'STUDENT') return NextResponse.json({ message: 'Espace réservé aux élèves.' }, { status: 403 });
    const { data } = await identity.auth.getSession();
    if (!data.session) return NextResponse.json({ message: 'Reconnectez-vous à Elima.' }, { status: 401 });
    // The common bridge resolves the existing UUID link; never match/create by phone here.
    const upstream = await commonApi().apiFetch('/api/identity-bridge', {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: data.session.access_token }),
    });
    if (!upstream.ok) throw new Error('Bridge indisponible');
    const body = await upstream.json();
    if (!body.tokenHash) throw new Error('Session absente');
    const revision = await createRevisionServerClient();
    const session = await revision.auth.verifyOtp({ type: 'magiclink', token_hash: body.tokenHash });
    if (session.error || !session.data.user) throw new Error('Session invalide');
    return NextResponse.json({ userId: session.data.user.id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ message: 'Connexion à Révision momentanément indisponible.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
