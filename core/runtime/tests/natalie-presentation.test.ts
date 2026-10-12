import {test,expect} from 'bun:test';
import {nataliePresentationAllowed} from '../natalie-presentation';
import {commercialEntryHtml} from '../user-panel';
test('verified hosts retain widget behind TLS without widening access',()=>{
 const env={AD507_INTERNATIONAL_DOMAIN_VERIFIED:'true'};
 for(const protocol of ['http:','https:'])for(const host of ['direcciones507.com','www.direcciones507.com','direcciones.lat'])expect(nataliePresentationAllowed(new URL(protocol+'//'+host),env)).toBe(true);
 for(const url of ['https://direcciones.lat.evil.test','https://evil.test','https://direcciones.lat:8080','https://user@direcciones.lat','ftp://direcciones.lat'])expect(nataliePresentationAllowed(new URL(url),env)).toBe(false);
 expect(nataliePresentationAllowed(new URL('http://direcciones.lat'),{})).toBe(false);
});
test('internal HTTP renders preserved widget script for verified LATAM',()=>{
 const previous=process.env.AD507_INTERNATIONAL_DOMAIN_VERIFIED;
 try{process.env.AD507_INTERNATIONAL_DOMAIN_VERIFIED='true';const html=commercialEntryHtml(true,new URL('http://direcciones.lat/'));expect(html).toContain('/internal/v1/natalie/controlled-session');expect(html).not.toContain('id="natalieLauncher" disabled');}
 finally{if(previous===undefined)delete process.env.AD507_INTERNATIONAL_DOMAIN_VERIFIED;else process.env.AD507_INTERNATIONAL_DOMAIN_VERIFIED=previous;}
});
