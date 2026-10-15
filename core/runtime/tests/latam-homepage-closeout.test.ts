import {test,expect} from 'bun:test';
import {commercialEntryHtml,userPanelHtml} from '../user-panel';
import {bindLatamOverlays} from '../latam-presentation';
test('LATAM footer, five described plans and legal notice reuse existing content only',()=>{
 const html=commercialEntryHtml(true,new URL('https://direcciones.lat/'));
 expect(html).not.toContain('Direcciones507, presencia de Panamá');
 expect(html).not.toContain('Direcciones507 · Panamá');
 expect(html).toContain('AD507 Technologies');expect(html).toContain('id="modalPoliticas"');expect(html).toContain('data-latam-legal');
 expect(html.match(/data-latam-legal/g)!.length).toBeGreaterThanOrEqual(2);
 expect(html).toContain('https://wa.me/50765996532');expect(html).toContain('galería de hasta 5 fotos');
 expect(userPanelHtml).not.toContain('latam-footer');
 for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
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

test('responsive homepage separates hero, country selection and balanced footer without duplicating controls',async()=>{
 const html=commercialEntryHtml(true,new URL('https://direcciones.lat/'));
 const count:Record<string,number>={};
 for(const selector of ['#commercialWelcome>.latam-hero>.latam-copy','#commercialWelcome>.latam-hero>#latamArt','#commercialWelcome>#paises','.latam-footer>.latam-footer-inner>nav','#latamCreate','#commercialCountry','#natalieLauncher']){
  count[selector]=0;
  await new HTMLRewriter().on(selector,{element(){count[selector]++;}}).transform(new Response(html)).text();
  expect(count[selector]).toBe(1);
 }
 expect(html).toContain('#commercialWelcome .latam-copy{display:contents}');
 expect(html).toContain('Todo lo incluido en Negocio Gratis, código con nombre, redes sociales, código postal, zona postal y estadísticas.');
 expect(html).toContain('Todo lo incluido en Premium, descripción comercial y galería de hasta 5 fotos.');
 const countries:string[]=[];
 await new HTMLRewriter().on('[data-commercial-country]',{element(e){countries.push(e.getAttribute('data-commercial-country')!);}}).transform(new Response(html)).text();
 expect(countries).toEqual(['PA','CR','CO','MX','GT','SV','HN','NI']);
 expect(html.match(/id="latamAccess"/g)?.length).toBe(1);
});
