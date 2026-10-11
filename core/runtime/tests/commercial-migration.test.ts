import { test, expect } from 'bun:test';
import sharp from 'sharp';
import { validateHistoricalSnapshot, snapshotHash, renderCommercialBridge, verifyHistoricalPhotos, boundedHistoricalRead, verifyHistoricalCodePresent, verifyMigrationBridge } from '../commercial-migration';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const snapshot={version:44,code:'AD507-MONA_TEST',publicUrl:'https://direcciones507.com/ad507-mona_test/',coreOrigin:'https://core.example.test',type:'BUSINESS',plan:'BUSINESS_FREE',name:'Business <original>',reference:'Park',description:'Existing',commercialDescription:'Preserved commercial text',latitude:8.1,longitude:-80.9,phone:'+507 6000-0000',socials:{instagram:'https://instagram.com/original'},media:[{type:'LOGO',url:'https://direcciones507.com/assets/logo.png'},{type:'IMAGE',url:'https://direcciones507.com/assets/photo.png'}],OWNER:'opaque-owner',PIN:'opaque-pin'};
test('historical snapshot preserves fields and all photos without retroactive new-upload quotas',()=>{
  const d=validateHistoricalSnapshot(snapshot);expect(d.phone).toBe(snapshot.phone);expect(d.commercialDescription).toBe(snapshot.commercialDescription);expect(d.socials).toEqual(snapshot.socials);expect(d.media.galleryPhotos).toBe(1);
  expect(snapshotHash(snapshot)).toBe(snapshotHash(Object.fromEntries(Object.entries(snapshot).reverse())));
  for(const v of [{...snapshot,type:'RESIDENTIAL'},{...snapshot,code:'ad507-LOWER'},{...snapshot,latitude:8.1234567},{...snapshot,publicUrl:'https://example.com/wrong/'},{...snapshot,media:[{type:'LOGO',url:'http://127.0.0.1/'}]}])expect(()=>validateHistoricalSnapshot(v)).toThrow();
});
test('single-code transition reuses the maintained template and preserves canonical URL without leaking private metadata',()=>{
  const html=renderCommercialBridge(snapshot,id,snapshot.coreOrigin);expect(html).toContain('AD507-CUTOVER:'+id);expect(html).toContain(snapshot.publicUrl);expect(html).not.toContain('opaque-pin');expect(html).not.toContain('opaque-owner');expect(html).toContain('https://core.example.test/v1/addresses/AD507-MONA_TEST');expect(html).toContain('catch{const response=await fetch');
  for(const s of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(s[1])).not.toThrow();expect(()=>renderCommercialBridge(snapshot,id,'https://other.example.test')).toThrow('INVALID_PUBLIC_ORIGIN');
});
test('actual image decoding and redirect guards precede any private-target request',async()=>{
  const png=await sharp({create:{width:4,height:4,channels:3,background:'red'}}).png().toBuffer();const proof=await verifyHistoricalPhotos(snapshot,(async()=>new Response(png,{headers:{'content-type':'image/png'}})) as typeof fetch);expect(proof).toHaveLength(2);expect(proof[0].hash).toMatch(/^[a-f0-9]{64}$/);
  await expect(verifyHistoricalPhotos(snapshot,(async()=>new Response('<html>',{headers:{'content-type':'image/png'}})) as typeof fetch)).rejects.toThrow();
  let calls=0;await expect(boundedHistoricalRead(snapshot.media[0].url,(async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})}) as typeof fetch)).rejects.toThrow('INVALID_HISTORICAL_MEDIA');expect(calls).toBe(1);
});
test('rollback reads only action=list; absent codes and a forged transition page fail closed',async()=>{
  const calls:string[]=[];await verifyHistoricalCodePresent(snapshot.code,(async(url:any)=>{calls.push(String(url));return Response.json({ok:true,codes:[{codigo:snapshot.code}]})}) as typeof fetch);expect(calls.every(v=>v.endsWith('?action=list'))).toBe(true);
  await expect(verifyHistoricalCodePresent(snapshot.code,(async()=>Response.json({ok:true,codes:[]})) as typeof fetch)).rejects.toThrow('HISTORICAL_RESTORE_REQUIRED');
  const row={id,legacy_payload:snapshot,request_data:{migration:{snapshotHash:snapshotHash(snapshot),originalUrl:snapshot.publicUrl}}},html=renderCommercialBridge(snapshot,id,snapshot.coreOrigin);
  await verifyMigrationBridge(row,(async()=>new Response(html,{headers:{'content-type':'text/html'}})) as typeof fetch);
  await expect(verifyMigrationBridge(row,(async()=>new Response(html+'changed',{headers:{'content-type':'text/html'}})) as typeof fetch)).rejects.toThrow('MIGRATION_BRIDGE_NOT_VERIFIED');
});
