import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminServerClient } from './supabase/server';
import { IDENTITY_PROJECT, requireProject } from './elima-api';
import { isValidRole } from './rbac';
import { getRoleHomePath } from './role-home';

export async function installCentralSession(tokens: { access_token?: string; refresh_token?: string }) {
  requireProject(process.env.NEXT_PUBLIC_SUPABASE_URL, IDENTITY_PROJECT);
  if (!tokens.access_token || !tokens.refresh_token) throw new Error('Session manquante');
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
  if (error || !data.user) throw new Error('Session invalide');
  const admin = await createSupabaseAdminServerClient();
  const profile = await admin.from('users').select('role').eq('id', data.user.id).maybeSingle();
  const role = String(profile.data?.role ?? '');
  if (profile.error || !isValidRole(role)) {
    await client.auth.signOut();
    return NextResponse.json({ message: 'Votre profil Elima est indisponible. Contactez votre établissement.' }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true, redirectTo: getRoleHomePath(role) }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set('elima_role', role, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 43200 });
  return response;
}
