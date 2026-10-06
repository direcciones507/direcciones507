import { beforeAll, afterAll, test, expect } from 'bun:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import { createGeneralAuth } from '../general-auth';
import { prepareMigration0005 } from '../scripts/prepare-0005';

const root = new URL('../../../', import.meta.url);
const dir = mkdtempSync(join(tmpdir(), 'ad507-auth-test-'));
const password = crypto.randomUUID();
const pg = new EmbeddedPostgres({ databaseDir: join(dir, 'db'), user: 'postgres', password, port: 55439, persistent: false, createPostgresUser: true, onLog: () => {}, onError: () => {} });
let sql: ReturnType<typeof postgres>, runtime: ReturnType<typeof Bun.spawn>;
const origin = 'https://ad507-core-production.up.railway.app';
const env = { AD507_GOOGLE_CLIENT_ID: 'test-client', AD507_GOOGLE_CLIENT_SECRET: crypto.randomUUID(), AD507_SESSION_SECRET: crypto.randomUUID() + crypto.randomUUID(), AD507_GOOGLE_REDIRECT_URI: origin + '/auth/google/callback', AD507_AUTH_SUCCESS_URL: '/', AD507_PUBLIC_BASE_URL: origin };
const clientId = '11111111-1111-4111-8111-111111111111', adminId = '22222222-2222-4222-8222-222222222222';

beforeAll(async () => {
  const external = process.env.AD507_TEST_DATABASE_URL;
  if (external && !['127.0.0.1', 'localhost'].includes(new URL(external).hostname)) throw new Error('TEST_DATABASE_MUST_BE_LOCAL');
  if (!external) { await pg.initialise(); await pg.start(); }
  const database = external ?? `postgres://postgres:${password}@127.0.0.1:55439/postgres`;
  sql = postgres(database, { max: 1 });
  for (const file of ['0000_migration_ledger.sql', '0001_core_foundation.sql', '0005_general_google_auth.sql']) await sql.unsafe(readFileSync(new URL('db/migrations/' + file, root), 'utf8'));
  await sql.unsafe(readFileSync(new URL('db/migrations/0005_general_google_auth.sql', root), 'utf8'));
  await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1::uuid,'client@gmail.com'),($2::uuid,'admin@example.test')", [clientId, adminId]);
  await sql.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'CLIENT'),($2::uuid,'ADMIN')", [clientId, adminId]);
  runtime = Bun.spawn([process.execPath, 'server.ts'], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, ...env, PORT: '55440', DATABASE_URL: database, AD507_RESIDENTIAL_PROVISIONING_SECRET: crypto.randomUUID() }, stdout: 'ignore', stderr: 'pipe' });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:55440/health')).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('RUNTIME_FAILED: ' + await new Response(runtime.stderr).text());
}, 30000);
afterAll(async () => { runtime?.kill(); if (runtime) await runtime.exited; await sql?.end(); if (!process.env.AD507_TEST_DATABASE_URL) await pg.stop(); rmSync(dir, { recursive: true, force: true }); });

function google(profile: Record<string, unknown>, tokenFailure = false) {
  return (async (url: any, init: any) => {
    if (String(url) === 'https://oauth2.googleapis.com/token') {
      expect(new URLSearchParams(init.body).get('code_verifier')).toHaveLength(43);
      return Response.json(tokenFailure ? {} : { access_token: 'external-test-token' }, { status: tokenFailure ? 401 : 200 });
    }
    expect(String(url)).toBe('https://openidconnect.googleapis.com/v1/userinfo');
    return Response.json(profile);
  }) as typeof fetch;
}
function request(path: string, headers: Record<string, string> = {}, method = 'GET') { return new Request(origin + path, { method, headers }); }
function binding(res: Response) { return res.headers.getSetCookie().find(x => x.startsWith('ad507_oauth_state='))!.split(';')[0]; }
function session(res: Response) { return res.headers.getSetCookie().find(x => x.startsWith('ad507_session='))!.split(';')[0]; }
async function login(auth: ReturnType<typeof createGeneralAuth>) {
  const res = (await auth.handle(request('/auth/google/login')))!;
  expect(res.status).toBe(302);
  const url = new URL(res.headers.get('location')!);
  expect(url.searchParams.get('scope')).toBe('openid email profile');
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect(res.headers.get('set-cookie')).toContain('HttpOnly; Secure; SameSite=Lax');
  return { path: '/auth/google/callback?state=' + url.searchParams.get('state') + '&code=test', cookie: binding(res) };
}
test('exact extraction and all 12 Residential routes/handlers survive', () => {
  const snapshot = readFileSync(new URL('../legacy.snapshot.txt', import.meta.url), 'utf8').trimEnd();
  const legacy = readFileSync(new URL('../legacy.ts', import.meta.url), 'utf8').trimEnd();
  const expected = snapshot.replace('Bun.serve({ hostname:', 'export function startLegacyCore(extension: (req: Request) => Promise<Response | null>) { return Bun.serve({ hostname:').replace('async fetch(req) { const startedAt', 'async fetch(req) { const added = await extension(req); if (added) return added; const startedAt').replace('}); audit("controlled_private_listener_ready"', '}); } audit("controlled_private_listener_ready"');
  expect(legacy).toBe(expected);
  const routes = [...snapshot.matchAll(/const (RESIDENTIAL_\w*ROUTE)\s*=\s*"([^"]+)"/g)];
  expect(routes.length).toBe(12);
  for (const [, name, path] of routes) { expect(legacy).toContain(path); expect(legacy).toContain('url.pathname === ' + name); }
  for (const route of ['SESSION_ROUTE', 'CONVERSATION_ROUTE', 'ROUTE', 'ANALYTICS_TRACK_ROUTE', 'ANALYTICS_EXCHANGE_ROUTE', 'ANALYTICS_SUMMARY_ROUTE']) expect(legacy).toContain('url.pathname ' + (route === 'ROUTE' ? '!==' : '===') + ' ' + route);
  expect(legacy).toContain('handlePublicAD507Page(req, url)');
  expect(legacy).toContain('req.method === "HEAD"');
});
test('real Bun entrypoint: health/readiness and real PostgreSQL', async () => {
  expect((await fetch('http://127.0.0.1:55440/health')).status).toBe(200);
  const ready = await fetch('http://127.0.0.1:55440/ready'); expect(ready.status).toBe(200);
  expect((await ready.json()).database).toBe(true);
  expect((await sql.unsafe('SELECT 1 AS connected'))[0].connected).toBe(1);
});
test('legacy POST routes remain dispatched with invalid credentials', async () => {
  const snapshot = readFileSync(new URL('../legacy.snapshot.txt', import.meta.url), 'utf8');
  const paths = [...snapshot.matchAll(/const RESIDENTIAL_\w*ROUTE\s*=\s*"([^"]+)"/g)].map(x => x[1]);
  paths.push('/internal/v1/natalie/controlled-session', '/internal/v1/natalie/controlled-query', '/internal/v1/analytics/track', '/internal/v1/analytics/access/exchange');
  for (const path of paths) {
    const res = await fetch('http://127.0.0.1:55440' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).not.toBe(404); expect(res.status).toBeLessThan(500);
  }
  expect((await fetch('http://127.0.0.1:55440/internal/v1/analytics/private/summary')).status).not.toBe(404);
});
test('general routes are registered in the sole entrypoint', async () => {
  for (const path of ['/auth/google/login', '/auth/google/callback', '/v1/auth/me', '/v1/admin/session-check']) expect((await fetch('http://127.0.0.1:55440' + path)).status).toBe(400);
  expect((await fetch('http://127.0.0.1:55440/auth/logout', { method: 'POST' })).status).toBe(400);
});
test('canonical identity and roles; OAuth does not grant ADMIN; logout revokes copied cookie', async () => {
  const auth = createGeneralAuth(sql, env, google({ sub: 'client-sub', email: 'client@gmail.com', email_verified: true }));
  const flow = await login(auth), done = (await auth.handle(request(flow.path, { cookie: flow.cookie })))!;
  expect(done.status).toBe(302); expect(done.headers.get('location')).toBe(origin + '/');
  const cookie = session(done), me = (await auth.handle(request('/v1/auth/me', { cookie })))!;
  expect((await me.json()).user).toEqual({ id: clientId, email: 'client@gmail.com', displayName: null, roles: ['CLIENT'] });
  expect((await auth.handle(request('/v1/admin/session-check', { cookie })))!.status).toBe(403);
  expect((await sql.unsafe('SELECT role FROM ad507.user_roles WHERE user_id=$1::uuid', [clientId])).map(x => x.role)).toEqual(['CLIENT']);
  expect((await auth.handle(request('/auth/logout', { cookie, origin: 'https://evil.test' }, 'POST')))!.status).toBe(403);
  expect((await auth.handle(request('/auth/logout', { cookie, origin }, 'POST')))!.status).toBe(204);
  expect((await auth.handle(request('/v1/auth/me', { cookie })))!.status).toBe(401);
  expect(await sql.unsafe("SELECT google_sub FROM ad507.google_identities WHERE user_id=$1::uuid", [clientId])).toHaveLength(1);
});
test('existing canonical ADMIN role is read from PostgreSQL', async () => {
  const auth = createGeneralAuth(sql, env, google({ sub: 'admin-sub', email: 'admin@example.test', email_verified: true, hd: 'example.test' }));
  const flow = await login(auth), done = (await auth.handle(request(flow.path, { cookie: flow.cookie })))!;
  expect(done.status).toBe(302);
  const cookie = session(done);
  expect((await (await auth.handle(request('/v1/auth/me', { cookie })))!.json()).user.roles).toEqual(['ADMIN']);
  const admin = (await auth.handle(request('/v1/admin/session-check', { cookie })))!;
  expect(admin.status).toBe(200);
  expect(await admin.json()).toEqual({ ok: true, authorized: true, user: { id: adminId, email: 'admin@example.test', roles: ['ADMIN'] } });
  await sql.unsafe("UPDATE ad507.users SET status='DISABLED' WHERE id=$1::uuid", [adminId]);
  expect((await auth.handle(request('/v1/auth/me', { cookie })))!.status).toBe(401);
});
test('unknown/unverified/third-party/rebound identities fail without creating users', async () => {
  const before = (await sql.unsafe('SELECT count(*)::int AS n FROM ad507.users'))[0].n;
  for (const profile of [
    { sub: 'unknown-sub', email: 'missing@gmail.com', email_verified: true },
    { sub: 'bad-sub', email: 'client@gmail.com', email_verified: false },
    { sub: 'replacement-sub', email: 'client@gmail.com', email_verified: true },
    { sub: 'third-party-sub', email: 'admin@example.test', email_verified: true },
    { email: 'client@gmail.com', email_verified: true },
  ]) {
    const auth = createGeneralAuth(sql, env, google(profile)), flow = await login(auth);
    expect((await auth.handle(request(flow.path, { cookie: flow.cookie })))!.status).toBe(403);
  }
  expect((await sql.unsafe('SELECT count(*)::int AS n FROM ad507.users'))[0].n).toBe(before);
});
test('invalid, missing, expired, mismatched and replayed state fail; failures consume state', async () => {
  const auth = createGeneralAuth(sql, env, google({ sub: 'client-sub', email: 'client@gmail.com', email_verified: true }));
  expect((await auth.handle(request('/auth/google/callback?state=bad&code=test')))!.status).toBe(400);
  const flow = await login(auth);
  expect((await auth.handle(request(flow.path)))!.status).toBe(400);
  expect((await auth.handle(request(flow.path, { cookie: 'ad507_oauth_state=' + 'x'.repeat(43) })))!.status).toBe(400);
  expect((await auth.handle(request(flow.path, { cookie: flow.cookie })))!.status).toBe(302);
  expect((await auth.handle(request(flow.path, { cookie: flow.cookie })))!.status).toBe(400);
  const expired = await login(auth); await sql.unsafe("UPDATE ad507.oauth_transactions SET expires_at=now()-interval '1 second' WHERE consumed_at IS NULL");
  expect((await auth.handle(request(expired.path, { cookie: expired.cookie })))!.status).toBe(400);
  const failing = createGeneralAuth(sql, env, google({}, true)), failed = await login(failing);
  const error = (await failing.handle(request(failed.path, { cookie: failed.cookie })))!;
  expect(error.status).toBe(401); expect(error.headers.get('set-cookie')).toContain('Max-Age=0');
  expect((await failing.handle(request(failed.path, { cookie: failed.cookie })))!.status).toBe(400);
});
test('redirect override, invalid configured redirect, tampered session and CSRF rejected', async () => {
  const auth = createGeneralAuth(sql, env, google({}));
  expect((await auth.handle(request('/auth/google/login?redirect=https://evil.test')))?.status).toBe(400);
  for (const patch of [{ AD507_AUTH_SUCCESS_URL: 'https://evil.test/' }, { AD507_AUTH_SUCCESS_URL: '//evil.test' }, { AD507_GOOGLE_REDIRECT_URI: origin + '/wrong' }, { AD507_GOOGLE_REDIRECT_URI: 'http://insecure.test/auth/google/callback' }, { AD507_SESSION_SECRET: 'short' }]) expect(createGeneralAuth(sql, { ...env, ...patch }).configured).toBe(false);
  expect((await auth.handle(request('/v1/auth/me', { cookie: 'ad507_session=bad' })))!.status).toBe(401);
  expect((await auth.handle(request('/v1/auth/me', { cookie: 'ad507_session=%zz' })))!.status).toBe(401);
});
test('Railway TLS termination accepts the configured host and denies arbitrary hosts', async () => {
  const auth = createGeneralAuth(sql, env, google({}));
  expect((await auth.handle(new Request('http://ad507-core-production.up.railway.app/v1/auth/me', { headers: { 'x-forwarded-proto': 'https' } })))!.status).toBe(401);
  expect((await auth.handle(new Request('http://ad507-core-production.up.railway.app/v1/auth/me')))!.status).toBe(400);
  expect((await auth.handle(new Request('https://evil.test/v1/auth/me', { headers: { 'x-forwarded-proto': 'https' } })))!.status).toBe(400);
});
test.skipIf(process.env.AD507_TEST_PGLITE === '1')('atomic migration runner creates schema and ledger together, rejects repeat', async () => {
  await sql.unsafe('CREATE DATABASE ad507_migration_runner_test');
  const database = new URL(process.env.AD507_TEST_DATABASE_URL ?? `postgres://postgres:${password}@127.0.0.1:55439/postgres`);
  database.pathname = '/ad507_migration_runner_test';
  const isolated = postgres(database.toString(), { max: 1 });
  try {
    for (const file of ['0000_migration_ledger.sql', '0001_core_foundation.sql']) await isolated.unsafe(readFileSync(new URL('db/migrations/' + file, root), 'utf8'));
    await isolated.unsafe("INSERT INTO ad507.schema_migrations(version,checksum_sha256,description,applied_by) SELECT v,repeat('0',64),'isolated test fixture',current_user FROM unnest(ARRAY['0000','0001','0002','0003','0004']) v");
    const script = prepareMigration0005('a'.repeat(40)).split('\n').filter(line => !line.startsWith('\\')).join('\n');
    await isolated.unsafe(script);
    expect((await isolated.unsafe("SELECT version FROM ad507.schema_migrations WHERE version='0005'"))).toHaveLength(1);
    expect((await isolated.unsafe("SELECT to_regclass('ad507.auth_sessions') IS NOT NULL AS present"))[0].present).toBe(true);
    await expect(isolated.unsafe(script)).rejects.toThrow('0005_ALREADY_APPLIED');
    await isolated.unsafe('ROLLBACK');
    expect((await isolated.unsafe("SELECT count(*)::int AS n FROM ad507.schema_migrations WHERE version='0005'"))[0].n).toBe(1);
  } finally { await isolated.end(); }
});
