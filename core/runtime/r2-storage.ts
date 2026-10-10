import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { inspectImage } from './panel-preparation';

export type R2Settings = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** Server-side only. Never expose these credentials or presigned write access in public HTML. */
export function r2Settings(env: Record<string, string | undefined>): R2Settings | null {
  const accountId = env.R2_ACCOUNT_ID?.trim() ?? '';
  const bucket = env.R2_BUCKET?.trim() ?? '';
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() ?? '';
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) || !accessKeyId || !secretAccessKey) return null;
  return { accountId, bucket, accessKeyId, secretAccessKey };
}

export function createR2Storage(settings: R2Settings) {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${settings.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
    forcePathStyle: true,
  });
  return {
    /** Private object upload. No public URL is returned until delivery is configured separately. */
    async storePrivate(input: { bytes: Uint8Array; mime: string; ownerId: string; addressId: string; role: 'logo' | 'photo' }) {
      if (!/^[0-9a-f-]{36}$/i.test(input.ownerId) || !/^[0-9a-f-]{36}$/i.test(input.addressId)) throw new Error('INVALID_MEDIA_OWNER');
      if (!inspectImage(input.bytes, input.mime, input.bytes.length)) throw new Error('INVALID_IMAGE');
      const ext = input.mime === 'image/jpeg' ? 'jpg' : input.mime === 'image/png' ? 'png' : 'webp';
      const key = `addresses/${input.addressId}/${input.role}/${randomUUID()}.${ext}`;
      await client.send(new PutObjectCommand({
        Bucket: settings.bucket,
        Key: key,
        Body: input.bytes,
        ContentType: input.mime,
        CacheControl: 'private, no-store',
        Metadata: { owner: input.ownerId, address: input.addressId },
      }));
      return { storageKey: key, bucket: settings.bucket };
    },
    close() { client.destroy(); },
  };
}
