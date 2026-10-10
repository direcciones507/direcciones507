/** Preparation only: no database writer, upload route or storage client is connected. */
export type PreparedContacts = { phone: string | null; landlinePhone: string | null };
export function prepareContacts(phone: unknown, landlinePhone: unknown): PreparedContacts {
  const normalize = (value: unknown) => {
    const text = String(value ?? '').trim();
    if (!text) return null;
    if (!/^[+\d\s().-]+$/.test(text)) throw new Error('INVALID_PHONE');
    let digits = text.replace(/\D/g, '');
    if (digits.length === 7 || digits.length === 8) digits = '507' + digits;
    if (digits.length < 10 || digits.length > 15) throw new Error('INVALID_PHONE');
    return '+' + digits;
  };
  return { phone: normalize(phone), landlinePhone: normalize(landlinePhone) };
}
/** Signature screening only. Future server uploads MUST decode/re-encode before storage. */
export function inspectImage(bytes: Uint8Array, mime: string, size: number): boolean {
  if (!Number.isInteger(size) || size < 12 || size > 8 * 1024 * 1024 || bytes.length < 12) return false;
  const png = [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  return mime === 'image/png' ? png : mime === 'image/jpeg' ? jpeg : mime === 'image/webp' ? webp : false;
}
export function mediaCountAllowed(type: string, plan: string, count: number): boolean {
  if (!Number.isInteger(count) || count < 0) return false;
  if (type === 'PLACE') return count === 1;
  if (type === 'BUSINESS') return count === (plan === 'BUSINESS_PREMIUM_PRO' ? 6 : 1);
  return type === 'RESIDENTIAL' && count === 0;
}
/** Adapter seam, without implementation, credentials or network connection. */
export interface PreparedMediaStorage {
  storeOptimized(input: { bytes: Uint8Array; mime: 'image/jpeg' | 'image/png' | 'image/webp'; ownerId: string; addressId: string }): Promise<{ storageKey: string }>;
}
