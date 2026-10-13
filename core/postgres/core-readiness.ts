export type CoreReadiness = {
  ready: boolean;
  missing: string[];
};

/**
 * Pre-cutover configuration gate. It validates presence/shape only and never
 * exposes secret values. Public feature flags may remain off during shadow
 * deployment; PostgreSQL connectivity is verified separately by health checks.
 */
export function evaluateCoreReadiness(
  env: Record<string, string | undefined> = process.env,
): CoreReadiness {
  const missing: string[] = [];

  if (!env.DATABASE_URL?.trim()) missing.push('DATABASE_URL');

  const base = env.AD507_PUBLIC_BASE_URL?.trim();
  if (!base) {
    missing.push('AD507_PUBLIC_BASE_URL');
  } else {
    try {
      const url = new URL(base);
      if (url.protocol !== 'https:') missing.push('AD507_PUBLIC_BASE_URL_HTTPS');
    } catch {
      missing.push('AD507_PUBLIC_BASE_URL_VALID');
    }
  }

  if (!env.AD507_RESIDENTIAL_PROVISIONING_SECRET?.trim()) {
    missing.push('AD507_RESIDENTIAL_PROVISIONING_SECRET');
  }

  return { ready: missing.length === 0, missing };
}
