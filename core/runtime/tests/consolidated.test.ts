import { beforeAll, afterAll, test, expect } from 'bun:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import { createGeneralAuth } from '../general-auth';
import {applyReviewedNatalieCorrections} from '../legacy-corrections';
import { userPanelHtml } from '../user-panel';
import { prepareMigration0005 } from '../scripts/prepare-0005';

const root = new URL('../../../', import.meta.url);
const dir = mkdtempSync(join(tmpdir(), 'ad507-auth-test-'));
const password = crypto.randomUUID();
const pg = new EmbeddedPostgres({ databaseDir: join(dir, 'db'), user: 'postgres', password, port: 55439, persistent: false, createPostgresUser: true, onLog: () => {}, onError: () => {} });
let isolatedDatabase: string;
let runtimePort: number;
let sql: ReturnType<typeof postgres>, runtime: ReturnType<typeof Bun.spawn>;
const origin = 'https://ad507-core-production.up.railway.app';
const env = { AD507_GOOGLE_CLIENT_ID: 'test-client', AD507_GOOGLE_CLIENT_SECRET: crypto.randomUUID(), AD507_SESSION_SECRET: crypto.randomUUID() + crypto.randomUUID(), AD507_GOOGLE_REDIRECT_URI: origin + '/auth/google/callback', AD507_AUTH_SUCCESS_URL: '/', AD507_PUBLIC_BASE_URL: origin };
const clientId = '11111111-1111-4111-8111-111111111111', adminId = '22222222-2222-4222-8222-222222222222';

beforeAll(async () => {
  const external = process.env.AD507_TEST_DATABASE_URL;
  if (external && !['127.0.0.1', 'localhost'].includes(new URL(external).hostname)) throw new Error('TEST_DATABASE_MUST_BE_LOCAL');
  if (!external) { await pg.initialise(); await pg.start(); }
  const database = external ?? `postgres://postgres:${password}@127.0.0.1:55439/postgres`;
  isolatedDatabase = database;
  sql = postgres(database, { max: 1 });
  for (const file of ['0000_migration_ledger.sql', '0001_core_foundation.sql', '0002_plan_catalog.sql', '0003_plan_capabilities.sql', '0005_general_google_auth.sql']) await sql.unsafe(readFileSync(new URL('db/migrations/' + file, root), 'utf8'));
  await sql.unsafe(readFileSync(new URL('db/migrations/0005_general_google_auth.sql', root), 'utf8'));
  await sql.unsafe(readFileSync(new URL('../schema-proposals/landline.sql', import.meta.url), 'utf8'));
  await sql.unsafe(readFileSync(new URL('../schema-proposals/requests.sql', import.meta.url), 'utf8'));
  await sql.unsafe(readFileSync(new URL('../schema-proposals/countries.sql', import.meta.url), 'utf8'));
  await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1::uuid,'client@gmail.com'),($2::uuid,'admin@example.test')", [clientId, adminId]);
  await sql.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'CLIENT'),($2::uuid,'ADMIN')", [clientId, adminId]);
  runtimePort = await new Promise<number>((resolve, reject) => {
    const listener = createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const port = (listener.address() as { port: number }).port;
      listener.close(error => error ? reject(error) : resolve(port));
    });
  });
  runtime = Bun.spawn([process.execPath, 'server.ts'], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, ...env, PORT: String(runtimePort), DATABASE_URL: database, AD507_INTERNATIONAL_DOMAIN_VERIFIED:'true', AD507_RESIDENTIAL_PROVISIONING_SECRET: crypto.randomUUID() }, stdout: 'ignore', stderr: 'pipe' });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:'+runtimePort+'/health')).ok) return; } catch {}
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
  const expected = applyReviewedNatalieCorrections(snapshot).replace('Bun.serve({ hostname:', 'export function startLegacyCore(extension: (req: Request) => Promise<Response | null>) { if (process.env.AD507_INTERNATIONAL_DOMAIN_VERIFIED === "true") NATALIE_ALLOWED_ORIGINS.add("https://direcciones.lat"); return Bun.serve({ hostname:').replace('async fetch(req) { const startedAt', 'async fetch(req) { const added = await extension(req); if (added) return added; const startedAt').replace('}); audit("controlled_private_listener_ready"', '}); } audit("controlled_private_listener_ready"');
  expect(legacy).toBe(expected);
  const routes = [...snapshot.matchAll(/const (RESIDENTIAL_\w*ROUTE)\s*=\s*"([^"]+)"/g)];
  expect(routes.length).toBe(12);
  for (const [, name, path] of routes) { expect(legacy).toContain(path); expect(legacy).toContain('url.pathname === ' + name); }
  for (const route of ['SESSION_ROUTE', 'CONVERSATION_ROUTE', 'ROUTE', 'ANALYTICS_TRACK_ROUTE', 'ANALYTICS_EXCHANGE_ROUTE', 'ANALYTICS_SUMMARY_ROUTE']) expect(legacy).toContain('url.pathname ' + (route === 'ROUTE' ? '!==' : '===') + ' ' + route);
  expect(legacy).toContain('handlePublicAD507Page(req, url)');
  expect(legacy).toContain('req.method === "HEAD"');
});
test('real Bun entrypoint: health/readiness and real PostgreSQL', async () => {
  expect((await fetch('http://127.0.0.1:'+runtimePort+'/health')).status).toBe(200);
  const ready = await fetch('http://127.0.0.1:'+runtimePort+'/ready'); expect(ready.status).toBe(200);
  expect((await ready.json()).database).toBe(true);
  expect((await sql.unsafe('SELECT 1 AS connected'))[0].connected).toBe(1);
});
test('legacy POST routes remain dispatched with invalid credentials', async () => {
  const snapshot = readFileSync(new URL('../legacy.snapshot.txt', import.meta.url), 'utf8');
  const paths = [...snapshot.matchAll(/const RESIDENTIAL_\w*ROUTE\s*=\s*"([^"]+)"/g)].map(x => x[1]);
  paths.push('/internal/v1/natalie/controlled-session', '/internal/v1/natalie/controlled-query', '/internal/v1/analytics/track', '/internal/v1/analytics/access/exchange');
  for (const path of paths) {
    const res = await fetch('http://127.0.0.1:'+runtimePort + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).not.toBe(404); expect(res.status).toBeLessThan(500);
  }
  expect((await fetch('http://127.0.0.1:'+runtimePort+'/internal/v1/analytics/private/summary')).status).not.toBe(404);
});
test('general routes are registered in the sole entrypoint', async () => {
  for (const path of ['/auth/google/login', '/auth/google/callback', '/v1/auth/me', '/v1/admin/session-check']) expect((await fetch('http://127.0.0.1:'+runtimePort + path)).status).toBe(400);
  expect((await fetch('http://127.0.0.1:'+runtimePort+'/auth/logout', { method: 'POST' })).status).toBe(400);
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
test('verified Google users self-provision as CLIENT; unsafe or rebound identities still fail', async () => {
  const before = (await sql.unsafe('SELECT count(*)::int AS n FROM ad507.users'))[0].n;
  const newcomer = createGeneralAuth(sql, env, google({ sub: 'unknown-sub', email: 'missing@gmail.com', email_verified: true }));
  const newFlow = await login(newcomer), newDone = (await newcomer.handle(request(newFlow.path, { cookie: newFlow.cookie })))!;
  expect(newDone.status).toBe(302);
  const created = await sql.unsafe("SELECT u.id::text AS id,u.status,ur.role FROM ad507.users u JOIN ad507.user_roles ur ON ur.user_id=u.id WHERE lower(u.email)='missing@gmail.com'");
  expect(created).toHaveLength(1); expect(created[0].status).toBe('ACTIVE'); expect(created[0].role).toBe('CLIENT');
  expect(await sql.unsafe("SELECT google_sub FROM ad507.google_identities WHERE user_id=$1::uuid", [created[0].id])).toHaveLength(1);
  for (const profile of [
    { sub: 'bad-sub', email: 'client@gmail.com', email_verified: false },
    { sub: 'replacement-sub', email: 'client@gmail.com', email_verified: true },
    { sub: 'third-party-sub', email: 'admin@example.test', email_verified: true },
    { email: 'client@gmail.com', email_verified: true },
  ]) {
    const auth = createGeneralAuth(sql, env, google(profile)), flow = await login(auth);
    expect((await auth.handle(request(flow.path, { cookie: flow.cookie })))!.status).toBe(403);
  }
  expect((await sql.unsafe('SELECT count(*)::int AS n FROM ad507.users'))[0].n).toBe(before + 1);
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
  const isolated = postgres(database.toString(), { max: 1, connect_timeout: 5, connection: { statement_timeout: '10000' } });
  try {
    for (const file of ['0000_migration_ledger.sql', '0001_core_foundation.sql']) await isolated.unsafe(readFileSync(new URL('db/migrations/' + file, root), 'utf8'));
    await isolated.unsafe("INSERT INTO ad507.schema_migrations(version,checksum_sha256,description,applied_by) SELECT v,repeat('0',64),'isolated test fixture',current_user FROM unnest(ARRAY['0000','0001','0002','0003','0004']) v");
    const script = prepareMigration0005('a'.repeat(40)).split('\n').filter(line => !line.startsWith('\\')).join('\n');
    await isolated.unsafe(script);
    expect((await isolated.unsafe("SELECT version FROM ad507.schema_migrations WHERE version='0005'"))).toHaveLength(1);
    expect((await isolated.unsafe("SELECT to_regclass('ad507.auth_sessions') IS NOT NULL AS present"))[0].present).toBe(true);
    let repeatedError = '';
    try { await isolated.unsafe(script); } catch (error) { repeatedError = String(error); }
    expect(repeatedError).toContain('0005_ALREADY_APPLIED');
    await isolated.unsafe('ROLLBACK');
    expect((await isolated.unsafe("SELECT count(*)::int AS n FROM ad507.schema_migrations WHERE version='0005'"))[0].n).toBe(1);
  } finally { await isolated.end({ timeout: 1 }); }
}, 30000);

async function runtimeGet(path: string, cookie?: string) {
  return fetch('http://127.0.0.1:'+runtimePort + path, { headers: { host: 'ad507-core-production.up.railway.app', 'x-forwarded-proto': 'https', ...(cookie ? { cookie } : {}) } });
}
async function fixtureSession(id: string, email: string, sub: string) {
  await sql.unsafe("UPDATE ad507.users SET status='ACTIVE' WHERE id=$1::uuid", [id]);
  const auth = createGeneralAuth(sql, env, google({ sub, email, email_verified: true }));
  const flow = await login(auth);
  return session((await auth.handle(request(flow.path, { cookie: flow.cookie })))!);
}
test('all six ADMIN views use real PostgreSQL and deny anonymous and CLIENT sessions', async () => {
  const admin = await fixtureSession(adminId, 'admin@example.test', 'admin-sub');
  const client = await fixtureSession(clientId, 'client@gmail.com', 'client-sub');
  await sql.unsafe("INSERT INTO ad507.addresses(code,address_type,status,name) VALUES('AD507-TESTPLACE','PLACE','PENDING_REVIEW','Place fixture'),('AD507-TESTBUSINESS','BUSINESS','DRAFT','Business fixture')");
  for (const key of ['addresses','requests','users','places','plans','stats']) {
    const path = '/v1/admin/' + key;
    expect((await runtimeGet(path)).status).toBe(401);
    expect((await runtimeGet(path, client)).status).toBe(403);
    const res = await runtimeGet(path, admin);
    expect(res.status).toBe(200); expect(res.headers.get('cache-control')).toBe('no-store');
    const data = await res.json(); expect(data.ok).toBe(true);
    if (key === 'requests') expect(data.requests.map((a: any) => a.code)).toEqual(['AD507-TESTPLACE']);
    if (key === 'places') expect(data.places.map((a: any) => a.addressType)).toEqual(['PLACE']);
    if (key === 'users') expect(data.users.find((u: any) => u.id === adminId).roles).toEqual(['ADMIN']);
    if (key === 'plans') { expect(data.plans).toHaveLength(5); expect(data.plans.find((p: any) => p.code === 'BUSINESS_FREE').capabilities.maps).toBe(true); }
    if (key === 'stats') { expect(data.totals.addresses).toBe(2); expect(data.totals.requests).toBe(1); expect(data.totals.places).toBe(1); expect(data.totals.plans).toBe(5); expect(data.totals.paidOrders).toBe(0); }
  }
  const html = await (await runtimeGet('/admin')).text();
  for (const key of ['addresses','requests','users','places','plans','stats']) expect(html).toContain('id="' + key + 'Tile"');
});

test('user panel isolates canonical ownership and orders without internal capabilities; logout/reentry uses real sessions', async () => {
  const otherId = '33333333-3333-4333-8333-333333333333';
  await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1::uuid,'other@example.test')", [otherId]);
  await sql.unsafe("INSERT INTO ad507.address_ownership(address_id,user_id) SELECT id,$1::uuid FROM ad507.addresses WHERE code='AD507-TESTPLACE'", [clientId]);
  await sql.unsafe("INSERT INTO ad507.address_ownership(address_id,user_id) SELECT id,$1::uuid FROM ad507.addresses WHERE code='AD507-TESTBUSINESS'", [otherId]);
  await sql.unsafe("UPDATE ad507.addresses SET plan_id=(SELECT id FROM ad507.plans WHERE code='BUSINESS_FREE') WHERE code='AD507-TESTPLACE'");
  await sql.unsafe("INSERT INTO ad507.orders(user_id,amount_cents) VALUES($1::uuid,100),($2::uuid,900)", [clientId, otherId]);
  const client = await fixtureSession(clientId, 'client@gmail.com', 'client-sub');
  expect((await runtimeGet('/v1/user/panel')).status).toBe(401);
  const res = await runtimeGet('/v1/user/panel?user_id=' + otherId, client);
  expect(res.status).toBe(200); expect(res.headers.get('cache-control')).toBe('no-store');
  const data = await res.json();
  expect(data.user.email).toBe('client@gmail.com');
  expect(data.user).not.toHaveProperty('id');
  expect(data.user).not.toHaveProperty('roles');
  expect(data.addresses.map((a: any) => a.code)).toEqual(['AD507-TESTPLACE']);
  expect(data.addresses[0]).not.toHaveProperty('capabilities');
  expect(data.addresses[0]).not.toHaveProperty('ownershipRole');
  expect(data.orders.map((o: any) => o.amountCents)).toEqual([100]);
  expect(data.actions).toEqual({ prepareRequest: true, submitRequest: false, checkout: false });
  const admin = await fixtureSession(adminId, 'admin@example.test', 'admin-sub');
  expect((await (await runtimeGet('/v1/user/panel', admin)).json()).addresses).toHaveLength(0);
  const panel = await runtimeGet('/panel'); expect(panel.status).toBe(200);
  expect(panel.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  expect(await panel.text()).toContain('id="send" type="button" disabled>Enviar solicitud');
  const redirect = await fetch('http://127.0.0.1:'+runtimePort+'/', { redirect: 'manual', headers: { host: 'ad507-core-production.up.railway.app', 'x-forwarded-proto': 'https', cookie: client } });
  expect(redirect.status).toBe(302); expect(redirect.headers.get('location')).toBe('/panel');
  const logout = await fetch('http://127.0.0.1:'+runtimePort+'/auth/logout', { method: 'POST', headers: { host: 'ad507-core-production.up.railway.app', 'x-forwarded-proto': 'https', origin, cookie: client } });
  expect(logout.status).toBe(204);
  expect((await runtimeGet('/v1/user/panel', client)).status).toBe(401);
  const renewed = await fixtureSession(clientId, 'client@gmail.com', 'client-sub');
  expect((await runtimeGet('/v1/user/panel', renewed)).status).toBe(200);
  expect((await runtimeGet('/v1/user/panel', client)).status).toBe(401);
});

test('ADMIN and user panel client scripts parse; request submission and payment remain disabled', async () => {
  const adminHtml = await (await runtimeGet('/admin')).text();
  for (const html of [adminHtml, userPanelHtml]) {
    const script = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1];
    expect(() => new Function(script)).not.toThrow();
  }
  expect(userPanelHtml).toContain('id="send" type="button" disabled>Enviar solicitud');
  expect(userPanelHtml).toContain('El envío y el pago aún no están habilitados.');
  expect(userPanelHtml).toContain('Continuar al pago · Próximamente');
});


test('pre-migration panel rejects every write method and preserves database counts', async () => {
  const client = await fixtureSession(clientId, 'client@gmail.com', 'client-sub');
  const count = async () => (await sql.unsafe('SELECT (SELECT count(*) FROM ad507.addresses)::int AS addresses,(SELECT count(*) FROM ad507.address_ownership)::int AS ownership,(SELECT count(*) FROM ad507.orders)::int AS orders,(SELECT count(*) FROM ad507.audit_log)::int AS audit'))[0];
  const before = await count();
  for (const method of ['POST','PUT','PATCH','DELETE']) {
    const res = await fetch('http://127.0.0.1:'+runtimePort+'/v1/user/requests', { method, headers: { cookie: client, origin, 'content-type': 'application/json' }, body: JSON.stringify({ addressType: 'RESIDENTIAL', planCode: 'RESIDENTIAL', name: 'Must never exist', checkout: true, owner: true }) });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('USER_PANEL_SUBMISSION_NOT_ENABLED');
    expect((await fetch('http://127.0.0.1:'+runtimePort+'/v1/user/panel', {method, headers:{cookie:client}})).status).toBe(405);
  }
  expect(await count()).toEqual(before);
  const panel = await runtimeGet('/panel');
  const csp = panel.headers.get('content-security-policy')!;
  expect(csp).toContain("form-action 'none'");
  expect(csp).toMatch(/script-src 'nonce-[a-f0-9]+'/);
  expect(csp).not.toContain("script-src 'unsafe-inline'");
  const html = await panel.text();
  expect(html).toMatch(/<script nonce="[a-f0-9]+">/);
  expect(html).not.toContain('Administración');
});

test('panel sessions reject a wrong host, duplicate cookie and cross-site read', async () => {
  const client = await fixtureSession(clientId, 'client@gmail.com', 'client-sub');
  const auth = createGeneralAuth(sql, env, google({}));
  expect(await auth.currentUser(new Request('https://evil.test/v1/user/panel',{headers:{cookie:client}}))).toBeNull();
  expect((await runtimeGet('/v1/user/panel',client+'; '+client)).status).toBe(401);
  const res = await fetch('http://127.0.0.1:'+runtimePort+'/v1/user/panel',{headers:{host:'ad507-core-production.up.railway.app','x-forwarded-proto':'https',cookie:client,origin:'https://evil.test','sec-fetch-site':'cross-site'}});
  expect(res.status).toBe(403);
});

test('landline schema proposal persists both contacts without backfill in the isolated fixture only', async () => {
  await sql.unsafe(readFileSync(new URL('../schema-proposals/landline.sql', import.meta.url), 'utf8'));
  expect((await sql.unsafe('SELECT count(*)::int AS n FROM ad507.addresses WHERE landline_phone IS NOT NULL'))[0].n).toBe(0);
  await sql.unsafe("UPDATE ad507.addresses SET phone=$1,landline_phone=$2 WHERE code='AD507-TESTBUSINESS'", ['+50769991234','+5079981234']);
  const row = (await sql.unsafe("SELECT phone,landline_phone FROM ad507.addresses WHERE code='AD507-TESTBUSINESS'"))[0];
  expect(row).toEqual({ phone:'+50769991234',landline_phone:'+5079981234' });
  // Existing Place drafts preserve formatted local numbers; the proposal must accept that contract.
  await sql.unsafe("UPDATE ad507.addresses SET landline_phone=$1 WHERE code='AD507-TESTBUSINESS'", ['998-1234']);
  expect((await sql.unsafe("SELECT phone,landline_phone FROM ad507.addresses WHERE code='AD507-TESTBUSINESS'"))[0]).toEqual({phone:'+50769991234',landline_phone:'998-1234'});
  await sql.unsafe("UPDATE ad507.addresses SET landline_phone=$1 WHERE code='AD507-TESTBUSINESS'", ['+5079981234']);
  let rejected = false;
  try { await sql.unsafe("UPDATE ad507.addresses SET landline_phone='javascript:evil' WHERE code='AD507-TESTBUSINESS'"); } catch { rejected = true; }
  expect(rejected).toBe(true);
  expect((await sql.unsafe("SELECT landline_phone FROM ad507.addresses WHERE code='AD507-TESTBUSINESS'"))[0].landline_phone).toBe('+5079981234');
});

test('authenticated panel reads are rate limited without enabling writes', async () => {
  const client = await fixtureSession(clientId, 'client@gmail.com', 'client-sub');
  let limited: Response | null = null;
  for(let i=0;i<61;i++) { const res = await runtimeGet('/v1/user/panel',client); if(res.status===429) {limited=res;break;} expect(res.status).toBe(200); }
  expect(limited?.status).toBe(429);
  expect(limited?.headers.get('retry-after')).toBe('60');
});

test('R2 scope reuses canonical roles, ownership and linked media with no legacy access', async () => {
  const { createMediaAuthorizer } = await import('../r2-media-authorization');
  const owner = crypto.randomUUID(), stranger = crypto.randomUUID(), reviewer = crypto.randomUUID(), addressId = crypto.randomUUID();
  await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1::uuid,'media-owner@example.test'),($2::uuid,'media-stranger@example.test'),($3::uuid,'media-reviewer@example.test')",[owner,stranger,reviewer]);
  await sql.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'CLIENT'),($2::uuid,'CLIENT'),($3::uuid,'ADMIN')",[owner,stranger,reviewer]);
  await sql.unsafe("INSERT INTO ad507.addresses(id,code,address_type,status,name,source) VALUES($1::uuid,'AD507-MEDIATEST','BUSINESS','DRAFT','Isolated fixture','USER_REQUEST')",[addressId]);
  await sql.unsafe("INSERT INTO ad507.address_ownership(address_id,user_id) VALUES($1::uuid,$2::uuid)",[addressId,owner]);
  const key=`addresses/${addressId}/logo/${'a'.repeat(64)}.webp`;
  await sql.unsafe("INSERT INTO ad507.address_media(address_id,media_type,storage_key) VALUES($1::uuid,'LOGO',$2)",[addressId,key]);
  const ownerAuth = createMediaAuthorizer(sql,owner), strangerAuth=createMediaAuthorizer(sql,stranger), adminAuth=createMediaAuthorizer(sql,reviewer);
  const scope={ownerId:owner,addressId,role:'logo' as const,storageKey:key};
  expect(await ownerAuth({...scope,action:'upload'})).toBe(true);
  expect(await ownerAuth({...scope,action:'read'})).toBe(true);
  expect(await ownerAuth({...scope,action:'delete'})).toBe(true);
  expect(await strangerAuth({...scope,ownerId:stranger,action:'read'})).toBe(false);
  expect(await strangerAuth({...scope,action:'upload'})).toBe(false);
  expect(await adminAuth({...scope,ownerId:reviewer,action:'read'})).toBe(true);
  expect(await adminAuth({...scope,ownerId:reviewer,action:'delete'})).toBe(false);
  expect(await ownerAuth({...scope,storageKey:key.replace('/logo/','/photo/'),action:'read'})).toBe(false);
  await sql.unsafe("UPDATE ad507.addresses SET status='PENDING_REVIEW' WHERE id=$1::uuid",[addressId]);
  expect(await ownerAuth({...scope,action:'upload'})).toBe(false);
  expect(await ownerAuth({...scope,action:'delete'})).toBe(false);
  expect(await adminAuth({...scope,ownerId:reviewer,action:'read'})).toBe(true);
  await sql.unsafe("UPDATE ad507.users SET status='BLOCKED' WHERE id=$1::uuid",[owner]);
  expect(await ownerAuth({...scope,action:'read'})).toBe(false);
  await sql.unsafe("UPDATE ad507.addresses SET source='LEGACY' WHERE id=$1::uuid",[addressId]);
  expect(await adminAuth({...scope,ownerId:reviewer,action:'read'})).toBe(false);
  await sql.unsafe("UPDATE ad507.addresses SET source='USER_REQUEST',address_type='RESIDENTIAL' WHERE id=$1::uuid",[addressId]);
  expect(await adminAuth({...scope,ownerId:reviewer,action:'read'})).toBe(false);
});

test('media associations commit before PUT; concurrent retries, quotas and timeout recovery', async () => {
  const { createRequestMediaStorage } = await import('../request-media');
  const sharp = (await import('sharp')).default;
  const owner=crypto.randomUUID(), addressId=crypto.randomUUID();
  await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1::uuid,'media-recovery@example.test')",[owner]);
  await sql.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'CLIENT')",[owner]);
  await sql.unsafe("INSERT INTO ad507.addresses(id,code,address_type,status,name,source,plan_id) SELECT $1::uuid,'AD507-MEDIARECOVERY','BUSINESS','DRAFT','Isolated fixture','USER_REQUEST',id FROM ad507.plans WHERE code='BUSINESS_FREE'",[addressId]);
  await sql.unsafe("INSERT INTO ad507.address_ownership(address_id,user_id) VALUES($1::uuid,$2::uuid)",[addressId,owner]);
  const db=postgres(isolatedDatabase,{max:4});
  let calls=0, fail=true;
  const settings={accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'test',secretAccessKey:'test',configurationVerified:true as const};
  const storage=createRequestMediaStorage(db,owner,settings,(async (url,init)=>{
    calls++;
    const key=new URL(String(url)).pathname.replace('/direcciones507-media/','');
    expect((await sql.unsafe('SELECT storage_key FROM ad507.address_media WHERE address_id=$1::uuid AND storage_key=$2',[addressId,key])).length).toBe(1);
    expect(init!.method).toBe('PUT');
    if(fail) throw new Error('ambiguous timeout with secret upstream details');
    return new Response(null,{status:200});
  }) as typeof fetch);
  const bytes=await sharp({create:{width:8,height:8,channels:3,background:'red'}}).png().toBuffer();
  const input={ownerId:owner,addressId,role:'logo' as const,bytes,mime:'image/png'};
  try {
    await expect(storage.storeOptimized(input)).rejects.toThrow('R2_REQUEST_FAILED');
    expect((await sql.unsafe('SELECT storage_key FROM ad507.address_media WHERE address_id=$1::uuid',[addressId])).length).toBe(1);
    fail=false;
    const repeated=await Promise.all(Array.from({length:6},()=>storage.storeOptimized(input)));
    expect(new Set(repeated.map(r=>r.storageKey)).size).toBe(1);
    expect((await sql.unsafe('SELECT count(*)::int AS n FROM ad507.address_media WHERE address_id=$1::uuid',[addressId]))[0].n).toBe(1);
    expect((await sql.unsafe("SELECT count(*)::int AS n FROM ad507.audit_log WHERE actor_user_id=$1::uuid AND action='MEDIA_UPLOAD_INTENT'",[owner]))[0].n).toBe(1);
    const different=await sharp({create:{width:8,height:8,channels:3,background:'blue'}}).png().toBuffer();
    await expect(storage.storeOptimized({...input,bytes:different})).rejects.toThrow('MEDIA_LIMIT_EXCEEDED');
    expect(calls).toBe(7);
    await sql.unsafe("UPDATE ad507.addresses SET status='PENDING_REVIEW' WHERE id=$1::uuid",[addressId]);
    await expect(storage.storeOptimized(input)).rejects.toThrow('MEDIA_FORBIDDEN');
    expect(calls).toBe(7);
  } finally { await db.end(); }
});

test('request lifecycle persists all five products, deduplicates and separates moderation from publication', async () => {
  const {createRequestRepository}=await import('../request-repository');
  const sharp=(await import('sharp')).default;
  const owner=crypto.randomUUID(), reviewer=crypto.randomUUID(), outsider=crypto.randomUUID();
  for(const [id,email,role]of [[owner,'request-owner@example.test','CLIENT'],[reviewer,'request-admin@example.test','ADMIN'],[outsider,'request-outsider@example.test','CLIENT']]){await sql.unsafe('INSERT INTO ad507.users(id,email) VALUES($1::uuid,$2)',[id,email]);await sql.unsafe('INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,$2)',[id,role]);}
  const settings={accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'test',secretAccessKey:'test',configurationVerified:true as const};
  let failUploads=false;
  const repo=createRequestRepository(sql,{r2:settings,fetch:(async()=>{if(failUploads)throw Error('private upstream detail');return new Response(null,{status:200});}) as typeof fetch});
  const png=await sharp({create:{width:12,height:12,channels:3,background:'red'}}).png().toBuffer();
  const logo={role:'logo' as const,bytes:png,mime:'image/png'},photo={...logo,role:'photo' as const};
  const base={type:'BUSINESS',plan:'BUSINESS_FREE',name:'Full request',reference:'Near park',description:'',latitude:8.1,longitude:-80.9,phone:'61234567',landlinePhone:'9981234',email:'customer@example.test',hours:'8 a 5'};
  const products=[{type:'RESIDENTIAL',plan:'RESIDENTIAL',files:[]},{type:'PLACE',plan:'PLACE',files:[photo]},{type:'BUSINESS',plan:'BUSINESS_FREE',files:[logo]},{type:'BUSINESS',plan:'BUSINESS_PREMIUM',files:[logo]},{type:'BUSINESS',plan:'BUSINESS_PREMIUM_PRO',files:[logo,photo]}];
  for(const [i,p]of products.entries()){
    const raw={...base,type:p.type,plan:p.plan,name:base.name+i,...(p.plan==='BUSINESS_PREMIUM_PRO'?{commercialDescription:'Commercial text',namedCode:'Test name',postalCode:'0901',instagram:'https://www.instagram.com/test/'}:{})};
    const key='request-key-'+String(i).padStart(20,'0'),created=await repo.submit(owner,key,raw,p.files);
    expect(created.status).toBe('PENDING_REVIEW');expect(created.code).toBeNull();
    expect((await repo.submit(owner,key,raw,p.files)).id).toBe(created.id);
    expect((await repo.submit(owner,'different-'+key,raw,p.files)).id).toBe(created.id);
    await expect(repo.submit(owner,key,{...raw,name:'different'},p.files)).rejects.toThrow('IDEMPOTENCY_CONFLICT');
    const read=await repo.read(owner,created.id);expect(read.name).toBe(raw.name);expect(read.phone).toBe('+50761234567');expect(read.landlinePhone).toBe('+5079981234');expect(read.extras.email).toBe('customer@example.test');expect(read.media.every(m=>m.status==='READY')).toBe(true);
    expect(read.socials).toEqual(p.plan==='BUSINESS_PREMIUM_PRO'?[{platform:'instagram',url:'https://www.instagram.com/test/'}]:[]);
    expect(JSON.stringify(read)).not.toContain('request_key_hash');
    await expect(repo.read(outsider,created.id)).rejects.toThrow('REQUEST_NOT_FOUND');
    await expect(repo.review(owner,created.id,'APPROVED')).rejects.toThrow('FORBIDDEN');
    expect((await repo.review(reviewer,created.id,'APPROVED')).decision).toBe('APPROVED');
    expect((await repo.review(reviewer,created.id,'APPROVED')).decision).toBe('APPROVED');
    await expect(repo.review(reviewer,created.id,'REJECTED')).rejects.toThrow('INVALID_STATE_TRANSITION');
    await expect(repo.publish(reviewer,created.id)).rejects.toThrow('CANONICAL_PUBLICATION_NOT_READY');
    expect((await repo.read(reviewer,created.id)).status).toBe('PENDING_REVIEW');
  }
  expect((await sql.unsafe("SELECT count(*)::int AS n FROM ad507.audit_log WHERE actor_user_id=$1::uuid AND action='REQUEST_CREATED'",[owner]))[0].n).toBe(5);
  const rejected=await repo.submit(owner,'reject-000000000000000000',{...base,name:'Rejected'},[logo]);
  expect((await repo.review(reviewer,rejected.id,'REJECTED')).status).toBe('ARCHIVED');
  expect((await repo.review(reviewer,rejected.id,'REJECTED')).status).toBe('ARCHIVED');
  await expect(repo.review(reviewer,rejected.id,'APPROVED')).rejects.toThrow('INVALID_STATE_TRANSITION');
  failUploads=true;
  const recovering=await repo.submit(owner,'recover-00000000000000000',{...base,name:'Recover'},[logo]);
  expect(recovering.status).toBe('DRAFT');expect(recovering.error).toBe('MEDIA_UPLOAD_RETRY_REQUIRED');
  expect((await repo.read(owner,recovering.id)).media[0].status).toBe('PENDING');
  await expect(repo.review(reviewer,recovering.id,'APPROVED')).rejects.toThrow('INVALID_STATE_TRANSITION');
  failUploads=false;
  expect((await repo.submit(owner,'recover-00000000000000000',{...base,name:'Recover'},[logo])).status).toBe('PENDING_REVIEW');
  expect((await repo.read(owner,recovering.id)).media).toHaveLength(1);
  const before=(await sql.unsafe("SELECT count(*)::int AS n FROM ad507.addresses WHERE source='USER_REQUEST'"))[0].n;
  await expect(repo.submit(owner,'invalid-00000000000000000',base,[{...logo,bytes:png.subarray(0,12)}])).rejects.toThrow('INVALID_IMAGE');
  expect((await sql.unsafe("SELECT count(*)::int AS n FROM ad507.addresses WHERE source='USER_REQUEST'"))[0].n).toBe(before);
  await expect(repo.review(reviewer,(await sql.unsafe("SELECT id::text FROM ad507.addresses WHERE code='AD507-TESTBUSINESS'"))[0].id,'APPROVED')).rejects.toThrow('REQUEST_NOT_FOUND');
});

test('native request concurrency and canonical-provider recovery never allocate independently', async () => {
  const {createRequestRepository}=await import('../request-repository');
  const owner=(await sql.unsafe("SELECT id::text FROM ad507.users WHERE email='request-owner@example.test'"))[0].id,reviewer=(await sql.unsafe("SELECT id::text FROM ad507.users WHERE email='request-admin@example.test'"))[0].id;
  const db=postgres(isolatedDatabase,{max:8});
  const reserved=new Map<string,string>(),published=new Map<string,string>();let reserveCalls=0,publishCalls=0,fail=true;
  const canonical={historicalRegistryVerified:true as const,reserve:async({id}:{id:string})=>{reserveCalls++;if(!reserved.has(id))reserved.set(id,'AD507-ISOLATED'+String(reserved.size+1));return reserved.get(id)!;},publish:async({id}:{id:string})=>{publishCalls++;if(fail)throw Error('upstream failure');if(!published.has(id))published.set(id,'isolated-receipt-'+id);return {confirmed:true as const,receipt:published.get(id)!};}};
  const repo=createRequestRepository(db,{r2:null,canonical}),raw={type:'RESIDENTIAL',name:'Concurrent fixture',reference:'Park',latitude:8,longitude:-80};
  try{
    const attempts=await Promise.all(Array.from({length:8},(_,i)=>repo.submit(owner,'parallel-key-'+String(i).padStart(16,'0'),raw,[])));
    expect(new Set(attempts.map(r=>r.id)).size).toBe(1);expect(attempts.every(r=>r.status==='PENDING_REVIEW')).toBe(true);
    const id=attempts[0].id;await expect(repo.publish(reviewer,id)).rejects.toThrow('APPROVAL_REQUIRED');expect(reserveCalls).toBe(0);
    await repo.review(reviewer,id,'APPROVED');await expect(repo.publish(reviewer,id)).rejects.toThrow('upstream failure');
    expect((await repo.read(owner,id)).status).toBe('PENDING_REVIEW');expect((await repo.read(owner,id)).code).toBe('AD507-ISOLATED1');
    fail=false;const results=await Promise.all(Array.from({length:5},()=>repo.publish(reviewer,id)));
    expect(results.every(r=>r.status==='ACTIVE')).toBe(true);expect(reserveCalls).toBe(1);expect(publishCalls).toBe(2);expect(published.size).toBe(1);
    expect((await sql.unsafe("SELECT count(*)::int AS n FROM ad507.audit_log WHERE entity_id=$1 AND action='REQUEST_PUBLISHED'",[id]))[0].n).toBe(1);
    const collision=await repo.submit(owner,'collision-0000000000000000',{...raw,name:'Collision'},[]);await repo.review(reviewer,collision.id,'APPROVED');
    const bad=createRequestRepository(db,{r2:null,canonical:{...canonical,reserve:async()=> 'AD507-TESTBUSINESS'}});
    await expect(bad.publish(reviewer,collision.id)).rejects.toThrow();expect((await repo.read(owner,collision.id)).code).toBeNull();expect(publishCalls).toBe(2);
    await expect(createRequestRepository(db,{r2:null}).publish(reviewer,collision.id)).rejects.toThrow('CANONICAL_PUBLICATION_NOT_READY');
  }finally{await db.end();}
});

test('request routes default closed and development context validates authentication, CSRF and multipart', async () => {
  const {handleRequestRoutes}=await import('../request-routes');const {createRequestRepository}=await import('../request-repository');
  const owner=(await sql.unsafe("SELECT id::text FROM ad507.users WHERE email='request-owner@example.test'"))[0].id;
  const repository=createRequestRepository(sql,{r2:null});let user:any={id:owner,roles:['CLIENT']};
  const context={enabled:true,sql,auth:{currentUser:async()=>user},repository,r2:null};
  const req=(originHeader:string=origin)=>{const body=new FormData();body.append('payload',JSON.stringify({type:'RESIDENTIAL',name:'Multipart fixture',reference:'Park',latitude:8,longitude:-80}));return new Request(origin+'/v1/user/requests',{method:'POST',headers:{origin:originHeader,'idempotency-key':'multipart-0000000000000000'},body});};
  expect((await handleRequestRoutes(req(),{...context,enabled:false}))!.status).toBe(503);
  expect((await handleRequestRoutes(req('https://evil.test'),context))!.status).toBe(403);
  user=null;expect((await handleRequestRoutes(req(),context))!.status).toBe(401);
  user={id:owner,roles:['OPERATOR']};expect((await handleRequestRoutes(req(),context))!.status).toBe(403);
  user={id:owner,roles:['CLIENT']};const response=(await handleRequestRoutes(req(),context))!;expect(response.status).toBe(200);expect((await response.json()).request.status).toBe('PENDING_REVIEW');
  const forbidden=new Request(origin+'/v1/admin/requests/'+crypto.randomUUID()+'/approve',{method:'POST',headers:{origin}});expect((await handleRequestRoutes(forbidden,context))!.status).toBe(403);
  expect((await runtimeGet('/v1/user/requests')).status).toBe(503);
});

test('read-only preflight inventories canonical schema and repeated proposals preserve existing codes',async()=>{
  const {inspectCanonicalSchema}=await import('../scripts/integration-preflight');
  const before=await sql.unsafe("SELECT id::text,code,source FROM ad507.addresses WHERE source<>'USER_REQUEST' ORDER BY id");
  const report=await inspectCanonicalSchema(sql);
  expect(report.readOnly).toBe(true);expect(report.missingTables).toEqual([]);expect(report.missingRequestColumns).toEqual([]);
  expect(report.schemaFingerprint).toMatch(/^[a-f0-9]{64}$/);expect(report.allocationVerified).toBe(false);expect(report.publicationVerified).toBe(false);
  expect(report.constraints.some(c=>c.name==='addresses_code_key'&&c.type==='u')).toBe(true);
  expect(JSON.stringify(report)).not.toContain('request-owner@example.test');
  await sql.unsafe(readFileSync(new URL('../schema-proposals/landline.sql',import.meta.url),'utf8'));
  await sql.unsafe(readFileSync(new URL('../schema-proposals/requests.sql',import.meta.url),'utf8'));
  expect(await sql.unsafe("SELECT id::text,code,source FROM ad507.addresses WHERE source<>'USER_REQUEST' ORDER BY id")).toEqual(before);
  const connection=await sql.reserve();
  try{
    await connection.unsafe('BEGIN');
    await connection.unsafe('ALTER TABLE ad507.address_media ALTER COLUMN upload_status TYPE varchar(20)');
    const collision=async()=>{await connection.unsafe(readFileSync(new URL('../schema-proposals/requests.sql',import.meta.url),'utf8'));};
    await expect(collision()).rejects.toThrow('REQUEST_COLUMN_COLLISION');
  }finally{await connection.unsafe('ROLLBACK');connection.release();}
  expect((await sql.unsafe("SELECT data_type FROM information_schema.columns WHERE table_schema='ad507' AND table_name='address_media' AND column_name='upload_status'"))[0].data_type).toBe('text');
  // Explicit reserved connection keeps the intentionally aborted test transaction
  // separate from the shared pool and releases it before subsequent fixture reads.
  const readOnly=await sql.reserve();
  try{
    await readOnly.unsafe('BEGIN READ ONLY');
    const forbidden=async()=>{await readOnly.unsafe("UPDATE ad507.addresses SET name='forbidden' WHERE false");};
    await expect(forbidden()).rejects.toThrow();
  }finally{await readOnly.unsafe('ROLLBACK');readOnly.release();}
});

test('ADMIN creates without client identity; transfer and reversal only change ownership and audit',async()=>{
  const {createRequestRepository}=await import('../request-repository');
  const {createNewAddressPublication,newPublicAddress,renderNewPublicAddress}=await import('../new-address-publication');
  const sharp=(await import('sharp')).default;
  const db=postgres(isolatedDatabase,{max:8});
  const settings={accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'test',secretAccessKey:'test',configurationVerified:true as const};
  const http=(async(url:any)=>String(url).includes('action=list')?Response.json({ok:true,codes:[{codigo:'AD507-0038'}]}):new Response(null,{status:200})) as typeof fetch;
  const repo=createRequestRepository(db,{r2:settings,fetch:http,canonical:createNewAddressPublication(db,{namespaceExclusive:true,productNamespaceExclusive:true,fetch:http})});
  const file={role:'logo' as const,mime:'image/png',bytes:await sharp({create:{width:12,height:12,channels:3,background:'green'}}).png().toBuffer()};
  const raw={type:'BUSINESS',plan:'BUSINESS_FREE',name:'ADMIN temporary address',reference:'Near park',latitude:8.1,longitude:-80.9};
  try{
    const created=await repo.createAdmin(adminId,'admin-create-0000000000001',raw,[file]);
    expect(created.status).toBe('PENDING_REVIEW');
    expect((await repo.read(adminId,created.id)).ownerId).toBe(adminId);
    expect((await repo.createAdmin(adminId,'admin-create-0000000000001',raw,[file])).id).toBe(created.id);
    await expect(repo.createAdmin(clientId,'admin-create-0000000000002',raw,[file])).rejects.toThrow('FORBIDDEN');
    await expect(repo.publish(adminId,created.id)).rejects.toThrow('APPROVAL_REQUIRED');
    await repo.review(adminId,created.id,'APPROVED');
    const results=await Promise.all(Array.from({length:4},()=>repo.publish(adminId,created.id)));
    expect(new Set(results.map(r=>r.code)).size).toBe(1);
    expect(results.every(r=>r.status==='ACTIVE')).toBe(true);
    expect(results[0].code).toMatch(/^AD507-[0-9]{8}$/);
    const pub=await newPublicAddress(db,results[0].code,origin);expect(pub?.name).toBe(raw.name);
    expect(JSON.stringify(pub)).not.toContain('storageKey');expect(JSON.stringify(pub)).not.toContain('createdByAdmin');
    const html=renderNewPublicAddress(pub!);expect(html).toContain(raw.name);expect(html).toContain('const data = {');
    for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
    const before=await db.unsafe('SELECT to_jsonb(a) AS row FROM ad507.addresses a WHERE id=$1::uuid',[created.id]);
    const media=await db.unsafe('SELECT to_jsonb(m) AS row FROM ad507.address_media m WHERE address_id=$1::uuid',[created.id]);
    await expect(repo.transfer(clientId,created.id,adminId,clientId)).rejects.toThrow('FORBIDDEN');
    await expect(repo.transfer(adminId,created.id,adminId,crypto.randomUUID())).rejects.toThrow('FORBIDDEN');
    const transfers=await Promise.all(Array.from({length:4},()=>repo.transfer(adminId,created.id,adminId,clientId)));
    expect(transfers.filter(t=>!t.unchanged)).toHaveLength(1);
    expect((await repo.read(clientId,created.id)).ownerId).toBe(clientId);
    const events=await db.unsafe("SELECT before_json,after_json FROM ad507.audit_log WHERE entity_id=$1 AND action='ADDRESS_OWNERSHIP_TRANSFERRED'",[created.id]);
    expect(events).toHaveLength(1);expect(events[0].before_json.ownerId).toBe(adminId);expect(events[0].after_json.ownerId).toBe(clientId);
    await expect(repo.transfer(adminId,created.id,adminId,adminId)).rejects.toThrow('OWNERSHIP_CONFLICT');
    await repo.transfer(adminId,created.id,clientId,adminId);
    await expect(repo.read(clientId,created.id)).rejects.toThrow('REQUEST_NOT_FOUND');
    expect(await db.unsafe('SELECT to_jsonb(a) AS row FROM ad507.addresses a WHERE id=$1::uuid',[created.id])).toEqual(before);
    expect(await db.unsafe('SELECT to_jsonb(m) AS row FROM ad507.address_media m WHERE address_id=$1::uuid',[created.id])).toEqual(media);
    const disabled=createNewAddressPublication(db,{namespaceExclusive:false,fetch:http});
    await expect(disabled.reserve({id:created.id,type:'BUSINESS',plan:'BUSINESS_FREE',name:'test',requestedName:''})).rejects.toThrow('HISTORICAL_NAMESPACE_NOT_VERIFIED');
    const collision=createNewAddressPublication(db,{namespaceExclusive:true,productNamespaceExclusive:true,fetch:(async()=>Response.json({ok:true,codes:[{codigo:results[0].code}]})) as typeof fetch});
    expect(await collision.reserve({id:created.id,type:'BUSINESS',plan:'BUSINESS_FREE',name:'test',requestedName:''})).not.toBe(results[0].code);
    const residential=await repo.createAdmin(adminId,'admin-residential-00000001',{type:'RESIDENTIAL',name:'New residential',reference:'Park',latitude:8,longitude:-80},[]);
    await repo.review(adminId,residential.id,'APPROVED');await expect(repo.publish(adminId,residential.id)).rejects.toThrow('RESIDENTIAL_PUBLICATION_NOT_READY');
    expect(await newPublicAddress(db,(await repo.read(adminId,residential.id)).code,origin)).toBeNull();
    await expect(repo.transfer(adminId,(await db.unsafe("SELECT id::text FROM ad507.addresses WHERE code='AD507-TESTBUSINESS'"))[0].id,adminId,clientId)).rejects.toThrow('REQUEST_NOT_FOUND');
  }finally{await db.end();}
});

test('ADMIN creation reuses the multipart route; transfer protects CSRF and expected owner',async()=>{
  const {handleRequestRoutes}=await import('../request-routes');const {createRequestRepository}=await import('../request-repository');
  const {adminCreationHtml}=await import('../user-panel');
  let user:any={id:adminId,roles:['ADMIN']};const context={enabled:true,sql,auth:{currentUser:async()=>user},repository:createRequestRepository(sql,{r2:null}),r2:null};
  const form=()=>{const body=new FormData();body.append('payload',JSON.stringify({type:'RESIDENTIAL',name:'Route admin address',reference:'Park',latitude:8,longitude:-80}));return new Request(origin+'/v1/admin/requests',{method:'POST',headers:{origin,'idempotency-key':'admin-route-0000000000001'},body});};
  const response=(await handleRequestRoutes(form(),context))!;expect(response.status).toBe(200);const id=(await response.json()).request.id;
  user={id:clientId,roles:['CLIENT']};expect((await handleRequestRoutes(form(),context))!.status).toBe(403);
  user={id:adminId,roles:['ADMIN']};
  const transfer=new Request(origin+'/v1/admin/requests/'+id+'/transfer',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({expectedOwner:adminId,targetId:clientId})});
  expect((await handleRequestRoutes(transfer,context))!.status).toBe(200);
  const denied=new Request(origin+'/v1/admin/requests/'+id+'/transfer',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:'{}'});
  expect((await handleRequestRoutes(denied,context))!.status).toBe(403);
  const html=adminCreationHtml();expect(html).toContain("fetch('/v1/admin/requests'");expect(html).toContain('/v1/user/panel?adminCreate=1');
  for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
});

test('commercial and country rollback preserves historical rows and rejects new data',async()=>{
  const name='ad507_rollback_'+crypto.randomUUID().replaceAll('-','');
  await sql.unsafe('CREATE DATABASE '+name);
  const url=new URL(isolatedDatabase);url.pathname='/'+name;const db=postgres(url.href,{max:1});const connection=await db.reserve();
  try{
    for(const file of ['0000_migration_ledger.sql','0001_core_foundation.sql','0002_plan_catalog.sql']){await connection.unsafe(readFileSync(new URL('db/migrations/'+file,root),'utf8'));console.info('rollback proof: applied '+file);}
    await connection.unsafe("INSERT INTO ad507.addresses(code,address_type,status,name,source) VALUES('AD507-OLD','BUSINESS','ACTIVE','Untouched historical','LEGACY')");
    const before=await connection.unsafe('SELECT code,name,source,status FROM ad507.addresses');
    for(const file of ['landline.sql','requests.sql','countries.sql']){await connection.unsafe(readFileSync(new URL('../schema-proposals/'+file,import.meta.url),'utf8'));console.info('rollback proof: applied '+file);}
    const columns=await connection.unsafe("SELECT column_name FROM information_schema.columns WHERE table_schema='ad507' AND table_name='addresses' AND column_name IN ('landline_phone','request_key_hash','request_payload_hash','request_data','review_decision','reviewed_by','publication_receipt')");expect(columns).toHaveLength(7);
    await connection.unsafe(readFileSync(new URL('../schema-proposals/rollback-countries.sql',import.meta.url),'utf8'));
    await connection.unsafe(readFileSync(new URL('../schema-proposals/rollback-requests.sql',import.meta.url),'utf8'));console.info('rollback proof: restored original schema');
    expect(await connection.unsafe('SELECT code,name,source,status FROM ad507.addresses')).toEqual(before);
    expect((await connection.unsafe("SELECT is_nullable FROM information_schema.columns WHERE table_schema='ad507' AND table_name='addresses' AND column_name='code'"))[0].is_nullable).toBe('NO');
    for(const file of ['landline.sql','requests.sql','countries.sql']){await connection.unsafe(readFileSync(new URL('../schema-proposals/'+file,import.meta.url),'utf8'));console.info('rollback proof: applied '+file);}
    await connection.unsafe("UPDATE ad507.addresses SET request_data='{}'::jsonb,source='USER_REQUEST' WHERE code='AD507-OLD'");
    let countryRollbackError='';
    try{await connection.unsafe(readFileSync(new URL('../schema-proposals/rollback-countries.sql',import.meta.url),'utf8'));}catch(error){countryRollbackError=String(error);}finally{await connection.unsafe('ROLLBACK');}
    expect(countryRollbackError).toContain('COUNTRY_ROLLBACK_REQUIRES_DATA_PRESERVATION');
    expect((await connection.unsafe("SELECT country_code FROM ad507.addresses WHERE code='AD507-OLD'"))[0].country_code).toBe('PA');
    let rollbackError='';
    try{await connection.unsafe(readFileSync(new URL('../schema-proposals/rollback-requests.sql',import.meta.url),'utf8'));}catch(error){rollbackError=String(error);}finally{await connection.unsafe('ROLLBACK');}
    expect(rollbackError).toContain('ROLLBACK_REQUIRES_DATA_PRESERVATION');
    expect((await connection.unsafe("SELECT request_data FROM ad507.addresses WHERE code='AD507-OLD'"))[0].request_data).toEqual({});
  }finally{await connection.unsafe('ROLLBACK').catch(()=>{});connection.release();await db.end({timeout:1});await sql.unsafe('DROP DATABASE '+name);}
},15000);

test('new publication HTTP serves the existing template and PostgreSQL API; historical routes remain separate',async()=>{
  const {handleNewPublicRoutes}=await import('../new-address-publication');
  const code=(await sql.unsafe("SELECT code FROM ad507.addresses WHERE name='ADMIN temporary address'"))[0].code;
  const server=Bun.serve({port:0,hostname:'127.0.0.1',fetch:async req=>(await handleNewPublicRoutes(req,{enabled:true,sql,r2:null}))??new Response(null,{status:404})});
  try{
    const base='http://127.0.0.1:'+server.port;
    const html=await fetch(base+'/'+code+'/');expect(html.status).toBe(200);const text=await html.text();expect(text).toContain('ADMIN temporary address');expect(text).not.toContain('{{CANONICAL}}');
    expect(text).toContain('https://direcciones.lat/'+code+'/');
    const api=await fetch(base+'/v1/addresses/'+code);expect(api.status).toBe(200);expect((await api.json()).address.code).toBe(code);
    expect((await fetch(base+'/AD507-TESTBUSINESS/')).status).toBe(404);
    const privatePhoto=(await sql.unsafe("SELECT m.id::text FROM ad507.address_media m JOIN ad507.addresses a ON a.id=m.address_id WHERE a.code=$1",[code]))[0].id;
    expect((await fetch(base+'/v1/addresses/'+code+'/media/'+privatePhoto)).status).toBe(503);
    expect(await handleNewPublicRoutes(new Request(base+'/'+code+'/'),{enabled:false,sql,r2:null})).toBeNull();
  }finally{server.stop(true);}
});

test('ADMIN five products reuse quotas and concurrent distinct reservations have unique codes',async()=>{
  const {createRequestRepository}=await import('../request-repository');const {createNewAddressPublication}=await import('../new-address-publication');
  const sharp=(await import('sharp')).default;const db=postgres(isolatedDatabase,{max:8});
  const settings={accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'test',secretAccessKey:'test',configurationVerified:true as const};
  const http=(async(url:any)=>String(url).includes('action=list')?Response.json({ok:true,codes:[{codigo:'AD507-0038'}]}):new Response(null,{status:200})) as typeof fetch;
  const repo=createRequestRepository(db,{r2:settings,fetch:http,canonical:createNewAddressPublication(db,{namespaceExclusive:true,productNamespaceExclusive:true,fetch:http})});
  const png=await sharp({create:{width:8,height:8,channels:3,background:'yellow'}}).png().toBuffer();const logo={role:'logo' as const,bytes:png,mime:'image/png'},photo={...logo,role:'photo' as const};
  const products=[{type:'RESIDENTIAL',plan:'RESIDENTIAL',files:[]},{type:'PLACE',plan:'PLACE',files:[photo]},{type:'BUSINESS',plan:'BUSINESS_FREE',files:[logo]},{type:'BUSINESS',plan:'BUSINESS_PREMIUM',files:[logo]},{type:'BUSINESS',plan:'BUSINESS_PREMIUM_PRO',files:[logo,photo]}];
  try{
    const created=[];
    for(const [i,p]of products.entries()){
      const r=await repo.createAdmin(adminId,'admin-products-00000000000'+i,{type:p.type,plan:p.plan,name:'ADMIN product '+i,reference:'Park',latitude:8,longitude:-80},p.files);
      expect(r.status).toBe('PENDING_REVIEW');expect((await repo.read(adminId,r.id)).media).toHaveLength(p.files.length);await repo.review(adminId,r.id,'APPROVED');created.push(r);
    }
    const published=await Promise.all(created.slice(1).map(r=>repo.publish(adminId,r.id)));
    expect(new Set(published.map(r=>r.code)).size).toBe(4);expect(published.every(r=>r.status==='ACTIVE'&&r.code!=='AD507-0038')).toBe(true);
    for(const r of created){await repo.transfer(adminId,r.id,adminId,clientId);expect((await repo.read(clientId,r.id)).ownerId).toBe(clientId);await repo.transfer(adminId,r.id,clientId,adminId);}
  }finally{await db.end();}
});

test('individual commercial staging, verified cutover and rollback preserve original codes and legacy snapshots',async()=>{
  const {createRequestRepository}=await import('../request-repository');const {createNewAddressPublication,newPublicAddress,handleNewPublicRoutes}=await import('../new-address-publication');
  const {renderCommercialBridge}=await import('../commercial-migration');const sharp=(await import('sharp')).default;
  const png=await sharp({create:{width:5,height:5,channels:3,background:'blue'}}).png().toBuffer();
  const db=postgres(isolatedDatabase,{max:8});const snapshots:any[]=[];const bridges=new Map<string,string>();let listed=true,changed=false;
  const http=(async(url:any)=>{const target=String(url);if(target.includes('action=list'))return Response.json({ok:true,codes:listed?snapshots.map(s=>({codigo:s.code})):[]});if(target.endsWith('.png'))return new Response(changed?await sharp(png).negate().png().toBuffer():png,{headers:{'content-type':'image/png'}});return new Response(bridges.get(target)??'old page',{headers:{'content-type':'text/html'}});}) as typeof fetch;
  const repo=createRequestRepository(db,{r2:null,fetch:http,canonical:{...createNewAddressPublication(db,{namespaceExclusive:false,fetch:http}),historicalRegistryVerified:true}});
  try{
    for(const [i,plan]of ['BUSINESS_FREE','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO','PLACE'].entries()){
      const code='AD507-HISTORICAL'+i,s={version:44,code,publicUrl:'https://direcciones507.com/'+code.toLowerCase()+'/',coreOrigin:origin,type:plan==='PLACE'?'PLACE':'BUSINESS',plan,name:'Original commercial '+i,reference:'Original reference',latitude:8.123456,longitude:-80.123456,phone:'+507 6000-0000',media:plan==='PLACE'?[{type:'IMAGE',url:'https://direcciones507.com/assets/place.png'}]:[{type:'LOGO',url:'https://direcciones507.com/assets/logo.png'},{type:'IMAGE',url:'https://direcciones507.com/assets/photo.png'}],socials:plan==='PLACE'?{}:{instagram:'https://instagram.com/original'},OWNER:'private-original-owner',PIN:'private-original-pin'};
      snapshots.push(s);await expect(repo.stageHistorical(clientId,'historical-client-000000'+i,s)).rejects.toThrow('FORBIDDEN');
      const key='historical-admin-0000000'+i,created=(await Promise.all([repo.stageHistorical(adminId,key,s),repo.stageHistorical(adminId,key,s)]))[0];
      expect((await repo.stageHistorical(adminId,key,s)).id).toBe(created.id);expect(created.code).toBe(code);await expect(repo.stageHistorical(adminId,key,{...s,name:'Changed'})).rejects.toThrow('IDEMPOTENCY_CONFLICT');
      await expect(repo.publish(adminId,created.id)).rejects.toThrow('APPROVAL_REQUIRED');await repo.review(adminId,created.id,'APPROVED');
      await expect(repo.publish(adminId,created.id)).rejects.toThrow('MIGRATION_BRIDGE_NOT_VERIFIED');expect(await newPublicAddress(db,code,origin)).toBeNull();
      bridges.set(s.publicUrl,renderCommercialBridge(s,created.id,origin));const published=await Promise.all([repo.publish(adminId,created.id),repo.publish(adminId,created.id)]);expect(published.every(p=>p.code===code&&p.status==='ACTIVE')).toBe(true);expect((await repo.read(adminId,created.id)).publicUrl).toBe(s.publicUrl);
      const pub=await newPublicAddress(db,code,origin);expect(pub?.url).toBe(s.publicUrl);expect(pub?.media.map(m=>m.url)).toEqual(s.media.map(m=>m.url));expect(JSON.stringify(pub)).not.toContain('private-original');
      if(plan!=='PLACE')expect(pub?.socials).toEqual([{platform:'instagram',url:'https://instagram.com/original'}]);
      const response=await handleNewPublicRoutes(new Request(origin+'/v1/addresses/'+code),{enabled:true,sql:db,r2:null});expect(response?.headers.get('access-control-allow-origin')).toBe('https://direcciones507.com');
      const before=(await db.unsafe('SELECT to_jsonb(a) AS row FROM ad507.addresses a WHERE id=$1::uuid',[created.id]))[0].row;
      await repo.transfer(adminId,created.id,adminId,clientId);expect((await db.unsafe('SELECT to_jsonb(a) AS row FROM ad507.addresses a WHERE id=$1::uuid',[created.id]))[0].row).toEqual(before);
      await expect(repo.rollbackHistorical(clientId,created.id)).rejects.toThrow('FORBIDDEN');listed=false;await expect(repo.rollbackHistorical(adminId,created.id)).rejects.toThrow('HISTORICAL_RESTORE_REQUIRED');expect((await repo.read(adminId,created.id)).status).toBe('ACTIVE');listed=true;
      expect((await repo.rollbackHistorical(adminId,created.id)).status).toBe('SUSPENDED');expect(await newPublicAddress(db,code,origin)).toBeNull();expect((await repo.read(adminId,created.id)).publicUrl).toBeNull();expect((await repo.rollbackHistorical(adminId,created.id)).status).toBe('SUSPENDED');
      changed=true;await expect(repo.publish(adminId,created.id)).rejects.toThrow('HISTORICAL_MEDIA_UNVERIFIED');changed=false;expect((await repo.publish(adminId,created.id)).code).toBe(code);
      const final=(await db.unsafe('SELECT legacy_payload,code FROM ad507.addresses WHERE id=$1::uuid',[created.id]))[0];expect(final.legacy_payload).toEqual(s);expect(final.code).toBe(code);
      expect((await db.unsafe("SELECT id FROM ad507.audit_log WHERE entity_id=$1 AND action='HISTORICAL_PUBLICATION_ROLLED_BACK'",[created.id])).length).toBe(1);
      await db.unsafe("UPDATE ad507.addresses SET name='Unreviewed change' WHERE id=$1::uuid",[created.id]);await expect(repo.rollbackHistorical(adminId,created.id)).rejects.toThrow('HISTORICAL_DATA_CHANGED');
    }
  }finally{await db.end({timeout:1});}
},30000);


test('payment preparation reuses orders: immutable amount, ownership, late IPN and idempotent audit',async()=>{
  const {createPaymentRepository,requireConfirmedPayment}=await import('../payment-repository');
  const {createHmac}=await import('node:crypto');
  await sql.unsafe(readFileSync(new URL('../schema-proposals/payments.sql',import.meta.url),'utf8'));
  const config={environment:'test' as const,merchantId:'isolated',domain:'https://example.test',ipnUrl:'https://example.test/ipn',secret:Buffer.from('isolated-key.metadata').toString('base64')};
  const db=postgres(isolatedDatabase,{max:4}),repo=createPaymentRepository(db,config);
  const make=async(plan:string)=>{
    const rows=await db.unsafe("INSERT INTO ad507.addresses(code,address_type,status,name,source,request_key_hash,request_data) VALUES(NULL,'BUSINESS','PENDING_REVIEW','Private payment test','USER_REQUEST',$1,$2::jsonb) RETURNING id",[crypto.randomUUID(),db.json({plan})]);
    await db.unsafe('INSERT INTO ad507.address_ownership(address_id,user_id) VALUES($1::uuid,$2::uuid)',[rows[0].id,clientId]);return rows[0].id;
  };
  const signed=(orderId:string,status:string)=>new URLSearchParams({orderId,status,domain:config.domain,hash:createHmac('sha256','isolated-key').update(orderId+status+config.domain).digest('hex')});
  try{
    const address=await make('BUSINESS_PREMIUM');
    const [a,b]=await Promise.all([repo.prepare(clientId,address,'payment-test-key-0001'),repo.prepare(clientId,address,'payment-test-key-0001')]);
    expect(a.order.id).toBe(b.order.id);expect(a.order.amount_cents).toBe(1999);
    await expect(repo.prepare(clientId,address,'payment-test-key-0002')).rejects.toThrow('PAYMENT_ALREADY_EXISTS');
    await expect(repo.read(adminId,a.order.id)).rejects.toThrow('PAYMENT_NOT_FOUND');
    await expect(repo.confirm(signed(a.order.provider_order_id,'E'))).rejects.toThrow('PAYMENT_PROVIDER_REFERENCE_REQUIRED');
    await repo.registerProviderOrder(a.order.id,'isolated-provider-transaction');
    await repo.confirm(signed(a.order.provider_order_id,'R'));
    const paid=await Promise.all([repo.confirm(signed(a.order.provider_order_id,'E')),repo.confirm(signed(a.order.provider_order_id,'E'))]);
    expect(paid.filter(p=>!p.unchanged)).toHaveLength(1);
    expect((await repo.read(clientId,a.order.id)).status).toBe('PAID');
    const requestRow=(await db.unsafe('SELECT * FROM ad507.addresses WHERE id=$1::uuid',[address]))[0];
    await requireConfirmedPayment(db,requestRow,'test');await expect(requireConfirmedPayment(db,requestRow,'production')).rejects.toThrow('PAYMENT_CONFIRMATION_REQUIRED');
    expect((await repo.confirm(signed(a.order.provider_order_id,'C'))).status).toBe('PAID');
    expect((await db.unsafe('SELECT status FROM ad507.addresses WHERE id=$1::uuid',[address]))[0].status).toBe('PENDING_REVIEW');
    expect((await db.unsafe("SELECT count(*)::int AS n FROM ad507.audit_log WHERE entity_id=$1 AND action='YAPPY_PAYMENT_CONFIRMED'",[a.order.id]))[0].n).toBe(2);
    const free=await make('BUSINESS_FREE');expect(await repo.prepare(clientId,free,'payment-free-key-0001')).toEqual({required:false,amountCents:0});
    expect((await db.unsafe('SELECT id FROM ad507.orders WHERE address_id=$1::uuid',[free])).length).toBe(0);
    await expect(createPaymentRepository(db,{...config,environment:'production'}).read(clientId,a.order.id)).rejects.toThrow('PAYMENT_NOT_FOUND');
  }finally{await db.end();}
});

test('LATAM uses existing ADMIN requests, private R2 and PG with country/territory round trip and closed foreign publication',async()=>{
  const {createRequestRepository}=await import('../request-repository');
  const {createNewAddressPublication,newPublicAddress,renderNewPublicAddress}=await import('../new-address-publication');
  const {createPaymentRepository}=await import('../payment-repository');
  const {proposedInternationalCode,INITIAL_COUNTRIES}=await import('../country-configuration');
  const sharp=(await import('sharp')).default,db=postgres(isolatedDatabase,{max:8,connection:{statement_timeout:5000,lock_timeout:3000}});
  const files=[{role:'logo' as const,mime:'image/png',bytes:await sharp({create:{width:6,height:6,channels:3,background:'blue'}}).png().toBuffer()}];
  const calls:string[]=[];
  const http=(async(url:any,init:any)=>{if(String(url).includes('action=list'))return Response.json({ok:true,codes:[{codigo:'AD507-0038'}]});calls.push(init.method);return new Response(null,{status:200});}) as typeof fetch;
  const repo=createRequestRepository(db,{r2:{accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'fixture',secretAccessKey:'fixture',configurationVerified:true},fetch:http,canonical:createNewAddressPublication(db,{namespaceExclusive:true,productNamespaceExclusive:true,fetch:http})});
  const raw={type:'BUSINESS',plan:'BUSINESS_FREE',name:'LATAM isolated',reference:'Park',latitude:8.2,longitude:-80.1,region:'Región',municipality:'Municipio',locality:'Localidad',city:'Ciudad',sector:'Sector'};
  try{
    for(const countryCode of INITIAL_COUNTRIES){
      console.info('LATAM isolated country '+countryCode);
      const phone=countryCode==='CO'?'3001234567':'88888888';
      const data={...raw,name:'LATAM '+countryCode,countryCode,phone};
      const results=await Promise.all([repo.createAdmin(adminId,'latam-create-key-'+countryCode,data,files),repo.createAdmin(adminId,'latam-create-key-'+countryCode,data,files)]);
      console.info('LATAM created '+countryCode);
      expect(results[0].id).toBe(results[1].id);expect(results[0].status).toBe('PENDING_REVIEW');
      const read=await repo.read(adminId,results[0].id);expect(read.countryCode).toBe(countryCode);expect(read.extras.countryCode).toBe(countryCode);expect(read.extras.territory.city).toBe('Ciudad');
      expect(read.media).toHaveLength(1);expect(read.media[0].status).toBe('READY');expect(read.media[0].url).toBeNull();
      await expect(repo.read(clientId,results[0].id)).rejects.toThrow('REQUEST_NOT_FOUND');
      await expect(repo.createAdmin(clientId,'latam-forbidden-'+countryCode,data,files)).rejects.toThrow('FORBIDDEN');
      console.info('LATAM validated '+countryCode);
      await repo.review(adminId,results[0].id,'APPROVED');
      console.info('LATAM reviewed '+countryCode);
      if(countryCode!=='PA'){
        await expect(repo.publish(adminId,results[0].id)).rejects.toThrow('COUNTRY_NOT_ENABLED');
        await expect(repo.submit(clientId,'latam-client-key-'+countryCode,data,files)).rejects.toThrow('COUNTRY_NOT_ENABLED');
        const payment=createPaymentRepository(db,{provider:'PAYPAL',environment:'test'});
        await expect(payment.preparePayPal(adminId,results[0].id,'latam-payment-key-'+countryCode)).rejects.toThrow('COUNTRY_NOT_ENABLED');
        console.info('LATAM foreign gates '+countryCode);
        const code=proposedInternationalCode(countryCode,results[0].id);
        await db.unsafe('UPDATE ad507.addresses SET code=$2 WHERE id=$1::uuid',[results[0].id,code]);
        await expect((async()=>await db.unsafe("UPDATE ad507.addresses SET code='AD507-WRONG' WHERE id=$1::uuid",[results[0].id]))()).rejects.toMatchObject({code:'23514'});
        const second=await repo.createAdmin(adminId,'latam-second-key-'+countryCode,{...data,name:'Other '+countryCode},files);
        await expect((async()=>await db.unsafe('UPDATE ad507.addresses SET code=$2 WHERE id=$1::uuid',[second.id,code]))()).rejects.toMatchObject({code:'23505'});
      }else{
        const published=await repo.publish(adminId,results[0].id),pub=await newPublicAddress(db,published.code,origin);
        expect(pub?.url).toBe('https://direcciones.lat/'+published.code+'/');
        expect(renderNewPublicAddress(pub!)).toContain('DIRECCIONES<span>507</span>');
      }
    }
    console.info('LATAM requests complete');
    expect(calls.every(method=>method==='PUT')).toBe(true);
    const connection=await db.reserve();try{
      await expect((async()=>await connection.unsafe(readFileSync(new URL('../schema-proposals/countries.sql',import.meta.url),'utf8')))()).rejects.toThrow('COUNTRY_PROPOSAL_ALREADY_PRESENT_REVIEW_LEDGER');
    }finally{await connection.unsafe('ROLLBACK');connection.release();}
  }finally{await db.end({timeout:2});}
},30000);

test('PayPal sandbox shares orders/audit: concurrent intent, private ownership, safe uncertainty, refund and no auto-publication',async()=>{
  const {createPaymentRepository,requireConfirmedPayment}=await import('../payment-repository');
  await sql.unsafe(readFileSync(new URL('../schema-proposals/paypal.sql',import.meta.url),'utf8'));
  const db=postgres(isolatedDatabase,{max:4}),repo=createPaymentRepository(db,{provider:'PAYPAL',environment:'test'});
  const make=async()=>{
    const rows=await db.unsafe("INSERT INTO ad507.addresses(code,address_type,status,name,source,request_key_hash,request_data) VALUES(NULL,'BUSINESS','PENDING_REVIEW','PayPal isolated','USER_REQUEST',$1,$2::jsonb) RETURNING id",[crypto.randomUUID(),db.json({countryCode:'PA',plan:'BUSINESS_PREMIUM'})]);
    await db.unsafe('INSERT INTO ad507.address_ownership(address_id,user_id) VALUES($1::uuid,$2::uuid)',[rows[0].id,clientId]);return rows[0].id;
  };
  try{
    const address=await make();const [a,b]=await Promise.all([repo.preparePayPal(clientId,address,'paypal-shared-key-001'),repo.preparePayPal(clientId,address,'paypal-shared-key-001')]);
    expect(a.order.id).toBe(b.order.id);expect(a.order.amount_cents).toBe(1999);
    await expect(repo.preparePayPal(clientId,address,'paypal-another-key-001')).rejects.toThrow('PAYMENT_ALREADY_EXISTS');
    await expect(repo.preparePayPal(adminId,address,'paypal-foreign-owner-001')).rejects.toThrow('PAYMENT_NOT_FOUND');
    const yappy=createPaymentRepository(db,{environment:'test',merchantId:'fixture',domain:'https://example.test',ipnUrl:'https://example.test/ipn',secret:Buffer.from('fixture.key').toString('base64')});
    await expect(yappy.prepare(clientId,address,'yappy-second-method-001')).rejects.toThrow('PAYMENT_ALREADY_EXISTS');
    let calls=0,refunded=false;
    const provider={createOrder:async()=>{calls++;return {providerOrderId:'PAYPALISOLATED123'};},confirmedCapture:async()=>({status:refunded?'REFUNDED':'PAID',captureId:'CAPTUREISOLATED123'})} as any;
    await repo.initializePayPal(clientId,a.order.id,provider);
    await expect(repo.initializePayPal(clientId,a.order.id,provider)).rejects.toThrow('PAYMENT_ALREADY_INITIALIZED');expect(calls).toBe(1);
    const confirmed=await Promise.all([repo.confirmPayPal(clientId,a.order.id,provider),repo.confirmPayPal(clientId,a.order.id,provider)]);
    expect(confirmed.filter(p=>!p.unchanged)).toHaveLength(1);
    const row=(await db.unsafe('SELECT * FROM ad507.addresses WHERE id=$1::uuid',[address]))[0];expect(row.status).toBe('PENDING_REVIEW');expect(row.review_decision).toBeNull();expect(row.code).toBeNull();
    await requireConfirmedPayment(db,row,'test');await expect(requireConfirmedPayment(db,row,'production')).rejects.toThrow('PAYMENT_CONFIRMATION_REQUIRED');
    refunded=true;expect((await repo.confirmPayPal(clientId,a.order.id,provider)).status).toBe('REFUNDED');
    expect((await repo.confirmPayPal(clientId,a.order.id,provider)).unchanged).toBe(true);
    await expect(requireConfirmedPayment(db,row,'test')).rejects.toThrow('PAYMENT_CONFIRMATION_REQUIRED');
    expect((await db.unsafe("SELECT count(*)::int AS n FROM ad507.audit_log WHERE entity_id=$1 AND action='PAYPAL_PAYMENT_CONFIRMED'",[a.order.id]))[0].n).toBe(2);
    const pending=await repo.preparePayPal(clientId,await make(),'paypal-timeout-key-001');
    const failing={createOrder:async()=>{throw Error('PAYPAL_PROVIDER_UNCONFIRMED');}} as any;
    await expect(repo.initializePayPal(clientId,pending.order.id,failing)).rejects.toThrow('PAYPAL_PROVIDER_UNCONFIRMED');
    await expect(repo.initializePayPal(clientId,pending.order.id,provider)).rejects.toThrow('PAYMENT_ALREADY_INITIALIZED');
    expect((await db.unsafe('SELECT status,provider_reference FROM ad507.orders WHERE id=$1::uuid',[pending.order.id]))[0]).toMatchObject({status:'PENDING',provider_reference:'INITIALIZING:'+pending.order.id});
  }finally{await db.end();}
},30000);

test('one OAuth authenticates the same identity on both explicit domains with origin-bound state and cookies',async()=>{
 const pa='https://direcciones507.com',lat='https://direcciones.lat';
 const auth=createGeneralAuth(sql,{...env,AD507_GOOGLE_REDIRECT_URI:pa+'/auth/google/callback',AD507_PUBLIC_BASE_URL:pa,AD507_AUTH_SUCCESS_URL:'/panel',AD507_INTERNATIONAL_DOMAIN_VERIFIED:'true',AD507_GOOGLE_REDIRECT_URI_LATAM:lat+'/auth/google/callback',AD507_AUTH_SUCCESS_URL_LATAM:'/panel'},google({sub:'dual-origin-sub',email:'dual-origin-client@gmail.com',email_verified:true}));
 const begin=async(host:string)=>{
  const r=(await auth.handle(new Request(host+'/auth/google/login')))!;expect(r.status).toBe(302);
  const u=new URL(r.headers.get('location')!);expect(u.searchParams.get('redirect_uri')).toBe(host+'/auth/google/callback');
  expect(r.headers.get('set-cookie')).not.toContain('Domain=');
  return {state:u.searchParams.get('state')!,binding:binding(r)};
 };
 const flow=await begin(pa);
 const mismatched=(await auth.handle(new Request(lat+'/auth/google/callback?state='+flow.state+'&code=test',{headers:{cookie:flow.binding}})))!;
 expect(mismatched.status).toBe(400);
 const complete=async(host:string,f:any)=> (await auth.handle(new Request(host+'/auth/google/callback?state='+f.state+'&code=test',{headers:{cookie:f.binding}})))!;
 const panama=await complete(pa,flow),international=await complete(lat,await begin(lat));
 expect(panama.status).toBe(302);expect(international.status).toBe(302);
 expect(international.headers.get('location')).toBe(lat+'/panel');
 const get=async(host:string,cookie:string)=> (await auth.handle(new Request(host+'/v1/auth/me',{headers:{cookie}})))!;
 const a=await (await get(pa,session(panama))).json(),b=await(await get(lat,session(international))).json();
 expect(a.user.id).toBe(b.user.id);expect(a.user.roles).toEqual(['CLIENT']);
 // Existing primary sessions had no origin claim: retain them only on the primary host.
 const {createHash,createHmac,randomBytes}=await import('node:crypto');
 const oldSid=randomBytes(32).toString('base64url'),oldExp=Math.floor(Date.now()/1000)+600;
 await sql.unsafe('INSERT INTO ad507.auth_sessions(session_hash,user_id,expires_at) VALUES($1,$2::uuid,to_timestamp($3))',[createHash('sha256').update(oldSid).digest('hex'),a.user.id,oldExp]);
 const oldBody=Buffer.from(JSON.stringify({uid:a.user.id,email:a.user.email,sid:oldSid,exp:oldExp})).toString('base64url');
 const oldCookie='ad507_session='+oldBody+'.'+createHmac('sha256',env.AD507_SESSION_SECRET).update(oldBody).digest('base64url');
 expect((await get(pa,oldCookie)).status).toBe(200);expect((await get(lat,oldCookie)).status).toBe(401);

 expect((await get(lat,session(panama))).status).toBe(401);expect((await get(pa,session(international))).status).toBe(401);
 expect((await sql.unsafe("SELECT count(*)::int AS n FROM ad507.google_identities WHERE google_sub='dual-origin-sub'"))[0].n).toBe(1);
 const csrf=(await auth.handle(new Request(lat+'/auth/logout',{method:'POST',headers:{cookie:session(international),origin:pa}})))!;expect(csrf.status).toBe(403);
 const logout=(await auth.handle(new Request(lat+'/auth/logout',{method:'POST',headers:{cookie:session(international),origin:lat}})))!;expect(logout.status).toBe(204);
 expect((await get(lat,session(international))).status).toBe(401);expect((await get(pa,session(panama))).status).toBe(200);
});


test('PR43 Mi cuenta isolates users, country contexts, cursors and ADMIN permissions',async()=>{
 const {handleUserPanel}=await import('../user-panel');
 const {handleRequestRoutes}=await import('../request-routes');
 const {createRequestRepository}=await import('../request-repository');
 const users=[0,1,2].map(i=>({id:crypto.randomUUID(),email:'panel-'+crypto.randomUUID()+'@example.test',displayName:'Fixture '+i,roles:i===2?['ADMIN']:['CLIENT']}));
 for(const user of users){
  await sql.unsafe('INSERT INTO ad507.users(id,email) VALUES($1::uuid,$2)',[user.id,user.email]);
  await sql.unsafe('INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,$2)',[user.id,user.roles[0]]);
  for(const country of ['PA','CO'])for(let i=0;i<2;i++){
   const rows=await sql.unsafe("INSERT INTO ad507.addresses(address_type,status,name,source,country_code,request_key_hash,request_data) VALUES('BUSINESS','PENDING_REVIEW',$1,'USER_REQUEST',$2,$4,$3::jsonb) RETURNING id",['private-'+user.id+'-'+country+'-'+i,country,sql.json({countryCode:country,type:'BUSINESS',plan:'BUSINESS_FREE',media:[]}),crypto.randomUUID()]);
   await sql.unsafe('INSERT INTO ad507.address_ownership(address_id,user_id) VALUES($1::uuid,$2::uuid)',[rows[0].id,user.id]);
  }
 }
 const panel=(user:any,host:string,query='')=>handleUserPanel(new Request(host+'/v1/user/panel'+query,{headers:{origin:host}}),sql,{currentUser:async()=>user} as any);
 for(const user of users){
  for(const host of ['https://direcciones507.com','https://direcciones.lat'])for(const country of ['PA','CO','PA']){
   const r=await panel(user,host,'?country='+country);expect(r!.status).toBe(200);const d=await r!.json();expect(d.addresses).toHaveLength(2);
   expect(d.addresses.every((a:any)=>a.countryCode===country&&a.name.startsWith('private-'+user.id))).toBe(true);
   for(const other of users.filter(x=>x.id!==user.id))expect(JSON.stringify(d)).not.toContain('private-'+other.id);
  }
  const first=await(await panel(user,'https://direcciones507.com','?country=PA&limit=1'))!.json();expect(first.nextAddressCursor).toBeTruthy();
  const next=await(await panel(user,'https://direcciones507.com','?country=PA&limit=1&cursor='+first.nextAddressCursor))!.json();expect(next.addresses).toHaveLength(1);expect(next.addresses[0].id).not.toBe(first.addresses[0].id);
  expect((await panel(user,'https://direcciones.lat','?country=CO&cursor='+first.nextAddressCursor))!.status).not.toBe(200);
  expect((await panel(user,'https://direcciones507.com','?adminCreate=1'))!.status).toBe(user.roles.includes('ADMIN')?200:403);
 }
 const target=(await(await panel(users[0],'https://direcciones507.com','?country=PA'))!.json()).addresses[0].id;
 const repository=createRequestRepository(sql,{r2:null});
 for(const user of users){
  const r=await handleRequestRoutes(new Request('https://direcciones507.com/v1/admin/requests/'+target),{enabled:true,sql,auth:{currentUser:async()=>user} as any,repository,r2:null});
  expect(r!.status).toBe(user.roles.includes('ADMIN')?200:403);
 }
 expect((await panel(null,'https://direcciones507.com'))!.status).toBe(401);
 const denied=await handleUserPanel(new Request('https://direcciones507.com/v1/user/panel',{headers:{origin:'https://direcciones.lat'}}),sql,{currentUser:async()=>users[0]} as any);expect(denied!.status).toBe(403);
 console.info('PR43 panel PASS: separate owners on PA/CO, context switches, cursor mismatch, CLIENT admin403, ADMIN review200, anonymous401, cross-origin403');
});

test('existing Natalie backend allows only exact verified LATAM origin in isolated CORS preflight, without session/provider calls',async()=>{
 for(const route of ['controlled-session','controlled-conversation']){
  const url='http://127.0.0.1:'+runtimePort+'/internal/v1/natalie/'+route;
  const allowed=await fetch(url,{method:'OPTIONS',headers:{origin:'https://direcciones.lat'}});
  expect(allowed.status).toBe(204);expect(allowed.headers.get('access-control-allow-origin')).toBe('https://direcciones.lat');
  const denied=await fetch(url,{method:'OPTIONS',headers:{origin:'https://direcciones.lat.evil.test'}});
  expect(denied.status).toBe(403);expect(denied.headers.get('access-control-allow-origin')).toBeNull();
 }
});

test('isolated HTTP commercial journey connects OAuth, client request, ADMIN review, publication, canonical delivery and existing QR',async()=>{
 const {handleRequestRoutes}=await import('../request-routes');
 const {createRequestRepository}=await import('../request-repository');
 const {createNewAddressPublication,handleNewPublicRoutes}=await import('../new-address-publication');
 const {handleUserPanel}=await import('../user-panel');
 const {requestAdminScript}=await import('../request-admin-ui');
 const sharp=(await import('sharp')).default,db=postgres(isolatedDatabase,{max:4});
 const before=await db.unsafe("SELECT to_jsonb(a) AS row FROM ad507.addresses a WHERE source<>'USER_REQUEST' ORDER BY id");
 const objects=new Map<string,Uint8Array>();
 const providers=(async(input:any,init:any={})=>{
  const url=String(input);if(url.includes('script.google.com')&&url.includes('action=list'))return Response.json({ok:true,codes:[{codigo:'AD507-0038'}]});
  if(!url.includes('.r2.cloudflarestorage.com/'))throw Error('UNEXPECTED_EXTERNAL_NETWORK');
  if(init.method==='PUT'){objects.set(url,new Uint8Array(init.body));return new Response(null,{status:200});}
  if(init.method==='DELETE'){objects.delete(url);return new Response(null,{status:204});}
  const bytes=objects.get(url);return bytes?new Response(bytes,{headers:{'content-type':'image/webp','content-length':String(bytes.length)}}):new Response(null,{status:404});
 }) as typeof fetch;
 const unique=crypto.randomUUID(),profiles:any={client:{sub:'flow-client-'+unique,email:'flow-client-'+unique+'@gmail.com',email_verified:true},admin:{sub:'flow-admin-'+unique,email:'flow-admin-'+unique+'@gmail.com',email_verified:true}};
 const googleHttp=(async(input:any,init:any)=>{
  if(String(input)==='https://oauth2.googleapis.com/token')return Response.json({access_token:new URLSearchParams(init.body).get('code')});
  if(String(input)!=='https://openidconnect.googleapis.com/v1/userinfo')throw Error('UNEXPECTED_GOOGLE_NETWORK');
  return Response.json(profiles[String(init.headers.authorization).slice(7)]);
 }) as typeof fetch;
 const auth=createGeneralAuth(db,env,googleHttp);
 const r2={accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'isolated',secretAccessKey:'isolated',configurationVerified:true as const};
 const repo=createRequestRepository(db,{r2,fetch:providers,canonical:createNewAddressPublication(db,{namespaceExclusive:true,productNamespaceExclusive:true,fetch:providers}),paymentEnvironment:'production'});
 const blocked=createRequestRepository(db,{r2,fetch:providers,canonical:createNewAddressPublication(db,{namespaceExclusive:false,fetch:providers}),paymentEnvironment:'production'});
 let fixtureEvidenceVerified=false;
 const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:async incoming=>{
  // Test-only HTTPS edge simulation; actual transport is local HTTP, no production ingress.
  const path=new URL(incoming.url);const req=new Request(origin+path.pathname+path.search,incoming);
  return await auth.handle(req)??await handleRequestRoutes(req,{enabled:true,sql:db,auth,repository:fixtureEvidenceVerified?repo:blocked,r2,fetch:providers})??await handleNewPublicRoutes(req,{enabled:true,sql:db,r2,fetch:providers})??await handleUserPanel(req,db,auth)??new Response(null,{status:404});
 }});
 const base='http://127.0.0.1:'+server.port;
 const call=(path:string,cookie='',init:any={})=>fetch(base+path,{...init,redirect:'manual',headers:{...init.headers,...(cookie?{cookie}:{}),origin}});
 const loginHttp=async(role:string)=>{
  const begin=await call('/auth/google/login');expect(begin.status).toBe(302);
  const state=new URL(begin.headers.get('location')!).searchParams.get('state');
  const done=await call('/auth/google/callback?state='+state+'&code='+role,binding(begin));expect(done.status).toBe(302);
  const c=session(done),me=await(await call('/v1/auth/me',c)).json();return {cookie:c,user:me.user};
 };
 const png=await sharp({create:{width:12,height:12,channels:3,background:'blue'}}).png().toBuffer();
 const raw={type:'BUSINESS',plan:'BUSINESS_FREE',countryCode:'PA',name:'Iglesia Catedral — fixture aislado '+unique,reference:'Synthetic reference',description:'',latitude:8.1,longitude:-80.9,phone:'+50760000000',hours:'08:00–17:00'};
 const form=(data:any)=>{const body=new FormData();body.append('payload',JSON.stringify(data));body.append('logo',new Blob([png],{type:'image/png'}),'synthetic.png');return body;};
 try{
  const client=await loginHttp('client'),admin=await loginHttp('admin');
  await db.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'ADMIN')",[admin.user.id]); // Isolated fixture role only.
  const submit=()=>call('/v1/user/requests',client.cookie,{method:'POST',headers:{'idempotency-key':'http-journey-'+unique},body:form(raw)});
  const sent=await submit();expect(sent.status).toBe(200);const initial=(await sent.json()).request;expect(initial.status).toBe('PENDING_REVIEW');expect(initial.code).toBeNull();
  const retry=await submit();expect((await retry.json()).request.id).toBe(initial.id);expect(objects.size).toBe(1);
  expect((await call('/v1/admin/requests/'+initial.id,client.cookie)).status).toBe(403);
  const actions:any={children:[],append(x:any){this.children.push(x)}},message:any={textContent:''},rows:any={};
  Object.defineProperty(rows,'innerHTML',{set(){actions.children=[];}});
  const doc={getElementById:(id:string)=>id==='requestsRows'?rows:id==='reviewActions'?actions:message,createElement:(tag:string)=>({tag})};
  const adminHttp=(path:string,init:any={})=>call(path,admin.cookie,init);
  const open=new Function('document','fetch','esc',requestAdminScript+';return openRequestReview;')(doc,adminHttp,(x:any)=>String(x??'').replaceAll('<','&lt;'));
  await open(initial.id);expect(actions.children.some((x:any)=>x.textContent==='Abrir ficha, enlace y QR')).toBe(false);
  await actions.children.find((x:any)=>x.textContent==='Aprobar').onclick();
  let publish=actions.children.find((x:any)=>x.textContent==='Publicar');expect(publish).toBeDefined();
  await publish.onclick();expect(message.textContent).toContain('Publicación bloqueada');
  const unchanged=(await(await call('/v1/admin/requests/'+initial.id,admin.cookie)).json()).request;expect(unchanged.code).toBeNull();expect(unchanged.publicUrl).toBeNull();expect(unchanged.status).toBe('PENDING_REVIEW');
  fixtureEvidenceVerified=true; // Synthetic historical registry only; never sets a production gate.
  await publish.onclick();const link=actions.children.find((x:any)=>x.textContent==='Abrir dirección digital');expect(link).toBeDefined();
  const canonical=link.href;expect(canonical).toMatch(/^https:\/\/direcciones.lat\/AD507-[0-9]{8}\/$/);expect(link.href).toBe(canonical);
  const delivered=await(await call('/v1/user/panel',client.cookie)).json();const card=delivered.addresses.find((a:any)=>a.id===initial.id);expect(card.status).toBe('ACTIVE');expect(card.publicUrl).toBe(canonical);
  const page=await call(new URL(card.publicUrl).pathname);expect(page.status).toBe(200);const html=await page.text();expect(html).toContain(raw.name);expect(html).toContain('DIRECCIONES<span>507</span>');
  const qr=new Function(html.match(/const qrUrl = [^\n]+/)![0]+';return qrUrl;')();expect(new URL(qr).searchParams.get('data')).toBe(canonical);expect(html).toContain('navigator.clipboard.writeText('+JSON.stringify(canonical)+')');
  const published=(await(await call('/v1/admin/requests/'+initial.id,admin.cookie)).json()).request;
  const publicPhoto=await call('/v1/addresses/'+published.code+'/media/'+published.media[0].id);expect(publicPhoto.status).toBe(200);expect(publicPhoto.headers.get('content-type')).toBe('image/webp');
  const again=await call('/v1/admin/requests/'+initial.id+'/publish',admin.cookie,{method:'POST'});expect(again.status).toBe(200);expect((await again.json()).request.code).toBe(published.code);
  expect((await db.unsafe('SELECT count(*)::int AS n FROM ad507.addresses WHERE id=$1::uuid',[initial.id]))[0].n).toBe(1);
  const co=await call('/v1/admin/requests',admin.cookie,{method:'POST',headers:{'idempotency-key':'http-journey-co-'+unique},body:form({...raw,countryCode:'CO',name:'Synthetic Colombia '+unique,phone:'+573001234567'})});expect(co.status).toBe(200);const foreign=(await co.json()).request;
  expect((await call('/v1/admin/requests/'+foreign.id+'/approve',admin.cookie,{method:'POST'})).status).toBe(200);
  const stop=await call('/v1/admin/requests/'+foreign.id+'/publish',admin.cookie,{method:'POST'});expect(stop.status).toBe(503);expect((await stop.json()).error).toBe('COUNTRY_NOT_ENABLED');
  const foreignRead=(await(await call('/v1/admin/requests/'+foreign.id,admin.cookie)).json()).request;expect(foreignRead.countryCode).toBe('CO');expect(foreignRead.publicUrl).toBeNull();expect(foreignRead.code).toBeNull();
  expect(await db.unsafe("SELECT to_jsonb(a) AS row FROM ad507.addresses a WHERE source<>'USER_REQUEST' ORDER BY id")).toEqual(before);
  console.info('HTTP journey PASS: OAuth → multipart/logo → durable request/retry → ADMIN approve → closed gate 503 → synthetic verified publication → owner canonical link → existing QR/copy → WebP; Colombia stops exactly at publish503');
 }finally{server.stop(true);await db.end({timeout:2});}
},20000);

// Only a disposable local database: production foundation may not yet have commercial proposals.
test('Mi cuenta works on foundation-only PostgreSQL for cuenta507 and LATAM with persistent isolated OAuth sessions',async()=>{
 const name='panel_foundation_'+crypto.randomUUID().replaceAll('-','');
 await sql.unsafe('CREATE DATABASE '+name);
 const dbUrl=new URL(isolatedDatabase);dbUrl.pathname='/'+name;
 const db=postgres(dbUrl.toString(),{max:1,connect_timeout:5,connection:{statement_timeout:'5000',lock_timeout:'2000'},onnotice:()=>{}});
 try{
  for(const file of ['0000_migration_ledger.sql','0001_core_foundation.sql','0002_plan_catalog.sql','0003_plan_capabilities.sql','0005_general_google_auth.sql'])await db.unsafe(readFileSync(new URL('db/migrations/'+file,root),'utf8'));
  console.info('Foundation panel: migrations complete');
  const cols=await db.unsafe("SELECT column_name FROM information_schema.columns WHERE table_schema='ad507' AND table_name='addresses'");
  for(const column of ['country_code','request_data','publication_receipt'])expect(cols.some(c=>c.column_name===column)).toBe(false);
  await expect(Promise.resolve(db.unsafe('SELECT a.country_code FROM ad507.addresses a'))).rejects.toMatchObject({code:'42703'});
  console.info('Foundation panel: missing-column reproduction complete');
  const {handleUserPanel}=await import('../user-panel');
  const pa='https://cuenta.direcciones507.com',lat='https://direcciones.lat';
  const auth=createGeneralAuth(db,{...env,AD507_GOOGLE_REDIRECT_URI:pa+'/auth/google/callback',AD507_AUTH_SUCCESS_URL:'/panel',AD507_PUBLIC_BASE_URL:pa,AD507_INTERNATIONAL_DOMAIN_VERIFIED:'true',AD507_GOOGLE_REDIRECT_URI_LATAM:lat+'/auth/google/callback',AD507_AUTH_SUCCESS_URL_LATAM:'/panel'},google({sub:'foundation-panel-user',email:'foundation-panel@gmail.com',email_verified:true}));
  const cookies:Record<string,string>={},users:Record<string,any>={};
  for(const host of [pa,lat]){
   console.info('Foundation panel: OAuth '+host);
   const entry=(await auth.handle(new Request(host+'/auth/google/login')))!;
   expect(entry.status).toBe(302);const target=new URL(entry.headers.get('location')!);
   expect(target.searchParams.get('redirect_uri')).toBe(host+'/auth/google/callback');
   const done=(await auth.handle(new Request(host+'/auth/google/callback?state='+target.searchParams.get('state')+'&code=test',{headers:{cookie:binding(entry)}})))!;
   expect(done.status).toBe(302);expect(done.headers.get('location')).toBe(host+'/panel');
   expect(done.headers.getSetCookie().some(c=>c.startsWith('ad507_session=')&&c.includes('HttpOnly; Secure; SameSite=Lax'))).toBe(true);
   cookies[host]=session(done);
   for(let reload=0;reload<2;reload++){
    const me=(await auth.handle(new Request(host+'/v1/auth/me',{headers:{cookie:cookies[host]}})))!;
    expect(me.status).toBe(200);users[host]=(await me.json()).user;
    const panel=(await handleUserPanel(new Request(host+'/v1/user/panel',{headers:{cookie:cookies[host]}}),db,auth))!;
    expect(panel.status).toBe(200);const data=await panel.json();expect(data.user.email).toBe('foundation-panel@gmail.com');expect(data.addresses).toEqual([]);expect(data.plans.length).toBeGreaterThan(0);
   }
  }
  console.info('Foundation panel: session reloads complete');
  expect(users[pa].id).toBe(users[lat].id);expect(users[pa].roles).toEqual(['CLIENT']);
  const addressId=crypto.randomUUID();await db.unsafe("INSERT INTO ad507.addresses(id,code,address_type,status,name,source) VALUES($1::uuid,'AD507-ISOLATED_FOUNDATION','BUSINESS','ACTIVE','Owned historical fixture','SYSTEM')",[addressId]);
  await db.unsafe('INSERT INTO ad507.address_ownership(address_id,user_id) VALUES($1::uuid,$2::uuid)',[addressId,users[pa].id]);
  for(const host of [pa,lat]){
   const panel=(await handleUserPanel(new Request(host+'/v1/user/panel?country=PA',{headers:{cookie:cookies[host]}}),db,auth))!;expect(panel.status).toBe(200);
   const item=(await panel.json()).addresses[0];expect(item.code).toBe('AD507-ISOLATED_FOUNDATION');expect(item.countryCode).toBe('PA');expect(item.publicUrl).toBeNull();
   const foreign=(await handleUserPanel(new Request(host+'/v1/user/panel?country=CO',{headers:{cookie:cookies[host]}}),db,auth))!;expect(foreign.status).toBe(200);expect((await foreign.json()).addresses).toEqual([]);
  }
  expect((await auth.handle(new Request(lat+'/v1/auth/me',{headers:{cookie:cookies[pa]}})))!.status).toBe(401);
  expect((await auth.handle(new Request(pa+'/v1/auth/me',{headers:{cookie:cookies[lat]}})))!.status).toBe(401);
  expect((await auth.handle(new Request(lat+'/auth/logout',{method:'POST',headers:{cookie:cookies[lat],origin:pa}})))!.status).toBe(403);
  expect((await auth.handle(new Request(lat+'/auth/logout',{method:'POST',headers:{cookie:cookies[lat],origin:lat}})))!.status).toBe(204);
  expect((await auth.handle(new Request(lat+'/v1/auth/me',{headers:{cookie:cookies[lat]}})))!.status).toBe(401);
  expect((await auth.handle(new Request(pa+'/v1/auth/me',{headers:{cookie:cookies[pa]}})))!.status).toBe(200);
  await db.unsafe('UPDATE ad507.auth_sessions SET expires_at=now()-interval \'1 second\' WHERE user_id=$1::uuid',[users[pa].id]);
  expect((await handleUserPanel(new Request(pa+'/v1/user/panel',{headers:{cookie:cookies[pa]}}),db,auth))!.status).toBe(401);
  console.info('Foundation panel: ownership/logout/expiry complete');
 }finally{await db.end({timeout:2});await sql.unsafe('DROP DATABASE '+name);}
},20000);

test('email registration, verification, login and reset reuse canonical identity and revoke old sessions',async()=>{
 await sql.unsafe(readFileSync(new URL('../schema-proposals/email-auth.sql',import.meta.url),'utf8'));
 const email='pr63-'+crypto.randomUUID()+'@example.test',password='Initial-password-123',nextPassword='Recovered-password-456';
 const messages:any[]=[];
 const mailFetch=(async(_url:any,options:any)=>{messages.push(JSON.parse(options.body));return Response.json({id:'isolated-mail'});}) as typeof fetch;
 const auth=createGeneralAuth(sql,{...env,RESEND_API_KEY:'isolated-test-key',EMAIL_FROM:'Direcciones <no-reply@example.test>'},fetch,mailFetch);
 const post=(route:string,data:any)=>auth.handle(new Request(origin+'/v1/auth/email/'+route,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(data)})) as Promise<Response>;
 try{
  expect((await post('register',{email,password})).status).toBe(200);
  expect(messages.length).toBe(1);expect(messages[0].to).toEqual([email]);
  expect((await post('login',{email,password})).status).toBe(401);
  const verification=new URL(messages[0].text).searchParams.get('token');
  expect((await post('verify',{email,token:verification})).status).toBe(200);
  expect((await post('verify',{email,token:verification})).status).toBe(400);
  const login=await post('login',{email,password});expect(login.status).toBe(200);
  const cookie=login.headers.get('set-cookie')!.split(';')[0];
  const user=await auth.currentUser(new Request(origin+'/v1/auth/me',{headers:{cookie}}));expect(user?.email).toBe(email);expect(user?.roles).toContain('CLIENT');
  expect((await post('register',{email,password})).status).toBe(200);expect(messages.length).toBe(1);
  expect((await post('forgot',{email})).status).toBe(200);
  const reset=new URL(messages[1].text).searchParams.get('token');
  expect((await post('reset',{email,token:reset,password:nextPassword})).status).toBe(200);
  expect(await auth.currentUser(new Request(origin+'/v1/auth/me',{headers:{cookie}}))).toBeNull();
  expect((await post('reset',{email,token:reset,password:nextPassword})).status).toBe(400);
  expect((await post('login',{email,password})).status).toBe(401);
  expect((await post('login',{email,password:nextPassword})).status).toBe(200);
  expect((await sql.unsafe('SELECT count(*)::int AS n FROM ad507.users WHERE email=$1',[email]))[0].n).toBe(1);
  expect((await post('login',null)).status).toBe(400);
  const denied=await auth.handle(new Request(origin+'/v1/auth/email/register',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({email,password})}));expect(denied!.status).toBe(403);
 }finally{await sql.unsafe('DELETE FROM ad507.users WHERE email=$1',[email]);}
},15000);

test('panel correction: OAuth admin intent is state-bound and requires the canonical ADMIN role',async()=>{
  const adminId=crypto.randomUUID(),clientId=crypto.randomUUID();
  await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1::uuid,'panel-admin@example.test'),($2::uuid,'panel-client@gmail.com')",[adminId,clientId]);
  await sql.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'ADMIN'),($2::uuid,'CLIENT')",[adminId,clientId]);
  const flow=async(auth:ReturnType<typeof createGeneralAuth>,admin:boolean)=>{
    const begin=(await auth.handle(request('/auth/google/login'+(admin?'?returnTo=%2Fadmin':''))))!;
    expect(begin.status).toBe(302);
    return {path:'/auth/google/callback?state='+new URL(begin.headers.get('location')!).searchParams.get('state')+'&code=test',cookie:begin.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')};
  };
  const admin=createGeneralAuth(sql,env,google({sub:'panel-return-admin',email:'panel-admin@example.test',email_verified:true,hd:'example.test'}));
  const begin=await flow(admin,true),done=(await admin.handle(request(begin.path,{cookie:begin.cookie})))!;
  expect(done.status).toBe(302);expect(done.headers.get('location')).toBe(origin+'/admin');
  expect((await admin.handle(request('/v1/admin/session-check',{cookie:session(done)})))?.status).toBe(200);
  const client=createGeneralAuth(sql,env,google({sub:'panel-return-client',email:'panel-client@gmail.com',email_verified:true}));
  const clientBegin=await flow(client,true),denied=(await client.handle(request(clientBegin.path,{cookie:clientBegin.cookie})))!;
  expect(denied.status).toBe(403);expect(denied.headers.getSetCookie().some(v=>v.startsWith('ad507_session='))).toBe(false);
  const normal=await flow(client,false),normalDone=(await client.handle(request(normal.path,{cookie:normal.cookie})))!;
  expect(normalDone.headers.get('location')).toBe(origin+'/');
  const tampered=await flow(admin,true);
  expect((await admin.handle(request(tampered.path,{cookie:tampered.cookie.split('; ').filter(v=>!v.startsWith('ad507_oauth_admin=')).join('; ')})))?.status).toBe(400);
  for(const suffix of ['?returnTo=https://evil.test','?returnTo=%2Fadmin&returnTo=%2Fadmin','?returnTo=%2Fadmin&other=1'])expect((await admin.handle(request('/auth/google/login'+suffix)))?.status).toBe(400);
});

test('panel correction: owner detail and photograph are private; ADMIN reuses place review actions',async()=>{
  const {createRequestRepository}=await import('../request-repository');
  const {handleRequestRoutes}=await import('../request-routes');
  const sharp=(await import('sharp')).default;
  const clientId=crypto.randomUUID(),adminId=crypto.randomUUID();
  await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1::uuid,'panel-photo-owner@gmail.com'),($2::uuid,'panel-photo-admin@gmail.com')",[clientId,adminId]);
  await sql.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'CLIENT'),($2::uuid,'ADMIN')",[clientId,adminId]);
  const objects=new Map<string,Uint8Array>();
  const r2={accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'test',secretAccessKey:'test',configurationVerified:true as const};
  const http=(async(url:any,init:any)=>{if(init.method==='PUT'){objects.set(String(url),new Uint8Array(init.body));return new Response(null,{status:200})}const bytes=objects.get(String(url));return bytes?new Response(bytes,{headers:{'content-type':'image/webp'}}):new Response(null,{status:404});}) as typeof fetch;
  const repo=createRequestRepository(sql,{r2,fetch:http});
  const photo={role:'photo' as const,mime:'image/png',bytes:await sharp({create:{width:10,height:10,channels:3,background:'blue'}}).png().toBuffer()};
  const item=await repo.submit(clientId,'panel-detail-isolated-0000001',{countryCode:'PA',type:'PLACE',plan:'PLACE',name:'Panel fixture',reference:'Fixture reference',description:'Fixture description',latitude:8.1,longitude:-80.9},[photo]);
  const call=(path:string,user:any,method='GET')=>handleRequestRoutes(new Request(origin+path,{method,headers:{origin}}),{enabled:true,sql,auth:{currentUser:async()=>user},repository:repo,r2,fetch:http});
  const client={id:clientId,roles:['CLIENT']},admin={id:adminId,roles:['ADMIN']};
  const detail=await call('/v1/user/requests/'+item.id,client);expect(detail?.status).toBe(200);const data=(await detail!.json()).request;
  expect(data.name).toBe('Panel fixture');expect(data.status).toBe('PENDING_REVIEW');expect(data.media).toHaveLength(1);
  const outsider=crypto.randomUUID();await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1::uuid,'panel-outsider@gmail.com')",[outsider]);
  const denied=await call('/v1/user/requests/'+item.id,{id:outsider,roles:['CLIENT']});expect(denied?.status).toBe(404);
  const mediaPath='/v1/user/requests/'+item.id+'/media/'+data.media[0].id;
  expect((await call(mediaPath,client))?.headers.get('content-type')).toBe('image/webp');
  expect((await call(mediaPath,{id:outsider,roles:['CLIENT']}))?.status).toBe(404);
  expect((await call('/v1/user/requests/'+item.id,null))?.status).toBe(401);
  expect((await call('/v1/admin/requests/'+item.id,client))?.status).toBe(403);
  expect((await call('/v1/admin/requests/'+item.id,admin))?.status).toBe(200);
  expect((await call('/v1/admin/requests/'+item.id+'/approve',client,'POST'))?.status).toBe(403);
  expect((await call('/v1/admin/requests/'+item.id+'/approve',admin,'POST'))?.status).toBe(200);
  expect((await repo.read(clientId,item.id)).review).toBe('APPROVED');
  const rejected=await repo.submit(clientId,'panel-detail-isolated-0000002',{countryCode:'PA',type:'PLACE',plan:'PLACE',name:'Panel rejected fixture',reference:'Fixture reference',description:'Fixture description',latitude:8.2,longitude:-80.9},[photo]);
  expect((await call('/v1/admin/requests/'+rejected.id+'/reject',admin,'POST'))?.status).toBe(200);
  expect((await repo.read(clientId,rejected.id)).status).toBe('ARCHIVED');
});

test('client82: four ordered place photos persist privately, survive retry and reach ADMIN and public delivery',async()=>{
  const {createRequestRepository}=await import('../request-repository');
  const {createRequestMediaStorage}=await import('../request-media');
  const {newPublicAddress,renderNewPublicAddress}=await import('../new-address-publication');
  const sharp=(await import('sharp')).default;
  const owner=crypto.randomUUID(),admin=crypto.randomUUID();
  await sql.unsafe('INSERT INTO ad507.users(id,email) VALUES($1::uuid,$2),($3::uuid,$4)',[owner,owner+'@example.test',admin,admin+'@example.test']);
  await sql.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'CLIENT'),($2::uuid,'ADMIN')",[owner,admin]);
  const objects=new Map<string,Uint8Array>();
  const r2={accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'fixture',secretAccessKey:'fixture',configurationVerified:true as const};
  const http=(async(url:any,init:any={})=>{if(init.method==='PUT'){objects.set(String(url),new Uint8Array(init.body));return new Response(null,{status:200})}const bytes=objects.get(String(url));return bytes?new Response(bytes,{headers:{'content-type':'image/webp'}}):new Response(null,{status:404})}) as typeof fetch;
  const canonical={historicalRegistryVerified:true as const,reserve:async({id}:{id:string})=>'AD507-N'+id.replaceAll('-','').toUpperCase(),publish:async({id}:{id:string})=>({confirmed:true as const,receipt:'fixture:'+id})};
  const repo=createRequestRepository(sql,{r2,fetch:http,canonical,paymentEnvironment:'production'});
  const photos=await Promise.all(['red','blue','yellow','purple'].map(async background=>({role:'photo' as const,mime:'image/png',bytes:await sharp({create:{width:12,height:12,channels:3,background}}).png().toBuffer()})));
  const raw={countryCode:'PA',type:'PLACE',name:'Four photo fixture',reference:'Fixture',description:'Controlled test',latitude:8,longitude:-80};
  const item=await repo.submit(owner,'four-photo-fixture-0001',raw,photos);expect(item.status).toBe('PENDING_REVIEW');expect(objects.size).toBe(4);
  const detail=await repo.read(owner,item.id),review=await repo.read(admin,item.id);
  expect(review.media).toHaveLength(4);expect(detail.media.map((m:any)=>m.position)).toEqual([0,1,2,3]);
  expect(detail.media.every((m:any)=>m.status==='READY')).toBe(true);
  const storage=createRequestMediaStorage(sql,owner,r2,http);
  const stored=await sql.unsafe('SELECT storage_key,is_primary FROM ad507.address_media WHERE address_id=$1::uuid ORDER BY position',[item.id]);
  expect(stored.map((m:any)=>m.is_primary)).toEqual([true,false,false,false]);
  const cover=await storage.readPrivate({ownerId:owner,addressId:item.id,role:'photo',storageKey:stored[0].storage_key});
  const pixel=await sharp(cover.bytes).raw().toBuffer();expect(pixel[0]).toBeGreaterThan(200);expect(pixel[1]).toBeLessThan(30);
  // Only this isolated fixture returns to DRAFT to exercise the storage quota directly.
  await sql.unsafe("UPDATE ad507.addresses SET status='DRAFT' WHERE id=$1::uuid",[item.id]);
  const fifth=await sharp({create:{width:12,height:12,channels:3,background:'green'}}).webp().toBuffer();
  await expect(storage.storeOptimized({bytes:fifth,mime:'image/webp',ownerId:owner,addressId:item.id,role:'photo',countryCode:'PA'})).rejects.toThrow('MEDIA_LIMIT_EXCEEDED');
  await sql.unsafe("UPDATE ad507.addresses SET status='PENDING_REVIEW' WHERE id=$1::uuid",[item.id]);
  expect((await repo.submit(owner,'four-photo-fixture-0001',raw,photos)).id).toBe(item.id);expect(objects.size).toBe(4);
  await expect(repo.submit(owner,'four-photo-fixture-0002',raw,[...photos,photos[0]])).rejects.toThrow('INVALID_MEDIA');
  await repo.review(admin,item.id,'APPROVED');await repo.publish(admin,item.id);
  const record=await newPublicAddress(sql,'AD507-N'+item.id.replaceAll('-','').toUpperCase(),origin);
  expect(record!.media).toHaveLength(4);const html=renderNewPublicAddress(record!);
  const data=JSON.parse(html.match(/const data = (\{"ok":true,[^\n]+\});/)![1]);
  expect(data.fotos).toHaveLength(4);expect(data.logo).toBe(data.fotos[0]);
  for(let i=0;i<4;i++)expect(data.fotos[i]).toContain('/media/'+detail.media[i].id);
});

test('account closeout: country-bound OAuth returns to client panel and cannot switch to ADMIN or another country',async()=>{
 const host='https://direcciones.lat',id=crypto.randomUUID(),email=id+'@gmail.com';
 await sql.unsafe('INSERT INTO ad507.users(id,email) VALUES($1::uuid,$2)',[id,email]);
 await sql.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'ADMIN')",[id]);
 const cfg={...env,AD507_PUBLIC_BASE_URL:host,AD507_GOOGLE_REDIRECT_URI:host+'/auth/google/callback',AD507_AUTH_SUCCESS_URL:'/panel'};
 const auth=createGeneralAuth(sql,cfg,google({sub:'country-context-'+id,email,email_verified:true}));
 const begin=async(country:string)=>{
   const res=(await auth.handle(new Request(host+'/auth/google/login?country='+country)))!;
   expect(res.status).toBe(302);
   return {path:host+'/auth/google/callback?state='+new URL(res.headers.get('location')!).searchParams.get('state')+'&code=test',cookies:res.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};
 };
 for(const country of ['PA','CR','CO','GT','SV','HN','NI','MX']){
   const flow=await begin(country),done=(await auth.handle(new Request(flow.path,{headers:{cookie:flow.cookies}})))!;
   expect(done.status).toBe(302);expect(done.headers.get('location')).toBe(host+'/panel?country='+country);
   expect(done.headers.getSetCookie().some(c=>c.startsWith('ad507_oauth_country=;'))).toBe(true);
   const signed=session(done);
   expect((await auth.handle(new Request(host+'/v1/auth/me',{headers:{cookie:signed}})))?.status).toBe(200);
   expect((await auth.handle(new Request(host+'/auth/logout',{method:'POST',headers:{origin:host,cookie:signed}})))?.status).toBe(204);
   expect((await auth.handle(new Request(host+'/v1/auth/me',{headers:{cookie:signed}})))?.status).toBe(401);
 }
 const tamper=await begin('CR');
 const changed=tamper.cookies.replace('%7CCR','%7CCO');
 expect((await auth.handle(new Request(tamper.path,{headers:{cookie:changed}})))?.status).toBe(400);
 const stripped=tamper.cookies.split('; ').filter(v=>!v.startsWith('ad507_oauth_country=')).join('; ');
 expect((await auth.handle(new Request(tamper.path,{headers:{cookie:stripped}})))?.status).toBe(400);
 const adminCookie=tamper.cookies.split('; ').find(v=>v.startsWith('ad507_oauth_state='))!.replace('ad507_oauth_state=','ad507_oauth_admin=');
 const forgedAdmin=tamper.cookies.split('; ').filter(v=>!v.startsWith('ad507_oauth_admin=')).concat(adminCookie).join('; ');
 expect((await auth.handle(new Request(tamper.path,{headers:{cookie:forgedAdmin}})))?.status).toBe(400);
 for(const suffix of ['?country=XX','?country=CR&returnTo=%2Fadmin','?country=CR&country=PA','?country=https://evil.test'])expect((await auth.handle(new Request(host+'/auth/google/login'+suffix)))?.status).toBe(400);
 const again=await begin('CR');
 expect((await auth.handle(new Request(again.path,{headers:{cookie:again.cookies}})))?.headers.get('location')).toBe(host+'/panel?country=CR');
});

test('owner and ADMIN edit for free, preserve code/URL, audit, review locations and safely replace media',async()=>{
 const {createRequestRepository}=await import('../request-repository'),{createAddressEditing}=await import('../address-editing'),{newPublicAddress}=await import('../new-address-publication'),{handleRequestRoutes}=await import('../request-routes');
 const sharp=(await import('sharp')).default,db=postgres(isolatedDatabase,{max:8}),other=crypto.randomUUID();
 await db.unsafe("INSERT INTO ad507.users(id,email) VALUES($1::uuid,$2)",[other,other+'@test.invalid']);await db.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'CLIENT')",[other]);
 const r2={accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'test',secretAccessKey:'test',configurationVerified:true as const};
 let failPut=false;const http=(async(_url:any,init:any={})=>new Response(null,{status:init.method==='PUT'&&failPut?503:200})) as typeof fetch;
 const repo=createRequestRepository(db,{r2,fetch:http,canonical:{historicalRegistryVerified:true,reserve:async({id})=>'AD507-EDIT'+id.replaceAll('-','').toUpperCase(),publish:async({id})=>({confirmed:true,receipt:'test:'+id})}}),editor=createAddressEditing(db,{r2,fetch:http});
 const image=async(color:string,role:'logo'|'photo')=>({role,mime:'image/png',bytes:await sharp({create:{width:14,height:14,channels:3,background:color}}).png().toBuffer()});
 try{for(const [type,plan]of [['BUSINESS','BUSINESS_FREE'],['PLACE','PLACE'],['BUSINESS','BUSINESS_PREMIUM_PRO']]){
  const role=type==='PLACE'?'photo':'logo';
  const item=await repo.createAdmin(adminId,'edit-'+crypto.randomUUID(),{type,plan,name:'Edit fixture '+plan,reference:'Fixture only',latitude:8.1,longitude:-80.9},[await image('blue',role)]);
  await repo.review(adminId,item.id,'APPROVED');await repo.publish(adminId,item.id);await repo.transfer(adminId,item.id,adminId,clientId);
  let r=await repo.read(clientId,item.id);const id=r.id,code=r.code,url=r.publicUrl,version=r.version;
  await expect(editor.edit(other,id,{version,name:'Intruder'},[],false)).rejects.toThrow('REQUEST_NOT_FOUND');
  await expect(editor.edit(clientId,id,{version,name:'Fake admin'},[],true)).rejects.toThrow('REQUEST_NOT_FOUND');
  await expect(editor.history(other,id,false)).rejects.toThrow('REQUEST_NOT_FOUND');
  await expect(editor.edit(clientId,id,{version,code:'AD507-CHANGED'},[],false)).rejects.toThrow('INVALID_REQUEST');
  await expect(editor.edit(clientId,id,{version,latitude:91,longitude:0},[],false)).rejects.toThrow('INVALID_COORDINATES');
  if(plan==='BUSINESS_FREE')await expect(editor.edit(clientId,id,{version,description:'Blocked'},[],false)).rejects.toThrow('CAPABILITY_VIOLATION');
  await editor.edit(clientId,id,{version,name:'Edited '+plan,hours:'9–5',latitude:9.2,longitude:-79.5,...(plan!=='BUSINESS_FREE'?{description:'Brief updated'}:{})},[],false);
  await expect(editor.edit(clientId,id,{version,name:'Stale'},[],false)).rejects.toThrow('EDIT_CONFLICT');
  r=await repo.read(clientId,id);expect(r.code).toBe(code);expect(r.publicUrl).toBe(url);expect(Number(r.latitude)).toBe(8.1);expect(r.extras.pendingLocation.latitude).toBe(9.2);
  await expect(editor.reviewLocation(other,id,{version:r.version,requestId:r.extras.pendingLocation.requestId},true)).rejects.toThrow('REQUEST_NOT_FOUND');
  await editor.reviewLocation(adminId,id,{version:r.version,requestId:r.extras.pendingLocation.requestId},false);r=await repo.read(clientId,id);expect(Number(r.latitude)).toBe(8.1);expect(r.extras.pendingLocation).toBeUndefined();
  await editor.edit(clientId,id,{version:r.version,latitude:9.2,longitude:-79.5},[],false);r=await repo.read(clientId,id);
  await editor.reviewLocation(adminId,id,{version:r.version,requestId:r.extras.pendingLocation.requestId},true);r=await repo.read(clientId,id);expect(Number(r.latitude)).toBe(9.2);
  const oldMedia=r.media;failPut=true;await expect(editor.edit(clientId,id,{version:r.version,retainMedia:[],name:'Must not save'},[await image('red',role)],false)).rejects.toThrow('R2_UPLOAD_FAILED');
  r=await repo.read(clientId,id);expect(r.media).toEqual(oldMedia);expect(r.name).not.toBe('Must not save');failPut=false;
  await editor.edit(adminId,id,{version:r.version,retainMedia:[],name:'Final '+plan,latitude:7.9,longitude:-80.1},[await image('red',role)],true);
  r=await repo.read(clientId,id);expect(r.code).toBe(code);expect(r.media).toHaveLength(1);expect(r.media[0].id).not.toBe(oldMedia[0].id);expect(Number(r.latitude)).toBe(7.9);
  const pub=await newPublicAddress(db,code,origin);expect(pub?.name).toBe(r.name);expect(pub?.hours).toBe('9–5');expect(pub?.coordinates.latitude).toBe(7.9);expect(pub?.description).toBe(plan==='BUSINESS_FREE'?null:'Brief updated');
  const history=await editor.history(clientId,id,false);expect(history.some(h=>h.action==='ADDRESS_EDITED'&&h.before.name!==h.after.name)).toBe(true);expect(history.some(h=>h.action==='LOCATION_APPROVED')).toBe(true);expect(history.some(h=>h.action==='LOCATION_REJECTED')).toBe(true);
  const context={enabled:true,sql:db,repository:repo,r2,fetch:http,auth:{currentUser:async()=>({id:clientId,roles:['CLIENT']})} as any};
  const path='/v1/user/requests/'+id+'/edit',body=new FormData();body.append('payload',JSON.stringify({version:r.version,name:'Route edit'}));
  expect((await handleRequestRoutes(new Request(origin+path,{method:'POST',headers:{origin:'https://evil.test'},body}),context))?.status).toBe(403);
  expect((await handleRequestRoutes(new Request(origin+path,{method:'POST',headers:{origin},body}),context))?.status).toBe(200);
  expect((await handleRequestRoutes(new Request(origin+'/v1/admin/requests/'+id+'/history'),context))?.status).toBe(403);
  expect((await db.unsafe('SELECT count(*)::int AS n FROM ad507.orders WHERE address_id=$1::uuid',[id]))[0].n).toBe(0);
 }}finally{await db.end();}
},30000);
