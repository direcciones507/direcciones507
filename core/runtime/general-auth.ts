import type { Sql } from 'postgres';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// General identity only: authorization remains in canonical PostgreSQL roles.
// Adapted from core/postgres/auth.ts and google-auth.ts at 4cd04ade.
type Env = Record<string, string | undefined>;
type Payload = { uid: string; email: string; sid: string; exp: number };
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const random = () => randomBytes(32).toString('base64url');
const encoder = new TextEncoder();
const routes = new Set(['/auth/google/login', '/auth/google/callback', '/auth/logout', '/v1/auth/me', '/v1/admin/session-check']);

function cookie(name: string, value: string, age: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
}
function readCookie(req: Request, name: string) {
  try {
    const parts = (req.headers.get('cookie') ?? '').split(';').map(s => s.trim());
    const matches = parts.filter(s => s.startsWith(name + '='));
    return matches.length === 1 ? decodeURIComponent(matches[0].slice(name.length + 1)) : null;
  } catch { return null; }
}
async function signature(body: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Buffer.from(await crypto.subtle.sign('HMAC', key, encoder.encode(body)));
}
async function sign(payload: Payload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body + '.' + (await signature(body, secret)).toString('base64url');
}
async function verify(token: string, secret: string): Promise<Payload | null> {
  try {
    if (token.length > 2048) return null;
    const [body, sig, extra] = token.split('.');
    if (!body || !sig || extra) return null;
    const expected = await signature(body, secret), supplied = Buffer.from(sig, 'base64url');
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as Payload;
    if (!/^[0-9a-f-]{36}$/i.test(p.uid) || typeof p.email !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(p.sid) || !Number.isFinite(p.exp) || p.exp <= Date.now() / 1000) return null;
    return p;
  } catch { return null; }
}
function config(env: Env) {
  const clientId = env.AD507_GOOGLE_CLIENT_ID?.trim(), clientSecret = env.AD507_GOOGLE_CLIENT_SECRET?.trim(), secret = env.AD507_SESSION_SECRET?.trim();
  if (!clientId || !clientSecret || !secret || secret.length < 32 || !env.AD507_GOOGLE_REDIRECT_URI || !env.AD507_AUTH_SUCCESS_URL) return null;
  try {
    const redirect = new URL(env.AD507_GOOGLE_REDIRECT_URI);
    if (redirect.protocol !== 'https:' || redirect.username || redirect.password || redirect.search || redirect.hash || redirect.pathname !== '/auth/google/callback') return null;
    const success = new URL(env.AD507_AUTH_SUCCESS_URL, redirect.origin);
    if (success.protocol !== 'https:' || success.origin !== redirect.origin || success.username || success.password || success.hash) return null;
    if (env.AD507_PUBLIC_BASE_URL && new URL(env.AD507_PUBLIC_BASE_URL).origin !== redirect.origin) return null;
    return { clientId, clientSecret, secret, redirect: redirect.toString(), origin: redirect.origin, success: success.toString() };
  } catch { return null; }
}
export function createGeneralAuth(sql: Sql, env: Env, googleFetch: typeof fetch = fetch) {
  const cfg = config(env);
  const respond = (status: number, body: Record<string, unknown>, cookies: string[] = []) => {
    const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
    for (const c of cookies) headers.append('set-cookie', c);
    return new Response(JSON.stringify(body), { status, headers });
  };
  const clearState = () => cookie('ad507_oauth_state', '', 0);
  async function currentUser(req: Request) {
    if (!cfg) return null;
    const token = readCookie(req, 'ad507_session');
    const p = token ? await verify(token, cfg.secret) : null;
    if (!p) return null;
    const rows = await sql.unsafe(`SELECT u.id::text AS id,u.email,u.display_name,
      COALESCE(array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL),'{}') AS roles
      FROM ad507.auth_sessions s JOIN ad507.users u ON u.id=s.user_id
      LEFT JOIN ad507.user_roles ur ON ur.user_id=u.id
      WHERE s.session_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()
      AND u.id=$2::uuid AND u.status='ACTIVE' GROUP BY u.id,u.email,u.display_name`, [hash(p.sid), p.uid]);
    const u = rows[0];
    if (!u || u.email.toLowerCase() !== p.email.toLowerCase()) return null;
    return { id: u.id, email: u.email, displayName: u.display_name, roles: Array.from(u.roles) };
  }
  async function handle(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    if (!routes.has(url.pathname)) return null;
    const callback = url.pathname === '/auth/google/callback';
    if (!cfg) return respond(503, { ok: false, error: 'AUTH_NOT_CONFIGURED' }, callback ? [clearState()] : []);
    // Railway terminates TLS before Bun; never derive redirects from proxy input.
    if (url.host !== new URL(cfg.origin).host || (url.protocol !== 'https:' && req.headers.get('x-forwarded-proto') !== 'https')) return respond(400, { ok: false, error: 'AUTH_ORIGIN_DENIED' });
    const method = url.pathname === '/auth/logout' ? 'POST' : 'GET';
    if (req.method !== method) return respond(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    try {
      if (url.pathname === '/auth/google/login') {
        if (url.search) return respond(400, { ok: false, error: 'REDIRECT_OVERRIDE_DENIED' });
        const state = random(), binding = random(), verifier = random();
        await sql.unsafe("INSERT INTO ad507.oauth_transactions(state_hash,binding_hash,verifier,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')", [hash(state), hash(binding), verifier]);
        const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        for (const [k, v] of Object.entries({ client_id: cfg.clientId, redirect_uri: cfg.redirect, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account', code_challenge: Buffer.from(hash(verifier), 'hex').toString('base64url'), code_challenge_method: 'S256' })) target.searchParams.set(k, v);
        return new Response(null, { status: 302, headers: { location: target.toString(), 'set-cookie': cookie('ad507_oauth_state', binding, 600), 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
      }
      if (callback) {
        const state = url.searchParams.get('state'), binding = readCookie(req, 'ad507_oauth_state');
        const fail = (status: number, error: string) => respond(status, { ok: false, error }, [clearState()]);
        if (url.searchParams.getAll('state').length !== 1 || !state || !binding || !/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(binding)) return fail(400, 'INVALID_OAUTH_STATE');
        // Atomic database consumption works across replicas and even when Google fails.
        const consumed = await sql.unsafe("UPDATE ad507.oauth_transactions SET consumed_at=now() WHERE state_hash=$1 AND binding_hash=$2 AND consumed_at IS NULL AND expires_at>now() RETURNING verifier", [hash(state), hash(binding)]);
        if (consumed.length !== 1) return fail(400, 'INVALID_OAUTH_STATE');
        const code = url.searchParams.get('code');
        if (url.searchParams.has('error') || url.searchParams.getAll('code').length !== 1 || !code || code.length > 4096) return fail(400, 'OAUTH_DENIED');
        const tokenResponse = await googleFetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: cfg.redirect, grant_type: 'authorization_code', code_verifier: consumed[0].verifier }), signal: AbortSignal.timeout(10000) });
        if (!tokenResponse.ok) return fail(401, 'OAUTH_TOKEN_FAILED');
        const token = await tokenResponse.json() as { access_token?: string };
        if (!token.access_token) return fail(401, 'OAUTH_TOKEN_FAILED');
        const profileResponse = await googleFetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(10000) });
        if (!profileResponse.ok) return fail(401, 'OAUTH_PROFILE_FAILED');
        const p = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; hd?: string };
        if (typeof p.sub !== 'string' || !p.sub || p.sub.length > 255 || typeof p.email !== 'string' || p.email.length > 320 || p.email_verified !== true) return fail(403, 'EMAIL_NOT_VERIFIED');
        const user = await sql.begin(async tx => {
          await tx.unsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [p.sub!]);
          const linked = await tx.unsafe("SELECT u.id::text AS id,u.email,u.status FROM ad507.google_identities g JOIN ad507.users u ON u.id=g.user_id WHERE g.google_sub=$1", [p.sub!]);
          if (linked.length) return linked[0].status === 'ACTIVE' && linked[0].email.toLowerCase() === p.email!.toLowerCase() ? linked[0] : null;
          // Google is not authoritative for arbitrary third-party email addresses.
          const domain = p.email!.split('@')[1]?.toLowerCase();
          if (domain !== 'gmail.com' && !(p.hd && p.hd.toLowerCase() === domain)) return null;
          const users = await tx.unsafe("SELECT id::text AS id,email FROM ad507.users WHERE lower(email)=lower($1) AND status='ACTIVE' FOR UPDATE", [p.email!]);
          if (users.length !== 1) return null;
          const binding = await tx.unsafe('INSERT INTO ad507.google_identities(google_sub,user_id) VALUES($1,$2::uuid) ON CONFLICT DO NOTHING RETURNING user_id', [p.sub!, users[0].id]);
          return binding.length === 1 ? users[0] : null;
        });
        if (!user) return fail(403, 'ACCESS_NOT_PROVISIONED');
        const sid = random(), exp = Math.floor(Date.now() / 1000) + 28800;
        await sql.unsafe('INSERT INTO ad507.auth_sessions(session_hash,user_id,expires_at) VALUES($1,$2::uuid,to_timestamp($3))', [hash(sid), user.id, exp]);
        const signed = await sign({ uid: user.id, email: user.email, sid, exp }, cfg.secret);
        return new Response(null, { status: 302, headers: [['location', cfg.success], ['set-cookie', cookie('ad507_session', signed, 28800)], ['set-cookie', clearState()], ['cache-control', 'no-store'], ['referrer-policy', 'no-referrer']] });
      }
      if (url.pathname === '/auth/logout') {
        if (req.headers.get('origin') !== cfg.origin || req.headers.get('sec-fetch-site') === 'cross-site') return respond(403, { ok: false, error: 'CSRF_DENIED' });
        const token = readCookie(req, 'ad507_session');
        const p = token ? await verify(token, cfg.secret) : null;
        if (p) await sql.unsafe('UPDATE ad507.auth_sessions SET revoked_at=now() WHERE session_hash=$1 AND user_id=$2::uuid AND revoked_at IS NULL', [hash(p.sid), p.uid]);
        return new Response(null, { status: 204, headers: { 'set-cookie': cookie('ad507_session', '', 0), 'cache-control': 'no-store' } });
      }
      const user = await currentUser(req);
      if (!user) return respond(401, { ok: false, error: 'UNAUTHENTICATED' });
      if (url.pathname === '/v1/admin/session-check' && !user.roles.includes('ADMIN')) return respond(403, { ok: false, error: 'FORBIDDEN' });
      return respond(200, { ok: true, user });
    } catch { return respond(503, { ok: false, error: 'AUTH_UNAVAILABLE' }, callback ? [clearState()] : []); }
  }
  return { configured: !!cfg, handle };
}
