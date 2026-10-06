import { SQL } from 'bun';
import { evaluateCoreReadiness } from './core-readiness';
import { evaluateCutoverGate } from './cutover-gate';
import { clearSessionCookie, currentUser, hasRole } from './auth';
import { googleCallback, googleLogin } from './google-auth';

const port = Number(process.env.PORT ?? '3000');
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('MISSING_DATABASE_URL');
}

const sql = new SQL(databaseUrl);
const sessionSecret = process.env.AD507_SESSION_SECRET?.trim();

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function databaseReady() {
  try {
    const rows = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'ad507'
          AND table_name = 'schema_migrations'
      ) AS ledger_exists
    `;
    return rows[0]?.ledger_exists === true;
  } catch {
    return false;
  }
}

Bun.serve({
  hostname: '0.0.0.0',
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(200, {
        ok: true,
        service: 'ad507-core-shadow',
        mode: 'shadow',
      });
    }

    if (req.method === 'GET' && url.pathname === '/auth/google/login') {
      return googleLogin(process.env);
    }

    if (req.method === 'GET' && url.pathname === '/auth/google/callback') {
      return googleCallback(req, sql, process.env);
    }

    if (req.method === 'POST' && url.pathname === '/auth/logout') {
      return new Response(null, { status: 204, headers: { 'set-cookie': clearSessionCookie() } });
    }

    if (req.method === 'GET' && url.pathname === '/v1/auth/me') {
      if (!sessionSecret) return json(503, { ok: false, error: 'AUTH_NOT_CONFIGURED' });
      const user = await currentUser(req, sql, sessionSecret);
      if (!user) return json(401, { ok: false, error: 'UNAUTHENTICATED' });
      return json(200, { ok: true, user });
    }

    if (req.method === 'GET' && url.pathname === '/v1/admin/session-check') {
      if (!sessionSecret) return json(503, { ok: false, error: 'AUTH_NOT_CONFIGURED' });
      const user = await currentUser(req, sql, sessionSecret);
      if (!user) return json(401, { ok: false, error: 'UNAUTHENTICATED' });
      if (!hasRole(user, 'ADMIN')) return json(403, { ok: false, error: 'FORBIDDEN' });
      return json(200, { ok: true, authorized: true, user: { id: user.id, email: user.email, roles: user.roles } });
    }

    if (req.method === 'GET' && url.pathname === '/ready') {
      const config = evaluateCoreReadiness();
      const db = await databaseReady();
      const cutover = evaluateCutoverGate();

      return json(config.ready && db ? 200 : 503, {
        ok: config.ready && db,
        service: 'ad507-core-shadow',
        mode: 'shadow',
        database: db ? 'ready' : 'not_ready',
        configuration: {
          ready: config.ready,
          missing: config.missing,
        },
        cutover: {
          allowed: cutover.allowed,
          blockers: cutover.blockers,
        },
      });
    }

    return json(404, {
      ok: false,
      error: 'ROUTE_DENIED',
      mode: 'shadow',
    });
  },
});
