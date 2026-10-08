import { beforeAll, afterAll, test, expect } from 'bun:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import { createGeneralAuth } from '../general-auth';
import { userPanelHtml } from '../user-panel';
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
  for (const file of ['0000_migration_ledger.sql', '0001_core_foundation.sql', '0002_plan_catalog.sql', '0003_plan_capabilities.sql', '0005_general_google_auth.sql']) await sql.unsafe(readFileSync(new URL('db/migrations/' + file, root), 'utf8'));
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
  return fetch('http://127.0.0.1:55440' + path, { headers: { host: 'ad507-core-production.up.railway.app', 'x-forwarded-proto': 'https', ...(cookie ? { cookie } : {}) } });
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
  const redirect = await fetch('http://127.0.0.1:55440/', { redirect: 'manual', headers: { cookie: client } });
  expect(redirect.status).toBe(302); expect(redirect.headers.get('location')).toBe('/panel');
  const logout = await fetch('http://127.0.0.1:55440/auth/logout', { method: 'POST', headers: { host: 'ad507-core-production.up.railway.app', 'x-forwarded-proto': 'https', origin, cookie: client } });
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
    const res = await fetch('http://127.0.0.1:55440/v1/user/requests', { method, headers: { cookie: client, origin, 'content-type': 'application/json' }, body: JSON.stringify({ addressType: 'RESIDENTIAL', planCode: 'RESIDENTIAL', name: 'Must never exist', checkout: true, owner: true }) });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('USER_PANEL_SUBMISSION_NOT_ENABLED');
    expect((await fetch('http://127.0.0.1:55440/v1/user/panel', {method, headers:{cookie:client}})).status).toBe(405);
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
  const res = await fetch('http://127.0.0.1:55440/v1/user/panel',{headers:{host:'ad507-core-production.up.railway.app','x-forwarded-proto':'https',cookie:client,origin:'https://evil.test','sec-fetch-site':'cross-site'}});
  expect(res.status).toBe(403);
});

test('landline schema proposal persists both contacts without backfill in the isolated fixture only', async () => {
  await sql.unsafe(readFileSync(new URL('../schema-proposals/landline.sql', import.meta.url), 'utf8'));
  expect((await sql.unsafe('SELECT count(*)::int AS n FROM ad507.addresses WHERE landline_phone IS NOT NULL'))[0].n).toBe(0);
  await sql.unsafe("UPDATE ad507.addresses SET phone=$1,landline_phone=$2 WHERE code='AD507-TESTBUSINESS'", ['+50769991234','+5079981234']);
  const row = (await sql.unsafe("SELECT phone,landline_phone FROM ad507.addresses WHERE code='AD507-TESTBUSINESS'"))[0];
  expect(row).toEqual({ phone:'+50769991234',landline_phone:'+5079981234' });
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
