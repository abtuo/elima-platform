import { NextResponse } from 'next/server';
import { normalizePhone } from '@elima/auth';
import { centralPasswordLogin, isSameOrigin, requireProject, IDENTITY_PROJECT, schoolLoginIdentifier } from '@/lib/elima-api';
import { installCentralSession } from '@/lib/central-session';
import { createSupabaseAdminServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: 'Origine non autorisée.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const phone = normalizePhone(String(body?.phone ?? ''));
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!phone || !password) return NextResponse.json({ message: 'Numéro WhatsApp et mot de passe requis.' }, { status: 400 });
  try {
    requireProject(process.env.NEXT_PUBLIC_SUPABASE_URL, IDENTITY_PROJECT);
    const admin = await createSupabaseAdminServerClient();
    const profile = await admin.from('users').select('email').eq('phone', phone).maybeSingle();
    if (profile.error) throw new Error('Profil indisponible');
    const upstream = await centralPasswordLogin(schoolLoginIdentifier(phone, profile.data), password);
    if (!upstream.ok) {
      const status = [400, 401, 403, 429].includes(upstream.status) ? upstream.status : 503;
      return NextResponse.json({ message: status === 429 ? 'Trop de tentatives. Réessayez plus tard.' : status === 503 ? 'Connexion momentanément indisponible.' : 'Numéro WhatsApp ou mot de passe incorrect.' }, { status });
    }
    return await installCentralSession(await upstream.json());
  } catch {
    return NextResponse.json({ message: 'Connexion Elima momentanément indisponible.' }, { status: 503 });
  }
}
