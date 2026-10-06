import { SQL } from 'bun';
import { resolveActiveUserByEmail, signSession, sessionCookie } from './auth';

function cookie(name: string, value: string, maxAge = 600) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function readCookie(req: Request, name: string) {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function googleLogin(env: Record<string, string | undefined>) {
  const clientId = env.AD507_GOOGLE_CLIENT_ID?.trim();
  const redirectUri = env.AD507_GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !redirectUri) return new Response('AUTH_NOT_CONFIGURED', { status: 503 });
  const state = crypto.randomUUID();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return new Response(null, { status: 302, headers: { location: url.toString(), 'set-cookie': cookie('ad507_oauth_state', state) } });
}

export async function googleCallback(req: Request, sql: SQL, env: Record<string, string | undefined>) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = readCookie(req, 'ad507_oauth_state');
  const clientId = env.AD507_GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.AD507_GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = env.AD507_GOOGLE_REDIRECT_URI?.trim();
  const sessionSecret = env.AD507_SESSION_SECRET?.trim();
  const successUrl = env.AD507_AUTH_SUCCESS_URL?.trim() || '/';

  if (!code || !state || !expectedState || state !== expectedState) return new Response('INVALID_OAUTH_STATE', { status: 400 });
  if (!clientId || !clientSecret || !redirectUri || !sessionSecret) return new Response('AUTH_NOT_CONFIGURED', { status: 503 });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  if (!tokenResponse.ok) return new Response('OAUTH_TOKEN_FAILED', { status: 401 });
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) return new Response('OAUTH_TOKEN_FAILED', { status: 401 });

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) return new Response('OAUTH_PROFILE_FAILED', { status: 401 });
  const profile = await profileResponse.json() as { email?: string; email_verified?: boolean };
  if (!profile.email || profile.email_verified !== true) return new Response('EMAIL_NOT_VERIFIED', { status: 403 });

  const user = await resolveActiveUserByEmail(sql, profile.email);
  if (!user) return new Response('ACCESS_NOT_PROVISIONED', { status: 403 });

  const signed = await signSession({
    uid: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  }, sessionSecret);

  return new Response(null, {
    status: 302,
    headers: [
      ['location', successUrl],
      ['set-cookie', sessionCookie(signed)],
      ['set-cookie', cookie('ad507_oauth_state', '', 0)],
    ],
  });
}
