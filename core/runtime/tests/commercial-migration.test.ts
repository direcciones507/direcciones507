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

test('existing Pages source demonstrates removal/restoration and the two pinned-code exceptions on isolated inputs',()=>{
  const {readFileSync}=require('node:fs');const workflow=readFileSync(new URL('../../../.github/workflows/generate.yml',import.meta.url),'utf8');
  const jq=workflow.split("          jq '\n")[1].split("          ' codes.json > codes.public.json")[0];
  const run=(codes:any[])=>{const p=Bun.spawnSync(['jq',jq],{stdin:Buffer.from(JSON.stringify({ok:true,codes}))});expect(p.exitCode).toBe(0);return JSON.parse(p.stdout.toString()).codes.map((v:any)=>v.codigo);};
  const present=[{codigo:'AD507-SAFEIMPORT',plan:'Negocio Premium'},{codigo:'AD507-MONASANFRANCISCO',plan:'Negocio'}];
  expect(run(present)).toContain('AD507-SAFEIMPORT');expect(run(present.filter(v=>v.codigo!=='AD507-SAFEIMPORT'))).not.toContain('AD507-SAFEIMPORT');expect(run(present)).toContain('AD507-SAFEIMPORT');
  expect(run([])).toContain('AD507-MONASANFRANCISCO');expect(run([])).toContain('AD507-MONACOSTADELESTE');
});
test('existing publisher overlay is absent by default and applies only one verified code with both preserved routes',async()=>{
  const {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {createHash}=await import('node:crypto');
  const {applyCommercialCutover}=await import('../../../scripts/apply-commercial-cutover.mjs');const dir=mkdtempSync(join(tmpdir(),'ad507-cutover-'));const out=join(dir,'out');
  try{
    expect(applyCommercialCutover(dir,out)).toBe(false);for(const code of [snapshot.code,snapshot.code.toLowerCase()]){mkdirSync(join(out,code),{recursive:true});writeFileSync(join(out,code,'index.html'),'legacy');}
    mkdirSync(join(dir,'commercial-cutovers'));const html=renderCommercialBridge(snapshot,id,snapshot.coreOrigin);writeFileSync(join(dir,'commercial-cutovers',snapshot.code+'.html'),html);
    const manifest={version:1,code:snapshot.code,id,snapshotHash:snapshotHash(snapshot),htmlPath:'commercial-cutovers/'+snapshot.code+'.html',htmlSha256:createHash('sha256').update(html).digest('hex')};writeFileSync(join(dir,'commercial-cutover.json'),JSON.stringify(manifest));
    expect(applyCommercialCutover(dir,out)).toBe(true);for(const code of [snapshot.code,snapshot.code.toLowerCase()])expect(readFileSync(join(out,code,'index.html'),'utf8')).toBe(html);
    writeFileSync(join(dir,'commercial-cutovers',snapshot.code+'.html'),'changed');expect(()=>applyCommercialCutover(dir,out)).toThrow('INVALID_CUTOVER_ARTIFACT');expect(readFileSync(join(out,snapshot.code,'index.html'),'utf8')).toBe(html);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('the generated transport really selects PostgreSQL and returns to PLANES on suspension or failure',async()=>{
  const html=renderCommercialBridge(snapshot,id,snapshot.coreOrigin),fragment=html.match(/let data;try\{[\s\S]*?data=await response.json\(\);\}/)![0];
  const execute=new Function('fetch','CODE','WEBAPP_URL','AbortSignal','return (async()=>{'+fragment+';return data;})()');
  const legacy={ok:true,nombre:'Legacy'},publicAddress={code:snapshot.code,name:'PostgreSQL',coordinates:{latitude:8,longitude:-80},media:[],socials:[],extras:{}};
  const calls:string[]=[];const http=(active:boolean)=>(async(url:string)=>{calls.push(url);return url.includes('/v1/addresses/')?active?Response.json({ok:true,address:publicAddress}):new Response(null,{status:404}):Response.json(legacy);});
  expect((await execute(http(true),snapshot.code,'https://script.google.com/official',AbortSignal)).nombre).toBe('PostgreSQL');expect(calls).toHaveLength(1);calls.length=0;
  expect(await execute(http(false),snapshot.code,'https://script.google.com/official',AbortSignal)).toEqual(legacy);expect(calls).toHaveLength(2);expect(calls[1]).toContain('?code='+snapshot.code);
});
