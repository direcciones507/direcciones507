import {createHash,createHmac} from 'node:crypto';
export type R2SigningSettings={accountId:string;bucket:string;accessKeyId:string;secretAccessKey:string};

const hash = (input: string | Uint8Array) => createHash('sha256').update(input).digest('hex');
const hmac = (key: string | Buffer, input: string) => createHmac('sha256', key).update(input).digest();

/** AWS Signature V4 for a private Cloudflare R2 PUT, with no extra runtime packages. */
export function signedR2Request(settings: R2SigningSettings, method: 'PUT' | 'GET' | 'DELETE', key: string, bytes: Uint8Array, mime: string, date = new Date()) {
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

