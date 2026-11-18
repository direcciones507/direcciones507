import { createPagaditoRestClient } from './pagadito-rest-client';

/**
 * Sandbox-only configuration. Never select production through these flags.
 * The transport remains disconnected from routes until order reconciliation,
 * PCI review and sandbox certification are complete.
 */
export function pagaditoSandboxConfiguration(env: Record<string, string | undefined>) {
  if (env.AD507_PAGADITO_ENABLED !== 'true') return null;
  if (env.AD507_PAGADITO_ENVIRONMENT !== 'sandbox') return null;
  const uid = (env.AD507_PAGADITO_SANDBOX_UID ?? env.AD507_PAGADITO_UID)?.trim();
  const wsk = (env.AD507_PAGADITO_SANDBOX_WSK ?? env.AD507_PAGADITO_WSK)?.trim();
  if (!uid || !wsk || uid.length > 512 || wsk.length > 2048)
    throw new Error('INVALID_PAGADITO_SANDBOX_CONFIGURATION');
  return { environment: 'sandbox' as const, uid, wsk };
}

export function createPagaditoSandboxClient(env: Record<string, string | undefined>) {
  const config = pagaditoSandboxConfiguration(env);
  return config ? createPagaditoRestClient(config) : null;
}
