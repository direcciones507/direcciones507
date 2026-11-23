import {test,expect} from 'bun:test';
import {userPanelPresentation,userPanelHtml,handleUserPanel} from '../user-panel';

test('LATAM presentation changes display brand while Panama and execution logic retain their authority',()=>{
 const latam=userPanelPresentation(new URL('https://direcciones.lat/panel'));
 expect(latam).toContain('<title>Direcciones LATAM | Mi cuenta</title>');
 expect(latam).toContain('Aún no tienes Direcciones LATAM vinculadas.');
 expect(latam).toContain('Preparar Dirección LATAM de negocio');
 for(const host of ['direcciones507.com','cuenta.direcciones507.com'])expect(userPanelPresentation(new URL('https://'+host+'/panel'))).toBe(userPanelHtml);
 const scripts=(html:string)=>[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 expect(scripts(latam).map(s=>s.replace('const commercialInitialCountry="PA";','').replaceAll('Aún no tienes Direcciones LATAM vinculadas.','Aún no tienes Direcciones507 vinculadas.').replaceAll('Preparar Dirección LATAM Residencial','Preparar Dirección507 Residencial').replaceAll('Preparar Dirección LATAM de negocio','Preparar Dirección507 de negocio'))).toEqual(scripts(userPanelHtml));
 expect(latam).toContain('id="send" type="button" disabled');
 expect(latam).toContain('https://direcciones507.com/assets/icon-192.png');
});

test('existing LATAM panel route applies display brand and preserves CSP nonce for every script',async()=>{
 const response=await handleUserPanel(new Request('https://direcciones.lat/panel'),{} as any,{currentUser:async()=>({id:'visual-test',roles:['CLIENT']})} as any);
 expect(response!.status).toBe(200);const html=await response!.text();expect(html).toContain('<h1>Mi cuenta</h1>');
 const csp=response!.headers.get('content-security-policy')!;let count=0;
 await new HTMLRewriter().on('script',{element(e){count++;expect(csp).toContain("'nonce-"+e.getAttribute('nonce')+"'");}}).transform(new Response(html)).text();
 expect(count).toBeGreaterThan(0);
});

test('owner map assets are narrowly allowed only on account panel',async()=>{
 const response=await handleUserPanel(new Request('https://direcciones.lat/panel'),{} as any,{currentUser:async()=>({id:'map-test',roles:['CLIENT']})} as any);
 const csp=response!.headers.get('content-security-policy')!;
 expect(csp).toContain('https://radar.direcciones.lat/radar/ui/vendor/leaflet.js');
 expect(csp).toContain('https://radar.direcciones.lat/radar/ui/vendor/leaflet.css');
 expect(csp).toContain("'nonce-");
 expect(csp).not.toContain("'unsafe-eval'");
});

test('anonymous shared panel stays on the panel behind Railway TLS and retains only a configured country',async()=>{
 for(const [country,expected]of [['CR','CR'],['https://evil.test','PA']]){
  const response=await handleUserPanel(new Request('http://direcciones.lat/panel?country='+encodeURIComponent(country)),{} as any,{currentUser:async()=>null} as any);
  expect(response!.status).toBe(200);
  expect(response!.headers.get('location')).toBeNull();
  expect(await response!.text()).toContain('const commercialInitialCountry='+JSON.stringify(expected)+';');
 }
});


test('Radar establishments are placed before addresses, new direction form, and event entry on both account panels',()=>{
 for(const host of ['direcciones507.com','cuenta.direcciones507.com','direcciones.lat']){
  const html=userPanelPresentation(new URL('https://'+host+'/panel'));
  const position=(id:string)=>html.indexOf('id="'+id+'"');
  const radar=position('radarAccountSection');
  expect(radar).toBeGreaterThan(position('identity'));
  expect(radar).toBeLessThan(position('addressSection'));
  expect(radar).toBeLessThan(position('requestDetail'));
  expect(radar).toBeLessThan(position('actions'));
  expect(position('actions')).toBeLessThan(position('orderSection'));
  expect(html.match(/id="radarAccountSection"/g)).toHaveLength(1);
  expect(html).toContain('id="radarAccountItems"');
  expect(html).toContain('id="toggleNewRequest"');
 }
});
