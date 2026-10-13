export function renderRobotsTxt(input: {
  origin: string;
  sitemapEnabled: boolean;
}): { status: number; contentType: string; body: string } {
  let origin: URL;
  try {
    origin = new URL(input.origin);
    if (!['https:', 'http:'].includes(origin.protocol)) throw new Error('invalid protocol');
  } catch {
    return { status: 500, contentType: 'text/plain; charset=utf-8', body: 'Internal error' };
  }

  const lines = [
    'User-agent: *',
    'Allow: /',
  ];

  if (input.sitemapEnabled) {
    lines.push(`Sitemap: ${new URL('/sitemap.xml', origin).toString()}`);
  }

  return {
    status: 200,
    contentType: 'text/plain; charset=utf-8',
    body: `${lines.join('\n')}\n`,
  };
}
