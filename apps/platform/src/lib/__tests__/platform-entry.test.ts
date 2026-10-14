import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';
import { getRoleHomePath } from '../role-home';

test('racine Platform anonyme vers login, jamais vers une landing', async () => {
  const response = await middleware(new NextRequest('https://app.elima.ci/'));
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get('location')!).pathname, '/login/phone-password');
  const source = readFileSync('src/app/page.tsx', 'utf8');
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /select\('role'\)/);
  assert.doesNotMatch(source, /MarketingHeader|Pilotez votre école|elima_role/);
});

test('destination de tous les rôles scolaires conservée', () => {
  for (const [role, expected] of Object.entries({ SUPER_ADMIN: '/dashboard', SCHOOL_ADMIN: '/dashboard', COMPTABLE: '/dashboard/finance', TEACHER: '/teacher', PARENT: '/parent', STUDENT: '/student' })) {
    assert.equal(getRoleHomePath(role as Parameters<typeof getRoleHomePath>[0]), expected);
  }
});
