import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {readFileSync} from 'node:fs';
import {handleUserPanel,userPanelHtml,userPanelPresentation,commercialEntryHtml,adminCreationHtml} from '../user-panel';
test('cookie source and every final account/commercial/admin script parse together',()=>{
 const cookie=readFileSync(new URL('../../../assets/legal-consent.js',import.meta.url),'utf8');
 new Script(cookie);
 for(const html of [userPanelHtml,adminCreationHtml(),commercialEntryHtml(false),commercialEntryHtml(true,new URL('https://direcciones.lat/')),userPanelPresentation(new URL('https://direcciones.lat/panel?country=CR'))]){
  const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>=2);
  for(const [,source]of scripts)new Script(source);
  assert.ok(!html.includes('La sesión está activa, pero el panel necesita recuperar sus controles'));
 }
});
test('account API returns owned records, unauthenticated and controlled database errors',async()=>{
 const url='https://direcciones.lat/v1/user/panel';
 const auth=(user:any)=>({currentUser:async()=>user}) as any;
 const user={id:'11111111-1111-4111-8111-111111111111',roles:['CLIENT'],email:'test@example.invalid'};
 const request=()=>new Request(url);
 const guest=await handleUserPanel(request(),null as any,auth(null));assert.equal(guest!.status,401);
 const sql={unsafe:async(query:string,args:any[])=>{
  if(query.includes('FROM ad507.addresses')){assert.ok(args.includes(user.id));return [{id:user.id,name:'Guardada',source:'USER_REQUEST',countryCode:'PA',status:'PENDING_REVIEW'}];}
  return [];
 }} as any;
 const ok=await handleUserPanel(request(),sql,auth(user));assert.equal(ok!.status,200);
 assert.equal((await ok!.json()).addresses[0].name,'Guardada');
 const unavailable=await handleUserPanel(request(),{unsafe:async()=>{throw Error('isolated database failure')}} as any,auth(user));
 assert.equal(unavailable!.status,503);assert.equal((await unavailable!.json()).error,'USER_PANEL_UNAVAILABLE');
 for(const path of ['/panel','/panel/']){
  const page=await handleUserPanel(new Request('https://direcciones.lat'+path),null as any,auth(null));
  assert.equal(page!.status,200);assert.equal(page!.headers.get('location'),null);
 }
});
