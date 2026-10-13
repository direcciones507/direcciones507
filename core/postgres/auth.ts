import { SQL } from 'bun';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  roles: Array<'CLIENT' | 'OPERATOR' | 'ADMIN'>;
};

type SessionPayload = { uid: string; email: string; exp: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64url');
}

function parseBase64url(value: string) {
  return new Uint8Array(Buffer.from(value, 'base64url'));
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export async function signSession(payload: SessionPayload, secret: string) {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = base64url(await hmac(secret, body));
  return body + '.' + signature;
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra) return null;
  const expected = await hmac(secret, body);
  const supplied = parseBase64url(signature);
  if (expected.length !== supplied.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ supplied[i];
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(decoder.decode(parseBase64url(body))) as SessionPayload;
    if (!payload.uid || !payload.email || !Number.isFinite(payload.exp)) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readCookie(req: Request, name: string) {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function sessionCookie(token: string, maxAgeSeconds = 60 * 60 * 8) {
  return `ad507_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie() {
  return 'ad507_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

export async function loadAuthUser(sql: SQL, userId: string): Promise<AuthUser | null> {
  const rows = await sql`
    SELECT u.id::text AS id, u.email, u.display_name,
           COALESCE(array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') AS roles
    FROM ad507.users u
    LEFT JOIN ad507.user_roles ur ON ur.user_id = u.id
    WHERE u.id = ${userId}::uuid AND u.status = 'ACTIVE'
    GROUP BY u.id, u.email, u.display_name
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: row.display_name == null ? null : String(row.display_name),
    roles: Array.from(row.roles ?? []) as AuthUser['roles'],
  };
}

export async function resolveActiveUserByEmail(sql: SQL, email: string): Promise<AuthUser | null> {
  const rows = await sql`
    SELECT u.id::text AS id, u.email, u.display_name,
           COALESCE(array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') AS roles
    FROM ad507.users u
    LEFT JOIN ad507.user_roles ur ON ur.user_id = u.id
    WHERE lower(u.email) = lower(${email}) AND u.status = 'ACTIVE'
    GROUP BY u.id, u.email, u.display_name
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: row.display_name == null ? null : String(row.display_name),
    roles: Array.from(row.roles ?? []) as AuthUser['roles'],
  };
}

export async function currentUser(req: Request, sql: SQL, secret: string) {
  const token = readCookie(req, 'ad507_session');
  if (!token) return null;
  const payload = await verifySession(token, secret);
  if (!payload) return null;
  const user = await loadAuthUser(sql, payload.uid);
  if (!user || user.email.toLowerCase() !== payload.email.toLowerCase()) return null;
  return user;
}

export function hasRole(user: AuthUser | null, role: AuthUser['roles'][number]) {
  return Boolean(user?.roles.includes(role));
}
