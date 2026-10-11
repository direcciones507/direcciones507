import sharp from 'sharp';
import { inspectImage } from './panel-preparation';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 16_000_000;

/** Decode the complete file, reject malformed/multiframe input and discard metadata. */
export async function optimizeRequestImage(bytes: Uint8Array, mime: string) {
  if (!inspectImage(bytes, mime, bytes.length)) throw new Error('INVALID_IMAGE');
  try {
    const image = sharp(Buffer.from(bytes), { failOn: 'warning', limitInputPixels: MAX_IMAGE_PIXELS });
    const metadata = await image.metadata();
    const expected = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }[mime];
    if (metadata.format !== expected || (metadata.pages ?? 1) !== 1 || !metadata.width || !metadata.height ||
        metadata.width > 8192 || metadata.height > 8192 || metadata.width * metadata.height > MAX_IMAGE_PIXELS) throw Error();
    // Sharp removes EXIF/GPS, XMP, ICC and comments unless explicitly retained.
    const optimized = await image.rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 }).toBuffer();
    if (!optimized.length || optimized.length > MAX_IMAGE_BYTES) throw Error();
    return { bytes: optimized, mime: 'image/webp' as const };
  } catch { throw new Error('INVALID_IMAGE'); }
}
