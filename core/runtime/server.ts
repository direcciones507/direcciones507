import postgres from 'postgres';
import { createGeneralAuth } from './general-auth';
import { startLegacyCore } from './legacy';

const sql = postgres(process.env.DATABASE_URL!, { max: 2, application_name: 'ad507-core-general-auth' });
const auth = createGeneralAuth(sql, process.env);
startLegacyCore(async req => {
  const url = new URL(req.url);
  if (req.method === 'GET' && url.pathname === '/health') return Response.json({ ok: true, service: 'ad507-core' }, { headers: { 'cache-control': 'no-store' } });
  if (req.method === 'GET' && url.pathname === '/ready') {
    try {
      const rows = await sql.unsafe("SELECT to_regclass('ad507.users') IS NOT NULL AND to_regclass('ad507.user_roles') IS NOT NULL AND to_regclass('ad507.oauth_transactions') IS NOT NULL AND to_regclass('ad507.google_identities') IS NOT NULL AND to_regclass('ad507.auth_sessions') IS NOT NULL AS ready");
      const ready = rows[0]?.ready === true && auth.configured;
      return Response.json({ ok: ready, database: rows[0]?.ready === true, authConfigured: auth.configured }, { status: ready ? 200 : 503, headers: { 'cache-control': 'no-store' } });
    } catch { return Response.json({ ok: false, database: false }, { status: 503 }); }
  }
  return auth.handle(req);
});
