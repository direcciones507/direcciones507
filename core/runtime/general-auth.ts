import type { Sql } from 'postgres';
import {createAccountMailer} from './account-email';
import {scrypt as scryptCallback, randomBytes as secureRandomBytes} from 'node:crypto';
import {promisify} from 'node:util';
const derivePassword=promisify(scryptCallback);

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// General identity only: authorization remains in canonical PostgreSQL roles.
// Adapted from core/postgres/auth.ts and google-auth.ts at 4cd04ade.
type Env = Record<string, string | undefined>;
type Payload = { uid: string; email: string; sid: string; exp: number; origin?: string };
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const random = () => randomBytes(32).toString('base64url');
const encoder = new TextEncoder();
const routes = new Set(['/v1/auth/email/register','/v1/auth/email/login','/v1/auth/email/verify','/v1/auth/email/forgot','/v1/auth/email/reset','/auth/google/login', '/auth/google/callback', '/auth/logout', '/v1/auth/me', '/v1/admin/session-check']);

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
  const mailer=createAccountMailer(env);
  const primary = config(env);
  // Same authenticator/client/database; explicit second callback, never proxy-derived.
  const latamCandidate=env.AD507_INTERNATIONAL_DOMAIN_VERIFIED==='true' && env.AD507_GOOGLE_REDIRECT_URI_LATAM
    ?config({...env,AD507_GOOGLE_REDIRECT_URI:env.AD507_GOOGLE_REDIRECT_URI_LATAM,AD507_AUTH_SUCCESS_URL:env.AD507_AUTH_SUCCESS_URL_LATAM??'/panel',AD507_PUBLIC_BASE_URL:'https://direcciones.lat'}):null;
  const latam=primary&&primary.origin!=='https://direcciones.lat'&&latamCandidate?.origin==='https://direcciones.lat'?latamCandidate:null;
  const cfg=primary;
  const forRequest=(req:Request)=>new URL(req.url).hostname==='direcciones.lat'&&latam?latam:primary;
  // Preserve hashes of already-issued primary-domain states; bind LATAM states to LATAM.
  const stateHash=(state:string,origin:string)=>hash(origin===primary?.origin?state:origin+'|'+state);
  const sessionOrigin=(p:Payload,origin:string)=>p.origin===origin||(p.origin===undefined&&origin===primary?.origin);
  const respond = (status: number, body: Record<string, unknown>, cookies: string[] = []) => {
    const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
    for (const c of cookies) headers.append('set-cookie', c);
    return new Response(JSON.stringify(body), { status, headers });
  };
  const clearState = () => cookie('ad507_oauth_state', '', 0);
  async function currentUser(req: Request) {
    const cfg=forRequest(req);
    if (!cfg) return null;
    const url = new URL(req.url);
    if (url.host !== new URL(cfg.origin).host || (url.protocol !== 'https:' && req.headers.get('x-forwarded-proto') !== 'https')) return null;
    const token = readCookie(req, 'ad507_session');
    const p = token ? await verify(token, cfg.secret) : null;
    if (!p || !sessionOrigin(p,cfg.origin)) return null;
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
    const cfg=forRequest(req);
    const url = new URL(req.url);
    if (!routes.has(url.pathname)) return null;
    const callback = url.pathname === '/auth/google/callback';
    if (!cfg) return respond(503, { ok: false, error: 'AUTH_NOT_CONFIGURED' }, callback ? [clearState()] : []);
    // Railway terminates TLS before Bun; never derive redirects from proxy input.
    if (url.host !== new URL(cfg.origin).host || (url.protocol !== 'https:' && req.headers.get('x-forwarded-proto') !== 'https')) return respond(400, { ok: false, error: 'AUTH_ORIGIN_DENIED' });
    const emailRoute=url.pathname.startsWith('/v1/auth/email/');
    if(emailRoute){
      if(req.method!=='POST')return respond(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
      if(req.headers.get('origin')!==cfg.origin || req.headers.get('sec-fetch-site')==='cross-site')return respond(403,{ok:false,error:'CSRF_DENIED'});
      if(!mailer.configured)return respond(503,{ok:false,error:'EMAIL_NOT_CONFIGURED'});
      const raw=await req.text();
      if(raw.length>4096)return respond(413,{ok:false,error:'INVALID_INPUT'});
      let data:Record<string,unknown>;
      try{data=JSON.parse(raw);}catch{return respond(400,{ok:false,error:'INVALID_INPUT'});}
      const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
      const password=typeof data.password==='string'?data.password:'';
      const token=typeof data.token==='string'?data.token:'';
      if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)||email.length>320)return respond(400,{ok:false,error:'INVALID_EMAIL'});
      const digest=(v:string)=>hash(v);
      const makeToken=()=>random();
      const passwordHash=async(v:string,salt?:string)=>{const actual=salt??secureRandomBytes(16).toString('hex');const derived=await derivePassword(v,Buffer.from(actual,'hex'),64) as Buffer;return 'scrypt:'+actual+':'+derived.toString('hex');};
      const validPassword=async(stored:string,v:string)=>{const parts=stored.split(':');if(parts.length!==3||parts[0]!=='scrypt'||!/^[0-9a-f]{32}$/.test(parts[1]))return false;const calculated=await passwordHash(v,parts[1]);return timingSafeEqual(Buffer.from(calculated),Buffer.from(stored));};
      const issue=async(userId:string,purpose:'VERIFY_EMAIL'|'RESET_PASSWORD')=>{
        const value=makeToken();
        await sql.unsafe("UPDATE ad507.email_auth_tokens SET consumed_at=now() WHERE user_id=$1::uuid AND purpose=$2 AND consumed_at IS NULL",[userId,purpose]);
        await sql.unsafe("INSERT INTO ad507.email_auth_tokens(token_hash,user_id,purpose,expires_at) VALUES($1,$2::uuid,$3,now()+interval '30 minutes')",[digest(value),userId,purpose]);
        return value;
      };
      if(url.pathname==='/v1/auth/email/register'){
        if(password.length<12||password.length>128)return respond(400,{ok:false,error:'WEAK_PASSWORD'});
        const existing=await sql.unsafe('SELECT id::text FROM ad507.users WHERE lower(email)=$1',[email]);
        if(existing.length)return respond(200,{ok:true,message:'IF_ELIGIBLE_EMAIL_SENT'});
        const hashed=await passwordHash(password);
        const users=await sql.unsafe("INSERT INTO ad507.users(email,status) VALUES($1,'ACTIVE') RETURNING id::text",[email]);
        const id=users[0].id;
        await sql.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'CLIENT') ON CONFLICT DO NOTHING",[id]);
        await sql.unsafe("INSERT INTO ad507.email_credentials(user_id,password_hash) VALUES($1::uuid,$2)",[id,hashed]);
        const code=await issue(id,'VERIFY_EMAIL');
        await mailer.send({to:email,subject:'Verifica tu correo de Direcciones',text:cfg.origin+'/verificar-correo?token='+encodeURIComponent(code)+'&email='+encodeURIComponent(email)});
        return respond(200,{ok:true,message:'IF_ELIGIBLE_EMAIL_SENT'});
      }
      if(url.pathname==='/v1/auth/email/forgot'){
        const users=await sql.unsafe("SELECT u.id::text FROM ad507.users u JOIN ad507.email_credentials c ON c.user_id=u.id WHERE lower(u.email)=$1 AND u.status='ACTIVE' AND c.email_verified_at IS NOT NULL",[email]);
        if(users.length){const code=await issue(users[0].id,'RESET_PASSWORD');await mailer.send({to:email,subject:'Recupera tu acceso a Direcciones',text:cfg.origin+'/recuperar-contrasena?token='+encodeURIComponent(code)+'&email='+encodeURIComponent(email)});}
        return respond(200,{ok:true,message:'IF_ELIGIBLE_EMAIL_SENT'});
      }
      if(url.pathname==='/v1/auth/email/verify'||url.pathname==='/v1/auth/email/reset'){
        if(!/^[A-Za-z0-9_-]{43}$/.test(token))return respond(400,{ok:false,error:'INVALID_TOKEN'});
        const purpose=url.pathname.endsWith('/verify')?'VERIFY_EMAIL':'RESET_PASSWORD';
        if(purpose==='RESET_PASSWORD'&&(password.length<12||password.length>128))return respond(400,{ok:false,error:'WEAK_PASSWORD'});
        const consumed=await sql.unsafe("UPDATE ad507.email_auth_tokens t SET consumed_at=now() FROM ad507.users u WHERE t.user_id=u.id AND lower(u.email)=$1 AND t.token_hash=$2 AND t.purpose=$3 AND t.consumed_at IS NULL AND t.expires_at>now() RETURNING t.user_id::text AS id",[email,digest(token),purpose]);
        if(!consumed.length)return respond(400,{ok:false,error:'INVALID_TOKEN'});
        if(purpose==='VERIFY_EMAIL')await sql.unsafe("UPDATE ad507.email_credentials SET email_verified_at=now() WHERE user_id=$1::uuid",[consumed[0].id]);
        else{await sql.unsafe("UPDATE ad507.email_credentials SET password_hash=$2,password_changed_at=now(),failed_attempts=0,locked_until=NULL WHERE user_id=$1::uuid",[consumed[0].id,await passwordHash(password)]);await sql.unsafe("UPDATE ad507.auth_sessions SET revoked_at=now() WHERE user_id=$1::uuid AND revoked_at IS NULL",[consumed[0].id]);}
        return respond(200,{ok:true});
      }
      if(url.pathname==='/v1/auth/email/login'){
        const users=await sql.unsafe("SELECT u.id::text,u.email,c.password_hash,c.email_verified_at,c.failed_attempts,c.locked_until FROM ad507.users u JOIN ad507.email_credentials c ON c.user_id=u.id WHERE lower(u.email)=$1 AND u.status='ACTIVE'",[email]);
        const user=users[0];
        if(!user||!user.email_verified_at||user.locked_until&&new Date(user.locked_until).getTime()>Date.now()||!(await validPassword(user.password_hash,password))){
          if(user)await sql.unsafe("UPDATE ad507.email_credentials SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts+1>=5 THEN now()+interval '15 minutes' ELSE locked_until END WHERE user_id=$1::uuid",[user.id]);
          return respond(401,{ok:false,error:'INVALID_CREDENTIALS'});
        }
        await sql.unsafe("UPDATE ad507.email_credentials SET failed_attempts=0,locked_until=NULL WHERE user_id=$1::uuid",[user.id]);
        const sid=random(),exp=Math.floor(Date.now()/1000)+28800;
        await sql.unsafe("INSERT INTO ad507.auth_sessions(session_hash,user_id,expires_at) VALUES($1,$2::uuid,to_timestamp($3))",[hash(sid),user.id,exp]);
        const signed=await sign({uid:user.id,email:user.email,sid,exp,origin:cfg.origin},cfg.secret);
        return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json','set-cookie':cookie('ad507_session',signed,28800),'cache-control':'no-store'}});
      }
    }
    const method = url.pathname === '/auth/logout' ? 'POST' : 'GET';
    if (req.method !== method) return respond(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    try {
      if (url.pathname === '/auth/google/login') {
        if (url.search) return respond(400, { ok: false, error: 'REDIRECT_OVERRIDE_DENIED' });
        const state = random(), binding = random(), verifier = random();
        await sql.unsafe("INSERT INTO ad507.oauth_transactions(state_hash,binding_hash,verifier,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')", [stateHash(state,cfg.origin), hash(binding), verifier]);
        const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        for (const [k, v] of Object.entries({ client_id: cfg.clientId, redirect_uri: cfg.redirect, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account', code_challenge: Buffer.from(hash(verifier), 'hex').toString('base64url'), code_challenge_method: 'S256' })) target.searchParams.set(k, v);
        return new Response(null, { status: 302, headers: { location: target.toString(), 'set-cookie': cookie('ad507_oauth_state', binding, 600), 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
      }
      if (callback) {
        const state = url.searchParams.get('state'), binding = readCookie(req, 'ad507_oauth_state');
        const fail = (status: number, error: string) => {
          if (error === 'INVALID_OAUTH_STATE') {
            const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Direcciones507</title><style>body{margin:0;font-family:system-ui;background:#f4f6f9;color:#12213a;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box}.card{max-width:460px;background:#fff;padding:28px;border-radius:18px;box-shadow:0 8px 28px #10244a18;text-align:center}a{display:inline-block;margin-top:14px;background:#0b57d0;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700}</style></head><body><main class="card"><h1>Acceso ya utilizado</h1><p>Este enlace de acceso ya fue procesado. Tu sesión puede seguir activa.</p><a href="/panel">Volver a Mi cuenta</a></main></body></html>';
            return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'set-cookie': clearState(), 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
          }
          return respond(status, { ok: false, error }, [clearState()]);
        };
        if (url.searchParams.getAll('state').length !== 1 || !state || !binding || !/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(binding)) return fail(400, 'INVALID_OAUTH_STATE');
        // Atomic database consumption works across replicas and even when Google fails.
        const consumed = await sql.unsafe("UPDATE ad507.oauth_transactions SET consumed_at=now() WHERE state_hash=$1 AND binding_hash=$2 AND consumed_at IS NULL AND expires_at>now() RETURNING verifier", [stateHash(state,cfg.origin), hash(binding)]);
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
          let users = await tx.unsafe("SELECT id::text AS id,email FROM ad507.users WHERE lower(email)=lower($1) AND status='ACTIVE' FOR UPDATE", [p.email!]);
          if (users.length === 0) {
            users = await tx.unsafe("INSERT INTO ad507.users(email,status) VALUES(lower($1),'ACTIVE') RETURNING id::text AS id,email", [p.email!]);
            await tx.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'CLIENT') ON CONFLICT DO NOTHING", [users[0].id]);
          }
          if (users.length !== 1) return null;
          const binding = await tx.unsafe('INSERT INTO ad507.google_identities(google_sub,user_id) VALUES($1,$2::uuid) ON CONFLICT DO NOTHING RETURNING user_id', [p.sub!, users[0].id]);
          return binding.length === 1 ? users[0] : null;
        });
        if (!user) return fail(403, 'ACCESS_NOT_PROVISIONED');
        const sid = random(), exp = Math.floor(Date.now() / 1000) + 28800;
        await sql.unsafe('INSERT INTO ad507.auth_sessions(session_hash,user_id,expires_at) VALUES($1,$2::uuid,to_timestamp($3))', [hash(sid), user.id, exp]);
        const signed = await sign({ uid: user.id, email: user.email, sid, exp, origin:cfg.origin }, cfg.secret);
        return new Response(null, { status: 302, headers: [['location', cfg.success], ['set-cookie', cookie('ad507_session', signed, 28800)], ['set-cookie', clearState()], ['cache-control', 'no-store'], ['referrer-policy', 'no-referrer']] });
      }
      if (url.pathname === '/auth/logout') {
        if (req.headers.get('origin') !== cfg.origin || req.headers.get('sec-fetch-site') === 'cross-site') return respond(403, { ok: false, error: 'CSRF_DENIED' });
        const token = readCookie(req, 'ad507_session');
        const p = token ? await verify(token, cfg.secret) : null;
        if (p && sessionOrigin(p,cfg.origin)) await sql.unsafe('UPDATE ad507.auth_sessions SET revoked_at=now() WHERE session_hash=$1 AND user_id=$2::uuid AND revoked_at IS NULL', [hash(p.sid), p.uid]);
        return new Response(null, { status: 204, headers: { 'set-cookie': cookie('ad507_session', '', 0), 'cache-control': 'no-store' } });
      }
      const user = await currentUser(req);
      if (!user) return respond(401, { ok: false, error: 'UNAUTHENTICATED' });
      if (url.pathname === '/v1/admin/session-check' && !user.roles.includes('ADMIN')) return respond(403, { ok: false, error: 'FORBIDDEN' });
      return respond(200, url.pathname === '/v1/admin/session-check'
        ? { ok: true, authorized: true, user: { id: user.id, email: user.email, roles: user.roles } }
        : { ok: true, user });
    } catch { return respond(503, { ok: false, error: 'AUTH_UNAVAILABLE' }, callback ? [clearState()] : []); }
  }
  return { configured: !!cfg, handle, currentUser };
}
