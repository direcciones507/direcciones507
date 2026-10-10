import { createHash, createHmac } from 'node:crypto';
import type { PreparedMediaStorage } from './panel-preparation';
import { optimizeRequestImage, MAX_IMAGE_BYTES } from './image-processing';

export type R2Settings = {
  rotationConfirmed: true;
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** Server-only configuration. Missing or malformed values disable uploads. */
export function r2Settings(env: Record<string, string | undefined>): R2Settings | null {
  // Credential presence is not evidence that the previously exposed key was revoked.
  // Set only after an operator verifies revocation and replacement; never auto-set.
  if (env.AD507_R2_CREDENTIAL_ROTATION_CONFIRMED !== 'true') return null;
  const accountId = env.R2_ACCOUNT_ID?.trim() ?? '';
  const bucket = env.R2_BUCKET?.trim() ?? '';
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() ?? '';
  if (!/^[a-f0-9]{32}$/i.test(accountId) || bucket !== 'direcciones507-media' || !accessKeyId || !secretAccessKey) return null;
  return { accountId, bucket, accessKeyId, secretAccessKey, rotationConfirmed: true };
}

const hash = (input: string | Uint8Array) => createHash('sha256').update(input).digest('hex');
const hmac = (key: string | Buffer, input: string) => createHmac('sha256', key).update(input).digest();

/** AWS Signature V4 for a private Cloudflare R2 PUT, with no extra runtime packages. */
function signedR2Request(settings: R2Settings, method: 'PUT' | 'GET' | 'DELETE', key: string, bytes: Uint8Array, mime: string, date = new Date()) {
  if (key.split('/').some(part => !part || part === '.' || part === '..' || !/^[a-zA-Z0-9_.-]+$/.test(part))) throw new Error('INVALID_STORAGE_KEY');
  const host = `${settings.accountId}.r2.cloudflarestorage.com`;
  const path = '/' + [settings.bucket, ...key.split('/')].map(encodeURIComponent).join('/');
  const dateStamp = date.toISOString().slice(0, 10).replaceAll('-', '');
  const amzDate = dateStamp + 'T' + date.toISOString().slice(11, 19).replaceAll(':', '') + 'Z';
  const payloadHash = hash(bytes);
  const canonicalHeaders = `content-type:${mime}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, hash(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac('AWS4' + settings.secretAccessKey, dateStamp), 'auto'), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return {
    url: `https://${host}${path}`,
    headers: {
      'content-type': mime,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      authorization: `AWS4-HMAC-SHA256 Credential=${settings.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

/** Compatible signer; all verbs use the same private SigV4 implementation. */
export function signedR2Put(settings: R2Settings, key: string, bytes: Uint8Array, mime: string, date = new Date()) {
  return signedR2Request(settings, 'PUT', key, bytes, mime, date);
}

export type MediaScope = { ownerId: string; addressId: string; role: 'logo' | 'photo' };
export type MediaAuthorization = (scope: MediaScope & { action: 'upload' | 'read' | 'delete'; storageKey?: string }) => Promise<boolean>;
export type MediaIntent = (scope: MediaScope & { storageKey: string }) => Promise<void>;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/** No route is enabled by constructing this adapter. Authorization must be bound to the authenticated actor. */
export function createR2Storage(settings: R2Settings, options?: { authorize: MediaAuthorization; registerIntent: MediaIntent; fetch?: typeof fetch }) {
  if (settings.rotationConfirmed !== true || settings.bucket !== 'direcciones507-media') throw new Error('R2_ROTATION_NOT_CONFIRMED');
  if (!r2Settings({ AD507_R2_CREDENTIAL_ROTATION_CONFIRMED: 'true', R2_ACCOUNT_ID: settings.accountId,
    R2_BUCKET: settings.bucket, R2_ACCESS_KEY_ID: settings.accessKeyId, R2_SECRET_ACCESS_KEY: settings.secretAccessKey })) throw new Error('INVALID_R2_SETTINGS');
  if (!options || typeof options.authorize !== 'function') throw new Error('MEDIA_AUTHORIZATION_REQUIRED');
  if (typeof options.registerIntent !== 'function') throw new Error('MEDIA_INTENT_REQUIRED');
  const http = options.fetch ?? fetch;
  async function authorize(scope: MediaScope, action: 'upload' | 'read' | 'delete', storageKey?: string) {
    if (!uuid.test(scope.ownerId) || !uuid.test(scope.addressId) || !['logo', 'photo'].includes(scope.role)) throw new Error('INVALID_MEDIA_OWNER');
    if (storageKey && !new RegExp('^addresses/' + scope.addressId + '/' + scope.role + '/[a-f0-9]{64}\\.webp$').test(storageKey)) throw new Error('INVALID_STORAGE_KEY');
    if (!await options!.authorize({ ...scope, action, storageKey })) throw new Error('MEDIA_FORBIDDEN');
  }
  async function send(method: 'PUT' | 'GET' | 'DELETE', key: string, bytes = new Uint8Array()) {
    const signed = signedR2Request(settings, method, key, bytes, 'image/webp');
    try {
      return await http(signed.url, { method, headers: signed.headers, ...(method === 'PUT' ? { body: Buffer.from(bytes) } : {}),
        redirect: 'error', signal: AbortSignal.timeout(30000) });
    } catch { throw new Error('R2_REQUEST_FAILED'); }
  }
  const storeOptimized: PreparedMediaStorage['storeOptimized'] = async input => {
    await authorize(input, 'upload');
    const processed = await optimizeRequestImage(input.bytes, input.mime);
    // Stable address/role/content key makes identical upload retries target one object.
    const key = `addresses/${input.addressId}/${input.role}/${hash(processed.bytes)}.webp`;
    // Persist the association BEFORE PUT: an ambiguous timeout still has a durable recovery key.
    await options.registerIntent({ ownerId: input.ownerId, addressId: input.addressId, role: input.role, storageKey: key });
    const response = await send('PUT', key, processed.bytes);
    if (!response.ok) throw new Error('R2_UPLOAD_FAILED');
    return { storageKey: key, bucket: settings.bucket };
  };
  return {
    storeOptimized,
    // Compatibility alias, never a second uploader or validation path.
    storePrivate: storeOptimized,
    async readPrivate(input: MediaScope & { storageKey: string }) {
      await authorize(input, 'read', input.storageKey);
      const response = await send('GET', input.storageKey);
      if (!response.ok) throw new Error('R2_READ_FAILED');
      if (response.headers.get('content-type')?.split(';')[0] !== 'image/webp' || Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) {
        await response.body?.cancel(); throw new Error('INVALID_STORED_IMAGE');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('INVALID_STORED_IMAGE');
      const chunks: Uint8Array[] = []; let length = 0;
      try {
        while (true) {
          const next = await reader.read(); if (next.done) break;
          length += next.value.length;
          if (length > MAX_IMAGE_BYTES) { await reader.cancel(); throw new Error('INVALID_STORED_IMAGE'); }
          chunks.push(next.value);
        }
      } finally { reader.releaseLock(); }
      if (length < 12) throw new Error('INVALID_STORED_IMAGE');
      return { bytes: Buffer.concat(chunks), mime: 'image/webp' as const };
    },
    async deletePrivate(input: MediaScope & { storageKey: string }) {
      await authorize(input, 'delete', input.storageKey);
      const response = await send('DELETE', input.storageKey);
      // Retrying cleanup of an already removed object is safe.
      if (!response.ok && response.status !== 404) throw new Error('R2_DELETE_FAILED');
    },
  };
}
