import {test,expect} from 'bun:test';
import {createRadarIntegration,radarOrigin,normalizeRadarRequest} from '../radar/integration';
import {radarPresentation} from '../radar/presentation';
import {safeAddress,freshProperties,normalizeBounds} from '../radar/ui/ui-model.js';
const db={unsafe:async()=>{throw Error('Presentation must not access PostgreSQL')}};
const auth={currentUser:async()=>null};
test('visual routes preserve host and release gates without database access',async()=>{
 for(const path of ['/','/radar/ui/radar.js']){
  expect((await createRadarIntegration(db,auth,{})(new Request(radarOrigin+path)))?.status).toBe(503);
  expect(await createRadarIntegration(db,auth,{RADAR_ENABLED:'true'})(new Request('https://direcciones.lat'+path))).toBeNull();
  const result=await createRadarIntegration(db,auth,{RADAR_ENABLED:'true'})(new Request(radarOrigin+path));
  expect(result?.status).toBe(200);expect(result?.headers.get('content-security-policy')).toContain("object-src 'none'");
 }
});
test('every stylesheet linked by the production HTML is served by the production asset allowlist',async()=>{
 const env={RADAR_ENABLED:'true'};
 const html=await (await radarPresentation(new Request(radarOrigin+'/'),env))!.text();
 const styles=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(match=>match[1]);
 expect(styles).toContain('/radar/ui/radar-visual-v1.css');
 for(const path of styles){
  const css=await radarPresentation(new Request(radarOrigin+path),env);
  expect(css?.status).toBe(200);
  expect(css?.headers.get('content-type')).toBe('text/css; charset=utf-8');
  expect(css?.headers.get('x-content-type-options')).toBe('nosniff');
  expect(css?.headers.get('cache-control')).toBe('no-cache');
  expect((await css!.text()).length).toBeGreaterThan(0);
  const head=await radarPresentation(new Request(radarOrigin+path,{method:'HEAD'}),env);
  expect(head?.status).toBe(200);
  expect(await head!.text()).toBe('');
 }
});
test('asset allowlist rejects file probes and methods',async()=>{
 expect((await radarPresentation(new Request(radarOrigin+'/radar/ui/../schema.sql'),{RADAR_ENABLED:'true'}))).toBeNull();
 expect((await radarPresentation(new Request(radarOrigin+'/radar/ui/missing.js'),{RADAR_ENABLED:'true'}))?.status).toBe(404);
 expect((await radarPresentation(new Request(radarOrigin+'/',{method:'POST'}),{RADAR_ENABLED:'true'}))?.status).toBe(405);
});
test('account entry redirects to the existing LATAM access without rendering another card',async()=>{
 const result=await radarPresentation(new Request(radarOrigin+'/radar/account?access=1'),{RADAR_ENABLED:'true'});
 expect(result?.status).toBe(302);expect(result?.headers.get('location')).toBe('https://direcciones.lat/auth/radar');
 expect(await result!.text()).toBe('');
});
test('public links remain confined to approved HTTPS hosts',()=>{
 expect(safeAddress('https://direcciones.lat/negocio')).toBe('https://direcciones.lat/negocio');
 for(const u of ['javascript:alert(1)','https://direcciones.lat.evil.test','https://evil.test','https://user:pass@direcciones.lat','https://direcciones.lat:444'])expect(safeAddress(u)).toBeNull();
});
test('expired and future activity cannot retain a verified badge',()=>{
 const now=2e6;for(const reportedAt of [now-1800000,now+1,null]){
  const p=freshProperties({activity:'available',source:'verified_owner',reportedAt},now);expect(p.activity).toBe('unknown');expect(p.source).toBeNull();
 }
 expect(freshProperties({activity:'queue',source:'community',reportedAt:now-1},now).activity).toBe('queue');
});
test('map bounds wrap longitude and constrain latitude before API requests',()=>{
 expect(normalizeBounds([-200,-89,200,89])).toEqual([-180,-85,180,85]);
 expect(normalizeBounds([170,-1,190,1])).toEqual([170,-1,-170,1]);
});


test('Railway TLS termination preserves only the verified Radar canonical origin',async()=>{
 const env={RADAR_ENABLED:'true',AD507_RADAR_DOMAIN_VERIFIED:'true'};
 const proxy=(url:string,proto='https')=>new Request(url,{headers:{'x-forwarded-proto':proto}});
 const handler=createRadarIntegration(db,auth,env);
 const req=proxy('http://radar.direcciones.lat:8080/?utm_source=chatgpt');
 expect(normalizeRadarRequest(req,env).url).toBe(radarOrigin+'/?utm_source=chatgpt');
 expect((await handler(req))?.status).toBe(200);
 expect((await handler(proxy('http://radar.direcciones.lat/radar/ui/radar.js')))?.status).toBe(200);
 expect(await handler(proxy('http://direcciones.lat/'))).toBeNull();
 expect(await handler(proxy('http://radar.direcciones.lat.evil.test/'))).toBeNull();
 expect(await handler(proxy('http://radar.direcciones.lat:1234/'))).toBeNull();
 expect(await handler(proxy('http://radar.direcciones.lat/','http'))).toBeNull();
 expect(await createRadarIntegration(db,auth,{RADAR_ENABLED:'true'})(req)).toBeNull();
 expect((await createRadarIntegration(db,auth,{...env,RADAR_ENABLED:'false'})(req))?.status).toBe(503);
 const forged=new Request('http://direcciones.lat/',{headers:{'x-forwarded-host':'radar.direcciones.lat','x-forwarded-proto':'https'}});
 expect(await handler(forged)).toBeNull();
});

test('Radar identity uses its own favicon and canonical metadata without opening indexation',async()=>{
 const env={RADAR_ENABLED:'true'};
 const result=await radarPresentation(new Request(radarOrigin+'/?utm_source=test'),env);
 const html=await result!.text();
 expect(html).toContain('rel="canonical" href="https://radar.direcciones.lat/"');
 expect(html).toContain('rel="icon" type="image/svg+xml" href="/radar/ui/favicon.svg"');
 expect(html).toContain('property="og:url" content="https://radar.direcciones.lat/"');
 expect(html).toContain('property="og:title"');
 const structured=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
 expect(structured).not.toBeNull();
 expect(JSON.parse(structured![1])).toEqual({"@context":"https://schema.org","@type":"WebSite",name:"Radar · Direcciones LATAM",alternateName:"Radar de Direcciones507 y Direcciones LATAM",url:radarOrigin+'/',description:"Explora establecimientos y consulta la actividad de tu ciudad con Radar de Direcciones507 y Direcciones LATAM.",inLanguage:"es"});
 expect(result?.headers.get('x-robots-tag')).toBe('noindex, nofollow');
 const icon=await radarPresentation(new Request(radarOrigin+'/radar/ui/favicon.svg'),env);
 expect(icon?.status).toBe(200);
 expect(icon?.headers.get('content-type')).toBe('image/svg+xml');
 expect(await icon!.text()).toContain('<svg');
 expect((await radarPresentation(new Request(radarOrigin+'/radar/ui/favicon.svg',{method:'HEAD'}),env))?.status).toBe(200);
});

test('Radar social preview and touch icon serve fixed PNG dimensions and HEAD without exposing data',async()=>{
 const env={RADAR_ENABLED:'true'};
 const html=await (await radarPresentation(new Request(radarOrigin+'/'),env))!.text();
 expect(html).toContain('property="og:image" content="https://radar.direcciones.lat/radar/ui/radar-social-20261123.jpg"');
 expect(html).toContain('rel="apple-touch-icon" sizes="180x180"');
 for(const [asset,width,height] of [['share.png',1536,865],['apple-touch-icon.png',180,180]] as const){
  const url=radarOrigin+'/radar/ui/'+asset;
  const image=await radarPresentation(new Request(url),env);
  expect(image?.status).toBe(200);
  expect(image?.headers.get('content-type')).toBe('image/png');
  expect(image?.headers.get('x-content-type-options')).toBe('nosniff');
  const bytes=await image!.arrayBuffer(),view=new DataView(bytes);
  expect(view.getUint32(0)).toBe(0x89504e47);
  expect(view.getUint32(16)).toBe(width);expect(view.getUint32(20)).toBe(height);
  const head=await radarPresentation(new Request(url,{method:'HEAD'}),env);
  expect(head?.status).toBe(200);expect((await head!.arrayBuffer()).byteLength).toBe(0);
  expect((await radarPresentation(new Request(url),{}))?.status).toBe(503);
 }
});

test('Radar SEO remains closed by default and only exposes canonical public URL after explicit release',async()=>{
 const closed=createRadarIntegration(db,auth,{RADAR_ENABLED:'true'});
 const open=createRadarIntegration(db,auth,{RADAR_ENABLED:'true',RADAR_INDEXING_ENABLED:'true'});
 const request=(path:string,method='GET')=>new Request(radarOrigin+path,{method});
 const robots=await closed(request('/robots.txt'));
 expect(robots?.status).toBe(200);
 const rules=await robots!.text();
 for(const path of ['/v1/','/auth/','/radar/account','/panel','/admin'])expect(rules).toContain('Disallow: '+path);
 expect(rules).not.toContain('Sitemap:');
 expect((await closed(request('/sitemap.xml')))?.status).toBe(404);
 expect((await closed(request('/')))?.headers.get('x-robots-tag')).toBe('noindex, nofollow');
 expect((await open(request('/')))?.headers.get('x-robots-tag')).toBe('index, follow');
 expect((await open(request('/radar')))?.headers.get('x-robots-tag')).toBe('noindex, nofollow');
 expect(await (await open(request('/robots.txt')))!.text()).toContain('Sitemap: '+radarOrigin+'/sitemap.xml');
 const sitemap=await open(request('/sitemap.xml'));
 expect(sitemap?.status).toBe(200);
 expect(sitemap?.headers.get('content-type')).toContain('application/xml');
 expect(await sitemap!.text()).toContain('<loc>'+radarOrigin+'/</loc>');
 expect((await (await open(request('/sitemap.xml','HEAD')))!.arrayBuffer()).byteLength).toBe(0);
 expect(await open(new Request('https://direcciones.lat/sitemap.xml'))).toBeNull();
 expect((await createRadarIntegration(db,auth,{})(request('/robots.txt')))?.status).toBe(503);
});

test('Radar API and account redirect preserve noindex and no-store after SEO release',async()=>{
 const env={RADAR_ENABLED:'true',RADAR_INDEXING_ENABLED:'true',RADAR_FAVORITES_ENABLED:'true'};
 const handler=createRadarIntegration({unsafe:async()=>[]},auth,env);
 for(const [path,status] of [['/v1/radar/map?country=PA&west=-83&south=7&east=-77&north=10',200],['/v1/radar/map',400],['/v1/radar/unavailable',404],['/radar/account',302]] as const){
  const r=await handler(new Request(radarOrigin+path));
  expect(r?.status).toBe(status);
  expect(r?.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  expect(r?.headers.get('cache-control')).toContain('no-store');
 }
 const denied=await handler(new Request(radarOrigin+'/v1/radar/report',{method:'POST',headers:{origin:radarOrigin},body:'{}'}));
 expect(denied?.status).toBe(403);
 expect(denied?.headers.get('x-robots-tag')).toBe('noindex, nofollow');
 expect(denied?.headers.get('x-content-type-options')).toBe('nosniff');
 const disabled=await createRadarIntegration(db,auth,{})(new Request(radarOrigin+'/v1/radar/map'));
 expect(disabled?.status).toBe(503);
 expect(disabled?.headers.get('x-robots-tag')).toBe('noindex, nofollow');
});

test('Radar storage and identity failures return sanitized JSON with privacy headers',async()=>{
 const env={RADAR_ENABLED:'true',RADAR_INDEXING_ENABLED:'true'};
 const backendError=()=>{throw Error('internal database and account details');};
 const failedStorage=createRadarIntegration({unsafe:async()=>backendError()},auth,env);
 const failedIdentity=createRadarIntegration(db,{currentUser:async()=>backendError()},env);
 const map=new Request(radarOrigin+'/v1/radar/map?country=PA&west=-83&south=7&east=-77&north=10');
 const report=new Request(radarOrigin+'/v1/radar/report',{method:'POST',headers:{origin:radarOrigin},body:'{}'});
 for(const result of [await failedStorage(map),await failedIdentity(report)]){
  expect(result?.status).toBe(500);
  expect(result?.headers.get('cache-control')).toBe('no-store');
  expect(result?.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  expect(result?.headers.get('x-content-type-options')).toBe('nosniff');
  expect(await result!.json()).toEqual({error:'RADAR_API_UNAVAILABLE'});
 }
});
