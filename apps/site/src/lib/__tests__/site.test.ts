import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { platformLoginUrl, revisionUrl, mobileUrl, playStoreUrl } from '../urls';
import { submitDemoRequest } from '../demo-request';

test('CTA vers les domaines finaux ; téléchargement uniquement si Google Play configuré', () => {
  assert.equal(platformLoginUrl, 'https://app.elima.ci/login');
  assert.equal(revisionUrl, 'https://revision.elima.ci');
  assert.equal(mobileUrl, 'https://m.elima.ci');
  assert.equal(playStoreUrl(), null);
  assert.equal(playStoreUrl('javascript:alert(1)'), null);
  assert.equal(playStoreUrl('https://play.google.com.evil.example/store'), null);
  assert.equal(playStoreUrl('https://play.google.com/store/apps/details?id=ci.elima.revision'), 'https://play.google.com/store/apps/details?id=ci.elima.revision');
});

test('le formulaire transmet seulement les champs publics au mécanisme de démo existant', async () => {
  const request = new Request('https://elima.ci/api/demo-requests', { method: 'POST', body: JSON.stringify({ name: 'Test', school: 'École test', email: 'test@example.org', phone: '+2250102030405', message: 'Démo', role: 'ADMIN' }) });
  let calls = 0;
  const response = await submitDemoRequest(request, async (url, options) => {
    calls++; assert.equal(url, 'https://app.elima.ci/api/demo-requests');
    assert.equal(JSON.parse(String(options?.body)).role, undefined);
    assert.equal(JSON.parse(String(options?.body)).school, 'École test');
    return Response.json({ ok: true });
  });
  assert.equal(response.status, 200); assert.equal(calls, 1);
});

test('erreurs de formulaire et indisponibilité ne divulguent aucun message serveur', async () => {
  const invalid = new Request('https://elima.ci/api/demo-requests', { method: 'POST', body: '{}' });
  assert.equal((await submitDemoRequest(invalid, async () => { throw new Error('not expected'); })).status, 400);
  const valid = new Request('https://elima.ci/api/demo-requests', { method: 'POST', body: JSON.stringify({ name: 'Test', school: 'Test', email: 'test@example.org' }) });
  const response = await submitDemoRequest(valid, async () => Response.json({ message: 'private database detail' }, { status: 500 }));
  assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private database/);
});

test('Site conserve la landing et reste indépendant des applications métier', () => {
  const root = join(process.cwd(), 'src');
  function walk(dir: string): string[] { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]); }
  const source = walk(root).filter(p => /\.(tsx?|mjs)$/.test(p) && !p.includes('__tests__')).map(p => readFileSync(p, 'utf8')).join('\n');
  assert.match(source, /Transformer l’éducation/);
  assert.match(source, /en Afrique à/);
  assert.match(source, /l’ère/);
  assert.match(source, /du numérique/);
  assert.doesNotMatch(source, /L’éducation d’aujourd’hui, un meilleur demain/);
  assert.match(source, /Démarrer gratuitement/);
  assert.match(source, /hero_landscape\.png/);
  assert.match(source, /web_view\.png/);
  assert.match(source, /mobiles_view\.png/);
  assert.doesNotMatch(readFileSync('src/app/page.tsx', 'utf8'), /<video|5388900_Coll_wavebreak/);
  assert.match(source, /Scanner de documents/);
  assert.doesNotMatch(source, /from\s+['"][^'"]*(apps\/(platform|mobile|revision)|@elima\/(auth|revision-core|revision-ui)|supabase)/);
  assert.doesNotMatch(source, /\.vercel\.app|document\.cookie|\/api\/auth\//);
  assert.match(readFileSync('src/app/layout.tsx', 'utf8'), /metadataBase: new URL\("https:\/\/elima.ci"\)/);
  assert.match(readFileSync('src/components/RevisionSection.tsx', 'utf8'), /revisionPlayStoreUrl \?/);
  assert.doesNotMatch(readFileSync('vercel.json', 'utf8'), /ignoreCommand/);
});
