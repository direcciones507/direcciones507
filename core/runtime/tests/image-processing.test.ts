import { expect, test } from 'bun:test';
import sharp from 'sharp';
import { optimizeRequestImage, MAX_IMAGE_BYTES } from '../image-processing';
import { createR2Storage } from '../r2-storage';

const settings = { accountId: 'a'.repeat(32), bucket: 'direcciones507-media', accessKeyId: 'test', secretAccessKey: 'test', rotationConfirmed: true as const };
const scope = { ownerId: '11111111-1111-4111-8111-111111111111', addressId: '22222222-2222-4222-8222-222222222222', role: 'logo' as const };
const image = () => sharp({ create: { width: 24, height: 16, channels: 4, background: '#0b57d0' } });

test('real JPG, PNG and WebP decode and become private WebP without EXIF/GPS', async () => {
  for (const [format, mime] of [['jpeg','image/jpeg'],['png','image/png'],['webp','image/webp']] as const) {
    const bytes = await image().withExif({ IFD0: { Artist: 'Private name' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '8/1 0/1 0/1' } }).toFormat(format).toBuffer();
    const processed = await optimizeRequestImage(bytes, mime);
    const metadata = await sharp(processed.bytes).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
    expect(metadata.width).toBe(24);
  }
});
test('forged/truncated image, wrong MIME, SVG and oversize payload fail before storage', async () => {
  const valid = await image().png().toBuffer();
  for (const [bytes, mime] of [[valid.subarray(0,12),'image/png'],[valid,'image/jpeg'],[new TextEncoder().encode('<svg><script>alert(1)</script></svg>'),'image/png'],[new Uint8Array(MAX_IMAGE_BYTES+1),'image/png']] as const) {
    await expect(optimizeRequestImage(bytes, mime)).rejects.toThrow('INVALID_IMAGE');
  }
});
test('pixel bombs and animated images are rejected; normal large photos shrink', async () => {
  const huge = await sharp({create:{width:5000,height:4000,channels:3,background:'white'}}).png().toBuffer();
  await expect(optimizeRequestImage(huge,'image/png')).rejects.toThrow('INVALID_IMAGE');
  const framePixels = Buffer.concat([Buffer.alloc(2*2*4, 255), Buffer.alloc(2*2*4, 0)]);
  const frames = await sharp(framePixels, {raw:{width:2,height:4,channels:4,pageHeight:2}}).webp({loop:0,delay:[100,100]}).toBuffer();
  await expect(optimizeRequestImage(frames,'image/webp')).rejects.toThrow('INVALID_IMAGE');
  const large = await sharp({create:{width:3000,height:2000,channels:3,background:'white'}}).jpeg().toBuffer();
  const optimized = await optimizeRequestImage(large,'image/jpeg');
  expect((await sharp(optimized.bytes).metadata()).width).toBe(2048);
});
test('both storage names use one uploader; repeated/concurrent uploads target one key', async () => {
  const calls: any[] = [];
  const storage = createR2Storage(settings, {registerIntent:async()=>{},authorize: async () => true, fetch: (async (url, init) => {calls.push({url,init}); return new Response(null,{status:200});}) as typeof fetch});
  expect(storage.storePrivate).toBe(storage.storeOptimized);
  const bytes = await image().png().toBuffer();
  const results = await Promise.all(Array.from({length:8}, () => storage.storeOptimized({...scope,bytes,mime:'image/png'})));
  expect(new Set(results.map(r=>r.storageKey)).size).toBe(1);
  expect(results[0].storageKey).toMatch(/\/logo\/[a-f0-9]{64}\.webp$/);
  const stored = calls[0].init.body;
  expect((await sharp(stored).metadata()).format).toBe('webp');
  expect(calls[0].init.redirect).toBe('error');
  expect(JSON.stringify(results)).not.toContain('https:');
});
test('authorization, UUID and object scope fail closed before every network operation', async () => {
  let network = 0;
  const storage = createR2Storage(settings,{registerIntent:async()=>{},authorize:async()=>false,fetch:(async()=>{network++;throw Error();}) as typeof fetch});
  const key = `addresses/${scope.addressId}/logo/${'a'.repeat(64)}.webp`;
  const bytes = await image().png().toBuffer();
  await expect(storage.storePrivate({...scope,bytes,mime:'image/png'})).rejects.toThrow('MEDIA_FORBIDDEN');
  await expect(storage.readPrivate({...scope,storageKey:key})).rejects.toThrow('MEDIA_FORBIDDEN');
  await expect(storage.deletePrivate({...scope,storageKey:key})).rejects.toThrow('MEDIA_FORBIDDEN');
  await expect(storage.readPrivate({...scope,storageKey:key.replace(scope.addressId,scope.ownerId)})).rejects.toThrow('INVALID_STORAGE_KEY');
  await expect(storage.storePrivate({...scope,ownerId:'-'.repeat(36),bytes,mime:'image/png'})).rejects.toThrow('INVALID_MEDIA_OWNER');
  expect(network).toBe(0);
  expect(()=>createR2Storage(settings)).toThrow('MEDIA_AUTHORIZATION_REQUIRED');
});
test('private reads, missing-object cleanup and sanitized upstream errors', async () => {
  const bytes = await image().webp().toBuffer();
  let status = 200;
  const calls: string[]=[];
  const storage = createR2Storage(settings,{registerIntent:async()=>{},authorize:async()=>true,fetch:(async(_url,init)=>{calls.push(init!.method!);return new Response(init!.method==='GET'?bytes:null,{status,headers:{'content-type':'image/webp'}});}) as typeof fetch});
  const input={...scope,storageKey:`addresses/${scope.addressId}/logo/${'a'.repeat(64)}.webp`};
  expect((await storage.readPrivate(input)).bytes).toEqual(bytes);
  status=404; await storage.deletePrivate(input); await storage.deletePrivate(input);
  expect(calls).toEqual(['GET','DELETE','DELETE']);
  status=500;
  await expect(storage.storeOptimized({...scope,bytes,mime:'image/webp'})).rejects.toThrow('R2_UPLOAD_FAILED');
  await expect(storage.readPrivate(input)).rejects.toThrow('R2_READ_FAILED');
  await expect(storage.deletePrivate(input)).rejects.toThrow('R2_DELETE_FAILED');
});
test('streamed private retrieval stays bounded without content-length', async () => {
  const input={...scope,storageKey:`addresses/${scope.addressId}/logo/${'a'.repeat(64)}.webp`};
  const storage=createR2Storage(settings,{registerIntent:async()=>{},authorize:async()=>true,fetch:(async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(MAX_IMAGE_BYTES));controller.enqueue(new Uint8Array(1));controller.close();}}),{headers:{'content-type':'image/webp'}})) as typeof fetch});
  await expect(storage.readPrivate(input)).rejects.toThrow('INVALID_STORED_IMAGE');
});

test('association failure prevents PUT; ambiguous upstream failure retains the recovery intention', async () => {
  let uploads=0, linked:string|undefined;
  const bytes=await image().png().toBuffer();
  const http=(async()=>{uploads++;throw Error('upstream timeout');}) as typeof fetch;
  const refused=createR2Storage(settings,{authorize:async()=>true,registerIntent:async()=>{throw Error('ASSOCIATION_FAILED');},fetch:http});
  await expect(refused.storeOptimized({...scope,bytes,mime:'image/png'})).rejects.toThrow('ASSOCIATION_FAILED');
  expect(uploads).toBe(0);
  const recoverable=createR2Storage(settings,{authorize:async()=>true,registerIntent:async intent=>{linked=intent.storageKey;},fetch:http});
  await expect(recoverable.storeOptimized({...scope,bytes,mime:'image/png'})).rejects.toThrow('R2_REQUEST_FAILED');
  expect(linked).toMatch(/\.webp$/);
  expect(uploads).toBe(1);
});
