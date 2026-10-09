import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { centralPasswordLogin, commonApi, IDENTITY_PROJECT, REVISION_PROJECT, requireProject, isSameOrigin, schoolLoginIdentifier } from '../elima-api';
import { refreshSchoolSession } from '../supabase/middleware-session';
import { middleware } from '../../middleware';
import { getRoleHomePath } from '../role-home';
import { quizResult, createRevisionDataService } from '@elima/revision-core';
import type { SupabaseClient } from '@supabase/supabase-js';

test('login WhatsApp passe par API commune, mot de passe intact, sans OAuth ni OTP', async () => {
  let sent: RequestInit | undefined;
  const response = await centralPasswordLogin('+33600000000', '  Secret unchanged  ', async (path, init) => {
    assert.equal(path, '/api/elima-password-login'); sent = init;
    return Response.json({ access_token: 'test-access', refresh_token: 'test-refresh' });
  });
  assert.equal(response.status, 200);
  assert.equal(sent?.method, 'POST');
  assert.deepEqual(JSON.parse(String(sent?.body)), { identifier: '+33600000000', password: '  Secret unchanged  ' });
});

test('config interdit mélange Identity / Révision et API same-origin implicite', () => {
  assert.equal(requireProject(`https://${IDENTITY_PROJECT}.supabase.co`, IDENTITY_PROJECT), `https://${IDENTITY_PROJECT}.supabase.co`);
  assert.throws(() => requireProject(`https://${REVISION_PROJECT}.supabase.co`, IDENTITY_PROJECT));
  assert.throws(() => requireProject(undefined, REVISION_PROJECT));
  assert.throws(() => commonApi(''));
  assert.throws(() => commonApi('http://example.com'));
  assert.equal(commonApi('https://elima-api.vercel.app').resolveApiUrl('/api/identity-bridge'), 'https://elima-api.vercel.app/api/identity-bridge');
});

test('un compte scolaire avec un email réel conserve la connexion par numéro via API centrale', async () => {
  const phone = '+33600000000';
  assert.equal(schoolLoginIdentifier(phone, null), phone);
  assert.equal(schoolLoginIdentifier(phone, { email: `${phone}@phone.elima` }), `${phone}@phone.elima`);
  const identifier = schoolLoginIdentifier(phone, { email: ' Parent@Example.org ' });
  await centralPasswordLogin(identifier, 'unchanged', async (path, init) => {
    assert.equal(path, '/api/elima-password-login');
    assert.equal(JSON.parse(String(init?.body)).identifier, 'parent@example.org');
    return Response.json({});
  });
});

test('login public ; bridge privé ; un cookie Révision ne donne pas accès au portail scolaire', async () => {
  for (const path of ['/api/auth/password/login', '/api/auth/teacher-code/login']) {
    assert.equal((await middleware(new NextRequest(`https://www.elima.ci${path}`, { method: 'POST' }))).status, 200);
  }
  assert.equal((await middleware(new NextRequest('https://www.elima.ci/api/revision/session', { headers: { Cookie: `sb-${REVISION_PROJECT}-auth-token=fake` } }))).status, 401);
  assert.equal(isSameOrigin(new Request('https://www.elima.ci/api/revision/session', { headers: { origin: 'https://evil.example' } })), false);
});

test('renouvellement SSR propage les cookies à la requête ET à la réponse', async () => {
  const request = new NextRequest('https://www.elima.ci/student');
  const fake = ((_url: string, _key: string, options: { cookies: {setAll: (values: Array<{name: string; value: string; options: {path: string}}>) => void} }) => ({ auth: { getUser: async () => {
    options.cookies.setAll([{ name: 'sb-central-auth-token', value: 'refreshed', options: { path: '/' } }]);
    return { data: { user: { id: 'identity-uuid' } }, error: null };
  } } })) as unknown as Parameters<typeof refreshSchoolSession>[1];
  const response = await refreshSchoolSession(request, fake);
  assert.equal(response.status, 200);
  assert.equal(request.cookies.get('sb-central-auth-token')?.value, 'refreshed');
  assert.equal(response.cookies.get('sb-central-auth-token')?.value, 'refreshed');
  assert.match(response.headers.get('cache-control')!, /no-store/);
});

test('middleware refuse une session invalide au lieu de croire le cookie de rôle', async () => {
  const fake = (() => ({ auth: { getUser: async () => ({ data: { user: null }, error: { message: 'invalid' } }) } })) as unknown as Parameters<typeof refreshSchoolSession>[1];
  const response = await refreshSchoolSession(new NextRequest('https://www.elima.ci/api/revision/session', { headers: { Cookie: 'elima_role=STUDENT' } }), fake);
  assert.equal(response.status, 401);
});

test('les destinations des rôles scolaires sont préservées', () => {
  assert.equal(getRoleHomePath('STUDENT'), '/student');
  assert.equal(getRoleHomePath('PARENT'), '/parent');
  assert.equal(getRoleHomePath('TEACHER'), '/teacher');
  assert.equal(getRoleHomePath('SCHOOL_ADMIN'), '/dashboard');
  assert.equal(getRoleHomePath('SUPER_ADMIN'), '/dashboard');
  assert.equal(getRoleHomePath('COMPTABLE'), '/dashboard/finance');
});

test('intégration utilise les services partagés et un client Révision isolé', () => {
  const client = readFileSync(new URL('../revision-client.ts', import.meta.url), 'utf8');
  for (const service of ['createRevisionDataService', 'createRevisionDocumentService', 'createSubjectPreferencesService', 'createSubscriptionApi']) assert.match(client, new RegExp(service));
  assert.match(client, /isSingleton: false/);
  assert.match(client, /isDemoModeActive: \(\) => false/);
  assert.doesNotMatch(client, /apps\/(revision|mobile)|signInWithPassword|SERVICE_ROLE/);
  const bridge = readFileSync(new URL('../../app/api/revision/session/route.ts', import.meta.url), 'utf8');
  assert.match(bridge, /auth\.getUser\(\)/);
  assert.match(bridge, /role !== 'STUDENT'/);
  assert.match(bridge, /\/api\/identity-bridge/);
  assert.match(bridge, /token_hash: body.tokenHash/);
  assert.doesNotMatch(bridge, /createUser|signUp|from\('identity_links'\)/);
  const logout = readFileSync(new URL('../../app/api/auth/logout/route.ts', import.meta.url), 'utf8');
  assert.match(logout, /supabase\.auth\.signOut/);
  assert.match(logout, /revision\.auth\.signOut/);
});

test('score QCM partagé : réponses manquantes et quiz vide', () => {
  const questions = [{ id: 'q', question: 'Test', options: ['A', 'B'], correctIndex: 1 }];
  assert.deepEqual(quizResult(questions, [1]), { correctAnswers: 1, totalQuestions: 1, score: 100 });
  assert.equal(quizResult(questions, []).score, 0);
  assert.equal(quizResult([], []).score, 0);
});

test('deux clients du même profil local partagent tentatives et progression via les mêmes tables/RPC', async () => {
  const localId = 'revision-local-uuid';
  const attempts: Record<string, unknown>[] = [];
  let completed = 0;
  const database = {
    auth: { getUser: async () => ({ data: { user: { id: localId } } }) },
    rpc: async (name: string, input: Record<string, unknown>) => {
      assert.equal(name, 'record_quiz_attempt');
      completed++;
      attempts.push({ id: `attempt-${completed}`, user_id: localId, quiz_ref: input.p_quiz_ref, subject_label: input.p_subject_label, score: input.p_score, correct_answers: input.p_correct_answers, total_questions: input.p_total_questions, completed_at: input.p_completed_at });
      return { data: null, error: null };
    },
    from: (table: string) => {
      let userId = '';
      const result = () => ({ data: table === 'user_progress' ? { xp: completed * 50, completed_quiz_count: completed } : table === 'quiz_attempts' ? attempts.filter(row => row.user_id === userId) : [], error: null });
      const query = {
        select: () => query,
        eq: (_column: string, value: string) => { userId = value; assert.equal(value, localId); return query; },
        order: () => query,
        limit: async () => result(),
        maybeSingle: async () => result(),
      };
      return query;
    },
  } as unknown as SupabaseClient;
  const create = () => createRevisionDataService({ revisionDbClient: database, apiFetch: async () => { throw new Error('No AI request expected'); }, isDemoModeActive: () => false, subscriptionRequest: async () => ({ usage: {} }) });
  const platform = create();
  const otherApp = create();
  await platform.recordQuizCompletion({ userId: localId, quizRef: 'quiz-one', subject: 'Mathématiques', score: 100, totalQuestions: 2, correctAnswers: 2 });
  assert.equal((await otherApp.getQuizAttempts(localId))[0]?.quizRef, 'quiz-one');
  assert.equal((await otherApp.getRevisionProgress(localId)).completedQuizCount, 1);
  await otherApp.recordQuizCompletion({ userId: localId, quizRef: 'quiz-two', subject: 'Français', score: 50, totalQuestions: 2, correctAnswers: 1 });
  assert.equal((await platform.getQuizAttempts(localId)).length, 2);
  assert.equal((await platform.getRevisionProgress(localId)).completedQuizCount, 2);
});
