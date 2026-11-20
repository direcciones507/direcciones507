import {test,expect} from 'bun:test';
import {createRadarIntegration,radarOrigin} from '../radar/integration';
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

