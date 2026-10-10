import { prepareContacts, validateRequestMedia } from './panel-preparation';

export type RequestDraft = {
  type: 'RESIDENTIAL' | 'PLACE' | 'BUSINESS';
  plan: string;
  name: string;
  reference: string;
  description: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  landlinePhone: string | null;
  media: { logos: number; placePhotos: number; galleryPhotos: number };
};

/** Strict server contract for new address requests. Never creates or publishes an address. */
export function validateRequestDraft(raw: unknown): RequestDraft {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('INVALID_REQUEST');
  const value = raw as Record<string, unknown>;
  const type = value.type;
  if (type !== 'RESIDENTIAL' && type !== 'PLACE' && type !== 'BUSINESS') throw new Error('INVALID_TYPE');
  const plan = type === 'RESIDENTIAL' ? 'RESIDENTIAL' : type === 'PLACE' ? 'PLACE' : value.plan;
  if (typeof plan !== 'string') throw new Error('INVALID_PLAN');
  if (type === 'BUSINESS' && !['BUSINESS_FREE', 'BUSINESS_PREMIUM', 'BUSINESS_PREMIUM_PRO'].includes(plan)) throw new Error('INVALID_PLAN');
  const field = (key: string, max: number, required: boolean) => {
    if (value[key] !== undefined && typeof value[key] !== 'string') throw new Error('INVALID_' + key.toUpperCase());
    const result = String(value[key] ?? '').trim();
    if (result.length > max || (required && !result)) throw new Error('INVALID_' + key.toUpperCase());
    return result;
  };
  const name = field('name', 160, true);
  const reference = field('reference', 1000, true);
  const description = field('description', 4000, false);
  const latitude = value.latitude, longitude = value.longitude;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('INVALID_COORDINATES');
  const { phone, landlinePhone } = prepareContacts(value.phone, value.landlinePhone);
  const media = value.media;
  if (!media || typeof media !== 'object' || Array.isArray(media)) throw new Error('INVALID_MEDIA');
  const m = media as Record<string, unknown>;
  if (typeof m.logos !== 'number' || typeof m.placePhotos !== 'number' || typeof m.galleryPhotos !== 'number' ||
      !validateRequestMedia(type, plan, { logos: m.logos, placePhotos: m.placePhotos, galleryPhotos: m.galleryPhotos })) throw new Error('INVALID_MEDIA');
  return { type, plan, name, reference, description, latitude, longitude, phone, landlinePhone,
    media: { logos: m.logos, placePhotos: m.placePhotos, galleryPhotos: m.galleryPhotos } };
}
