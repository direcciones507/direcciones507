import {test,expect} from 'bun:test';
import {commercialEntryHtml,userPanelHtml} from '../user-panel';
import {bindLatamOverlays} from '../latam-presentation';
test('LATAM footer, five described plans and legal notice reuse existing content only',()=>{
 const html=commercialEntryHtml(true,new URL('https://direcciones.lat/'));
 expect(html).not.toContain('Direcciones507, presencia de Panamá');
 expect(html).not.toContain('Direcciones507 · Panamá');
 expect(html).toContain('AD507 Technologies');expect(html).toContain('id="modalPoliticas"');expect(html).toContain('data-latam-policy="privacy"');expect(html).toContain('data-latam-policy="terms"');expect(html).toContain('id="latamPolicyDialog"');
 expect(html.match(/data-latam-policy=/g)!.length).toBeGreaterThanOrEqual(2);
 expect(html).toContain('https://wa.me/50765996532');expect(html).toContain('galería de hasta 5 fotos');
 expect(userPanelHtml).not.toContain('latam-footer');
 for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
});
test('LATAM Lugar is restricted to Panama and Costa Rica',()=>{
 for(const country of ['PA','CR']){const html=commercialEntryHtml(true,new URL('https://direcciones.lat/?country='+country));expect(html).toContain('data-latam-type="PLACE"');}
 for(const country of ['CO','MX']){const html=commercialEntryHtml(true,new URL('https://direcciones.lat/?country='+country));expect(html).not.toContain('data-latam-type="PLACE"');expect(html).toContain('Prueba gratuita 1 mes');}
});
test('outside pointer closes Natalie, internal taps retain it and launcher can reopen',()=>{
 const listeners:any={};let opened=true,closed=0;
 const panel={classList:{contains:()=>opened},contains:(node:any)=>node==='inside'};
 const launcher={contains:(node:any)=>node==='launcher'};
 const close={click:()=>{opened=false;closed++;}};
 const doc={getElementById:(id:string)=>({natalieChat:panel,natalieLauncher:launcher,natalieClose:close}[id]??null),addEventListener:(key:string,fn:any)=>listeners[key]=fn,querySelectorAll:()=>[]};
 new Function('document','return ('+bindLatamOverlays.toString()+')()')(doc);
 listeners.pointerdown({target:'inside'});expect(opened).toBe(true);
 listeners.pointerdown({target:'launcher'});expect(opened).toBe(true);
 listeners.pointerdown({target:'outside'});expect(opened).toBe(false);expect(closed).toBe(1);
 opened=true;listeners.pointerdown({target:'inside'});expect(opened).toBe(true);
});
