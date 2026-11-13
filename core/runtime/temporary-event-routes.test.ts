import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {handleTemporaryEventRoutes} from './temporary-event-routes';
const owner={id:'11111111-1111-4111-8111-111111111111',roles:['CLIENT']};
const auth={currentUser:async()=>owner};
const sql={} as any;
const ctx={enabled:true,sql,auth};
test('feature switch blocks draft and public event endpoints without DB access',async()=>{
 for(const path of ['/panel/evento/nuevo','/v1/user/temporary-events','/evento/fiesta-0123456789abcdef']){
  const response=await handleTemporaryEventRoutes(new Request('https://direcciones.lat'+path),{...ctx,enabled:false});
  assert.equal(response?.status,404);
 }
});
test('draft rejects cross-origin submissions before touching DB',async()=>{
 const req=new Request('https://direcciones.lat/v1/user/temporary-events',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json','x-requested-with':'XMLHttpRequest'},body:'{}'});
 const response=await handleTemporaryEventRoutes(req,ctx);
 assert.equal(response?.status,403);
});
test('draft rejects missing AJAX header before touching DB',async()=>{
 const req=new Request('https://direcciones.lat/v1/user/temporary-events',{method:'POST',headers:{origin:'https://direcciones.lat','content-type':'application/json'},body:'{}'});
 const response=await handleTemporaryEventRoutes(req,ctx);
 assert.equal(response?.status,403);
});
test('draft rejects unauthenticated users',async()=>{
 const req=new Request('https://direcciones.lat/v1/user/temporary-events',{method:'POST',headers:{origin:'https://direcciones.lat','content-type':'application/json','x-requested-with':'XMLHttpRequest'},body:'{}'});
 const response=await handleTemporaryEventRoutes(req,{...ctx,auth:{currentUser:async()=>null} as any});
 assert.equal(response?.status,401);
});
test('authenticated form is available without a DB write',async()=>{
 const response=await handleTemporaryEventRoutes(new Request('https://direcciones.lat/panel/evento/nuevo'),ctx);
 assert.equal(response?.status,200);
 const html=await response!.text();
 assert.match(html,/Guardar borrador/);
 assert.match(html,/US\$7\.99/);
 assert.match(html,/temporary-event-draft/);
});

test('public event page never contains private organizer details',async()=>{
 const row={id:'22222222-2222-4222-8222-222222222222',slug:'fiesta-0123456789abcdef',title:'Fiesta pública',
 description:'Evento en Santiago',public_contact_name:null,public_contact_phone:null,public_contact_consent:false,
 country_code:'PA',region:'Veraguas',municipality:'Santiago',locality:'Santiago',reference:'Parque central',
 latitude:8.1,longitude:-80.9,starts_on:'2026-11-11',ends_on:'2026-11-11',event_timezone:'America/Panama',
 hours_description:'19:00',status:'ACTIVE',payment_confirmed_at:'2026-11-11T12:00:00Z'};
 const fakeSql={unsafe:async(q:string)=>q.includes('temporary_event_media')?[]:[row]} as any;
 const response=await handleTemporaryEventRoutes(new Request('https://direcciones.lat/evento/fiesta-0123456789abcdef'),{...ctx,sql:fakeSql});
 assert.equal(response?.status,200);
 const html=await response!.text();
 assert.match(html,/Fiesta pública/);
 assert.doesNotMatch(html,/responsible_email|responsible_phone|INTERNAL_NOT_PUBLIC/);
 assert.match(html,/noindex,nofollow/);
});
test('draft never activates payment from browser request',async()=>{
 const row={id:'22222222-2222-4222-8222-222222222222',slug:'fiesta-0123456789abcdef',status:'DRAFT'};
 let statement='';
 const fakeSql={unsafe:async(query:string)=>{statement=query;return [row]}} as any;
 const payload={title:'Fiesta pública',description:'Evento',responsibleName:'Responsable',
 responsibleEmail:'responsable@example.com',responsiblePhone:'+50760000000',
 countryCode:'PA',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',
 reference:'Parque',startsOn:'2026-11-11',endsOn:'2026-11-11',timezone:'America/Panama',hours:'19:00',
 paymentConfirmedAt:'2026-11-11T12:00:00Z',status:'ACTIVE'};
 const req=new Request('https://direcciones.lat/v1/user/temporary-events',{method:'POST',
 headers:{origin:'https://direcciones.lat','content-type':'application/json','x-requested-with':'XMLHttpRequest'},
 body:JSON.stringify(payload)});
 const response=await handleTemporaryEventRoutes(req,{...ctx,sql:fakeSql});
 assert.equal(response?.status,201);
 assert.match(statement,/,'DRAFT'\)/);
 assert.doesNotMatch(statement,/payment_confirmed_at/);
});

test('event form sends signed-out visitors to the existing account login',async()=>{const r=await handleTemporaryEventRoutes(new Request('https://direcciones.lat/panel/evento/nuevo'),{...ctx,auth:{currentUser:async()=>null}});assert.equal(r?.status,302);assert.equal(r?.headers.get('location'),'/panel');});

test('cross-site homepage navigation can open only the authenticated GET form',async()=>{
 const headers={'sec-fetch-site':'cross-site','sec-fetch-mode':'navigate'};
 const form=new Request('https://direcciones.lat/panel/evento/nuevo',{headers});
 assert.equal((await handleTemporaryEventRoutes(form,ctx))?.status,200);
 assert.equal((await handleTemporaryEventRoutes(form,{...ctx,auth:{currentUser:async()=>null}}))?.status,302);
 assert.equal((await handleTemporaryEventRoutes(new Request('https://direcciones.lat/v1/user/temporary-events',{headers}),ctx))?.status,403);
 assert.equal((await handleTemporaryEventRoutes(new Request('https://direcciones.lat/panel/evento/nuevo',{method:'POST',headers}),ctx))?.status,405);
});
