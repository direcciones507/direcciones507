import { buildRobotsTxt } from './robots-txt';

export function automaticRobotsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AD507_AUTOMATIC_ROBOTS_ENABLED === 'true';
}

/** Future /robots.txt handler. Kept dark until the Core public SEO surface is enabled. */
export function handleAutomaticRobots(env: Record<string, string | undefined> = process.env) {
  if (!automaticRobotsEnabled(env)) {
    return {
      status: 404,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok: false, code: 'NOT_AVAILABLE' }),
    };
  }

  const robots = buildRobotsTxt(env.AD507_PUBLIC_BASE_URL ?? '');
  if (!robots) {
    return {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok: false, code: 'INVALID_PUBLIC_BASE_URL' }),
    };
  }

  return {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=900',
    },
    body: robots,
  };
}
