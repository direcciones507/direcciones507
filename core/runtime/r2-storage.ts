import { createHash, createHmac, randomUUID } from 'node:crypto';
import { inspectImage } from './panel-preparation';

export type R2Settings = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** Server-only configuration. Missing or malformed values disable uploads. */
export function r2Settings(env: Record<string, string | undefined>): R2Settings | null {
  const accountId = env.R2_ACCOUNT_ID?.trim() ?? '';
  const bucket = env.R2_BUCKET?.trim() ?? '';
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() ?? '';
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) || !accessKeyId || !secretAccessKey) return null;
  return { accountId, bucket, accessKeyId, secretAccessKey };
}

const hash = (input: string | Uint8Array) => createHash('sha256').update(input).digest('hex');
const hmac = (key: string | Buffer, input: string) => createHmac('sha256', key).update(input).digest();

/** AWS Signature V4 for a private Cloudflare R2 PUT, with no extra runtime packages. */
export function signedR2Put(settings: R2Settings, key: string, bytes: Uint8Array, mime: string, date = new Date()) {
  const host = `${settings.accountId}.r2.cloudflarestorage.com`;
  const path = '/' + [settings.bucket, ...key.split('/')].map(encodeURIComponent).join('/');
  const dateStamp = date.toISOString().slice(0, 10).replaceAll('-', '');
  const amzDate = dateStamp + 'T' + date.toISOString().slice(11, 19).replaceAll(':', '') + 'Z';
  const payloadHash = hash(bytes);
  const canonicalHeaders = `content-type:${mime}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
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

export function createR2Storage(settings: R2Settings) {
  return {
    /** Private object upload; no public link or public bucket exposure. */
    async storePrivate(input: { bytes: Uint8Array; mime: string; ownerId: string; addressId: string; role: 'logo' | 'photo' }) {
      if (!/^[0-9a-f-]{36}$/i.test(input.ownerId) || !/^[0-9a-f-]{36}$/i.test(input.addressId)) throw new Error('INVALID_MEDIA_OWNER');
      if (!inspectImage(input.bytes, input.mime, input.bytes.length)) throw new Error('INVALID_IMAGE');
      const ext = input.mime === 'image/jpeg' ? 'jpg' : input.mime === 'image/png' ? 'png' : 'webp';
      const key = `addresses/${input.addressId}/${input.role}/${randomUUID()}.${ext}`;
      const signed = signedR2Put(settings, key, input.bytes, input.mime);
      const response = await fetch(signed.url, { method: 'PUT', headers: signed.headers, body: Buffer.from(input.bytes), signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('R2_UPLOAD_FAILED');
      return { storageKey: key, bucket: settings.bucket };
    },
  };
}
