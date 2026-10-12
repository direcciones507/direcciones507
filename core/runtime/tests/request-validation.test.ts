import { describe, expect, test } from 'bun:test';
import { validateRequestDraft, validateRequestFiles } from '../request-validation';

const base = { type: 'BUSINESS', plan: 'BUSINESS_FREE', name: 'Tienda de prueba', reference: 'Frente al parque', description: '', latitude: 8.1, longitude: -80.9, phone: '61234567', landlinePhone: '', media: { logos: 1, placePhotos: 0, galleryPhotos: 0 } };

describe('New address draft server contract', () => {
  test('normalizes valid business input', () => {
    const data = validateRequestDraft(base);
    expect(data.phone).toBe('+50761234567');
    expect(data.plan).toBe('BUSINESS_FREE');
  });
  test('rejects missing mandatory logo, unknown plan and excess gallery', () => {
    expect(() => validateRequestDraft({ ...base, media: { logos: 0, placePhotos: 0, galleryPhotos: 0 } })).toThrow('INVALID_MEDIA');
    expect(() => validateRequestDraft({ ...base, plan: 'UNKNOWN' })).toThrow('INVALID_PLAN');
    expect(() => validateRequestDraft({ ...base, plan: 'BUSINESS_PREMIUM_PRO', media: { logos: 1, placePhotos: 0, galleryPhotos: 6 } })).toThrow('INVALID_MEDIA');
  });
  test('requires one place photograph', () => {
    expect(validateRequestDraft({ ...base, type: 'PLACE', media: { logos: 0, placePhotos: 1, galleryPhotos: 0 } }).type).toBe('PLACE');
    expect(() => validateRequestDraft({ ...base, type: 'PLACE', media: { logos: 0, placePhotos: 0, galleryPhotos: 0 } })).toThrow('INVALID_MEDIA');
  });
  test('rejects malformed location and oversized text', () => {
    expect(() => validateRequestDraft({ ...base, latitude: 100 })).toThrow('INVALID_COORDINATES');
    expect(() => validateRequestDraft({ ...base, longitude: '1.2' })).toThrow('INVALID_COORDINATES');
    expect(() => validateRequestDraft({ ...base, name: 'X'.repeat(161) })).toThrow('INVALID_NAME');
  });
  test('rejects malformed types, phones and missing reference', () => {
    expect(() => validateRequestDraft({ ...base, type: 'WRONG' })).toThrow('INVALID_TYPE');
    expect(() => validateRequestDraft({ ...base, phone: 'abc' })).toThrow('INVALID_PHONE');
    expect(() => validateRequestDraft({ ...base, reference: '' })).toThrow('INVALID_REFERENCE');
  });
});

const file = (role: 'logo' | 'photo') => ({ role, mime: 'image/png', bytes: new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]) });
test('all five products enforce counts from actual uploads even when declared counts lie', () => {
  const noMedia = { logos:0,placePhotos:0,galleryPhotos:0 };
  expect(validateRequestFiles({...base,type:'RESIDENTIAL'},[]).media).toEqual(noMedia);
  expect(()=>validateRequestFiles({...base,type:'RESIDENTIAL'},[file('photo')])).toThrow('INVALID_MEDIA');
  expect(validateRequestFiles({...base,type:'PLACE',media:noMedia},[file('photo')]).media.placePhotos).toBe(1);
  expect(()=>validateRequestFiles({...base,type:'PLACE'},[file('photo'),file('photo')])).toThrow('INVALID_MEDIA');
  for (const plan of ['BUSINESS_FREE','BUSINESS_PREMIUM']) {
    expect(validateRequestFiles({...base,plan,media:noMedia},[file('logo')]).media.logos).toBe(1);
    expect(()=>validateRequestFiles({...base,plan},[])).toThrow('INVALID_MEDIA');
    expect(()=>validateRequestFiles({...base,plan},[file('logo'),file('photo')])).toThrow('INVALID_MEDIA');
  }
  expect(validateRequestFiles({...base,plan:'BUSINESS_PREMIUM_PRO'},[file('logo'),...Array.from({length:5},()=>file('photo'))]).media.galleryPhotos).toBe(5);
  expect(()=>validateRequestFiles({...base,plan:'BUSINESS_PREMIUM_PRO'},Array.from({length:7},()=>file('photo')))).toThrow('INVALID_REQUEST');
  expect(()=>validateRequestFiles(base,[{...file('logo'),role:'other'} as any])).toThrow('INVALID_IMAGE');
});
