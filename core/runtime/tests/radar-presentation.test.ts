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
 expect(result?.headers.get('x-robots-tag')).toBe('noindex, nofollow');
 const icon=await radarPresentation(new Request(radarOrigin+'/radar/ui/favicon.svg'),env);
 expect(icon?.status).toBe(200);
 expect(icon?.headers.get('content-type')).toBe('image/svg+xml');
 expect(await icon!.text()).toContain('<svg');
 expect((await radarPresentation(new Request(radarOrigin+'/radar/ui/favicon.svg',{method:'HEAD'}),env))?.status).toBe(200);
});
