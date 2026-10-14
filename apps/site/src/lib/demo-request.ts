import { platformUrl } from './urls';

export async function submitDemoRequest(request: Request, send: typeof fetch = fetch) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ message: 'Origine non autorisée.' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 8000) return Response.json({ message: 'Message trop long.' }, { status: 413 });
  let input;
  try { input = JSON.parse(raw); } catch { return Response.json({ message: 'Formulaire invalide.' }, { status: 400 }); }
  if (!input || typeof input !== 'object') return Response.json({ message: 'Formulaire invalide.' }, { status: 400 });
  const fields = { name: 200, school: 300, city: 100, email: 254, phone: 60, message: 4000 };
  const body: Record<string, string> = {};
  for (const [field, max] of Object.entries(fields)) {
    const value = typeof input[field] === 'string' ? input[field].trim() : '';
    if (value.length > max) return Response.json({ message: 'Un champ est trop long.' }, { status: 400 });
    body[field] = value;
  }
  if (!body.name || !body.school || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return Response.json({ message: 'Nom, établissement et email valide requis.' }, { status: 400 });
  try {
    const upstream = await send(`${platformUrl}/api/demo-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) return Response.json({ message: 'Envoi indisponible. Contactez contact@elima.africa.' }, { status: upstream.status === 429 ? 429 : 503 });
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ message: 'Envoi indisponible. Contactez contact@elima.africa.' }, { status: 503 }); }
}
