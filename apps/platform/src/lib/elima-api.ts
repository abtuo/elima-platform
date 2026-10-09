import { createApiClient } from '@elima/api-client';

export const IDENTITY_PROJECT = 'nnsgvnjzfrcmbxfwlyow';
export const REVISION_PROJECT = 'rydnrvvmwixrkmnvpajf';

export function requireProject(url: string | undefined, project: string) {
  if (url?.replace(/\/$/, '') !== `https://${project}.supabase.co`) throw new Error('Configuration du service Elima incomplète.');
  return url.replace(/\/$/, '');
}

export function commonApi(baseUrl = process.env.ELIMA_API_BASE_URL) {
  if (!baseUrl?.startsWith('https://')) throw new Error('Configuration API Elima incomplète.');
  return createApiClient({ baseUrl, environment: 'production' });
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return (!origin || origin === new URL(request.url).origin) && request.headers.get('sec-fetch-site') !== 'cross-site';
}

// Passwords are forwarded unchanged; this adapter never authenticates against Revision.
export async function centralPasswordLogin(identifier: string, password: string, apiFetch = commonApi().apiFetch) {
  return apiFetch('/api/elima-password-login', {
    method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
}

// School accounts can predate synthetic phone emails. Never create another identity.
export function schoolLoginIdentifier(phone: string, profile: { email?: string | null } | null) {
  return profile?.email?.trim().toLowerCase() || phone;
}
