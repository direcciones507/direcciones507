import {test,expect} from 'bun:test';
import {commercialEntryHtml,userPanelHtml} from '../user-panel';
import {latamHeroImage} from '../latam-hero-image';
const html=()=>commercialEntryHtml(true,new URL('https://direcciones.lat/'));
test('C01/C09 public menu keeps four destinations and private addresses stay in account panel',()=>{
 const page=html(),nav=page.match(/<nav aria-label="Navegación principal">(.*?)<\/nav>/)![1];
 expect([...nav.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map(m=>m[1])).toEqual(['Inicio','Países','Planes','Ayuda']);
 expect(page).not.toContain('href="/panel#addresses"');expect(userPanelHtml).toContain('Mis direcciones y lugares');
});
test('C02/C03/C08 reuse OAuth and preserve session and error nodes',()=>{
 const page=html();expect(page).toContain('data-latam-session="guest" href="/auth/google/login"');expect(page).toContain('data-latam-session="authenticated" href="/panel"');
 expect(page).toContain('id="login" class="hidden" hidden');expect(page).toContain('id="message" role="status"');
 expect(page).toContain('latamCanPrepare=!!d.actions.prepareRequest');expect(page).toContain("if(document.getElementById('commercialCountry').value!=='PA')");
 expect(userPanelHtml).not.toContain('latamRequestDialog');expect(userPanelHtml).toContain('<h1>Mi panel</h1>');
 for(const script of page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
});
test('C04/C06/C07 retain country support and request types without another Natalie control',()=>{
 const page=html();expect(page).toContain('id="latamCountryState" hidden');expect(page).toContain('id="commercialCountry"');expect(page).toContain('id="countryCode"');expect(page).toContain('Más países');
 expect([...page.matchAll(/class="latam-plan-card"[^>]*><h3>(.*?)<\/h3>/g)].map(m=>m[1])).toEqual(['Residencial','Lugar','Negocio Gratis','Premium','Premium Pro']);
 expect(page).not.toContain('id="latamHelp"');expect(page).toContain('id="latamHelpLink"');expect(page.match(/id="natalieLauncher"/g)?.length).toBe(1);
});
test('C05 original hero is an embedded WebP image with correct MIME',()=>{
 const bytes=Buffer.from(latamHeroImage,'base64');
 expect(bytes.subarray(0,4).toString()).toBe('RIFF');
 expect(bytes.subarray(8,12).toString()).toBe('WEBP');
 expect(bytes.length).toBeGreaterThan(10000);
 expect(html()).toContain("type:'image/webp'");
});
