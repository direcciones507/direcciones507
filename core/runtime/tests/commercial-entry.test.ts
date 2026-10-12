import {test,expect} from 'bun:test';
import {commercialEntryContext,sharedCommercialRoot,initializeCommercialNavigation} from '../commercial-entry';
import {commercialEntryHtml,handleUserPanel} from '../user-panel';
import {addressPageOptions} from '../admin-address-pagination';
import {createMediaAuthorizer} from '../r2-media-authorization';
test('Panama and LATAM commercial contexts retain distinct titles, headers and welcome identity',()=>{
 const pa=commercialEntryHtml(false,new URL('https://direcciones507.com/commercial/panama'));
 const co=commercialEntryHtml(true,new URL('https://direcciones.lat/commercial/international?country=CO'));
 expect(pa).toContain('<title>Direcciones507 | Direcciones comerciales</title>');expect(pa).toContain('<div class="brand">Direcciones<span>507</span></div>');expect(pa).toContain('<h1 style="color:#0b57d0">Direcciones507</h1>');
 expect(co).toContain('<title>Direcciones LATAM | Direcciones comerciales</title>');expect(co).toContain('<div class="brand" style="color:#76aaff">Direcciones LATAM</div>');expect(co).toContain('id="commercialIdentity">Direcciones LATAM · Colombia');expect(co).toContain('value="CO" selected');
});

test('one shared interface prepares both exact domains, defaults Panama and fails closed on activation',()=>{
 const env={AD507_SHARED_COMMERCIAL_ENTRY_ENABLED:'true',AD507_INTERNATIONAL_DOMAIN_VERIFIED:'true'};
 for(const host of ['direcciones507.com','direcciones.lat']){
   const u=new URL('https://'+host+'/');expect(commercialEntryContext(u).country).toBe('PA');
   const html=commercialEntryHtml(host==='direcciones.lat',u);expect(html).toContain('Direcciones LATAM');expect(html).toContain('Direcciones507');expect(html).toContain('id="requestForm"');
   expect(html).toContain('href="'+(host==='direcciones.lat'?'https://direcciones.lat/':'https://direcciones507.com/commercial/panama')+'"');
   for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
   expect(sharedCommercialRoot(new Request(u),{})).toBe(false);expect(sharedCommercialRoot(new Request(u),env)).toBe(host==='direcciones.lat');
 }
 expect(sharedCommercialRoot(new Request('https://direcciones.lat/'),{AD507_SHARED_COMMERCIAL_ENTRY_ENABLED:'true'})).toBe(false);
 for(const path of ['/AD507-0038/','/assets/icon.png','/auth/google/callback','/admin'])expect(sharedCommercialRoot(new Request('https://direcciones507.com'+path),env)).toBe(false);
 expect(sharedCommercialRoot(new Request('https://direcciones507.com.evil.test/'),env)).toBe(false);
 expect(commercialEntryContext(new URL('https://direcciones.lat/?country=CO')).country).toBe('CO');
 expect(commercialEntryContext(new URL('https://direcciones.lat/?country=__proto__')).country).toBe('PA');
});

test('in-document country navigation preserves fields and selected photo objects through back/forward',()=>{
 const listeners:any={},selectors:any={},input={value:'Panamá',file:{name:'logo.png'}},country:any={value:'PA',dispatchEvent:()=>{},addEventListener:(event:string,handler:any)=>listeners.formCountry=handler};
 const select:any={value:'PA',options:[{value:'PA'},{value:'CO'}],selectedOptions:[{textContent:'Colombia'}],dispatchEvent:()=>select.onchange()};
 selectors.commercialCountry=select;selectors.countryCode=country;selectors.commercialIdentity={};selectors.commercialAvailability={};
 const link:any={dataset:{commercialCountry:'CO'}},doc={getElementById:(id:string)=>selectors[id],querySelectorAll:()=>[link]};
 const loc={href:'https://direcciones507.com/?country=PA'},history={pushState:(_:any,__:any,path:string)=>{loc.href='https://direcciones507.com'+path;}};
 const run=new Function('document','location','history','addEventListener','Event','return ('+initializeCommercialNavigation.toString()+')()');
 run(doc,loc,history,(event:string,handler:any)=>listeners[event]=handler,Event);expect(country.value).toBe('PA');
 const file=input.file;link.onclick({preventDefault(){}});expect(country.value).toBe('CO');expect(loc.href).toBe('https://direcciones507.com/?country=CO');expect(input.value).toBe('Panamá');expect(input.file).toBe(file);
 loc.href='https://direcciones507.com/?country=PA';listeners.popstate();expect(country.value).toBe('PA');expect(input.file).toBe(file);country.value='CO';listeners.formCountry();expect(select.value).toBe('CO');expect(input.file).toBe(file);
});

test('keyset options bound result sizes and bind cursors to country/list without trusting client SQL',()=>{
 expect(addressPageOptions(new URLSearchParams(),'addresses')).toEqual({limit:50,country:null,cursor:null,kind:'addresses'});
 for(const raw of ['0','101','-1','999999','NaN'])expect(()=>addressPageOptions(new URLSearchParams('limit='+raw),'addresses')).toThrow('INVALID_PAGE');
 expect(()=>addressPageOptions(new URLSearchParams('country=ZZ'),'addresses')).toThrow('INVALID_COUNTRY');
 const c=Buffer.from(JSON.stringify({kind:'addresses',country:'PA',time:'2026-10-11T12:00:00.000001Z',id:'11111111-1111-4111-8111-111111111111'})).toString('base64url');
 expect(addressPageOptions(new URLSearchParams('country=PA&cursor='+c),'addresses').cursor?.time).toEndWith('000001Z');
 expect(()=>addressPageOptions(new URLSearchParams('country=CO&cursor='+c),'addresses')).toThrow('INVALID_PAGE');
 expect(()=>addressPageOptions(new URLSearchParams('country=PA&cursor='+c),'requests')).toThrow('INVALID_PAGE');
});
test('country-bound private media keeps ownership and rejects a foreign object prefix',async()=>{
 const scope={ownerId:'11111111-1111-4111-8111-111111111111',addressId:'22222222-2222-4222-8222-222222222222',role:'logo' as const};
 const row={country_code:'CO',source:'USER_REQUEST',address_type:'BUSINESS',status:'DRAFT',linked:true,owner:true,client:true,admin:false};
 const authorize=createMediaAuthorizer({unsafe:async()=>[row]} as any,scope.ownerId);
 expect(await authorize({...scope,action:'upload',countryCode:'CO'})).toBe(true);
 expect(await authorize({...scope,action:'upload',countryCode:'CR'})).toBe(false);
 expect(await authorize({...scope,action:'read',storageKey:'countries/CR/addresses/'+scope.addressId+'/logo/'+'a'.repeat(64)+'.webp'})).toBe(false);
 expect(await authorize({...scope,action:'read',storageKey:'countries/CO/addresses/'+scope.addressId+'/logo/'+'a'.repeat(64)+'.webp'})).toBe(true);
 expect(await authorize({...scope,ownerId:scope.addressId,action:'read'})).toBe(false);
});

test('commercial renderer reuses the exact historical Natalie widget without changing the account or ADMIN form',async()=>{
 const {readFileSync}=await import('node:fs');
 const {userPanelHtml,adminCreationHtml,handleUserPanel}=await import('../user-panel');
 const source=readFileSync(new URL('../../../index.html',import.meta.url),'utf8');
 const start=source.indexOf('<button id="natalieLauncher"'),jsStart=source.indexOf('<script>',start),jsEnd=source.indexOf('</script>',jsStart);
 const widget=source.slice(start,jsStart),script=source.slice(jsStart+8,jsEnd);
 const html=commercialEntryHtml(false,new URL('https://direcciones507.com/commercial/panama'));
 expect(html).toContain(widget);expect(html).toContain(script);
 expect((html.match(/id="natalieLauncher"/g)||[]).length).toBe(1);
 expect((html.match(/<script>/g)||[]).length).toBe(1);
 expect(userPanelHtml).not.toContain('natalieLauncher');expect(adminCreationHtml()).not.toContain('natalieLauncher');
 const res=await handleUserPanel(new Request('https://direcciones507.com/commercial/panama'),{} as any,{} as any);
 expect(res!.headers.get('content-security-policy')).toContain("connect-src 'self' https://ad507-core-production.up.railway.app");
 const secured=await res!.text();const nonce=secured.match(/<script nonce="([a-f0-9]+)">/)![1];
 expect(res!.headers.get('content-security-policy')).toContain("script-src 'nonce-"+nonce+"'");
 expect(secured).not.toContain('<script>');
});

test('Natalie integration remains non-executable on LATAM and preview origins until the existing backend accepts them',()=>{
 for(const origin of ['https://direcciones.lat','https://direcciones507.com.evil.test','https://preview.example.test']){
  const html=commercialEntryHtml(true,new URL(origin+'/commercial/international'));
  expect(html).toContain('id="natalieLauncher" disabled');
  expect(html).not.toContain('const SESSION_ENDPOINT = CORE');
  expect(html).not.toContain('const CONVERSATION_ENDPOINT = CORE');
 }
});

test('reused Natalie web script starts no requests on render, reuses one session and safely displays replies (local simulation)',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../../../index.html',import.meta.url),'utf8');
 const start=source.indexOf('<script>',source.indexOf('<button id="natalieLauncher"'));
 const script=source.slice(start+8,source.indexOf('</script>',start));
 const calls:any[]=[],events:any={},nodes:any={};
 const make=(id:string)=>nodes[id]={value:'',disabled:false,textContent:'',children:[],classList:{contains:()=>false,toggle(){}},setAttribute(){},focus(){},appendChild(item:any){this.children.push(item)},addEventListener(name:string,fn:any){events[id+':'+name]=fn},querySelector:()=>nodes.send};
 for(const id of ['natalieLauncher','natalieChat','natalieClose','natalieForm','natalieInput','natalieMessages','natalieStatus','send'])make(id);
 const doc={getElementById:(id:string)=>nodes[id],createElement:()=>({}),addEventListener(){}};
 const http=async(url:string,init:any)=>{calls.push({url,init});return Response.json(url.endsWith('controlled-session')?{ok:true,session_id:'11111111-1111-4111-8111-111111111111'}:{ok:true,response:'<img onerror=alert(1)>',message_number:1,status:'active'});};
 new Function('document','fetch','setTimeout',script)(doc,http,()=>{});
 expect(calls).toHaveLength(0);
 for(const query of ['¿Qué es Direcciones507?','¿Cómo solicito mi dirección?']){nodes.natalieInput.value=query;await events['natalieForm:submit']({preventDefault(){}});}
 expect(calls.filter(c=>c.url.endsWith('controlled-session'))).toHaveLength(1);
 const messages=calls.filter(c=>c.url.endsWith('controlled-conversation'));expect(messages).toHaveLength(2);
 for(const c of messages){expect(c.init.headers['x-ad507-session-id']).toBe('11111111-1111-4111-8111-111111111111');expect(c.url).toStartWith('https://ad507-core-production.up.railway.app/');}
 expect(nodes.natalieMessages.children.some((x:any)=>x.textContent==='<img onerror=alert(1)>')).toBe(true);
 expect(nodes.natalieMessages.children.every((x:any)=>x.innerHTML===undefined)).toBe(true);
});

test('existing OAuth is single-origin: LATAM cannot reuse Panama cookies or override callback by proxy headers',async()=>{
 const {createGeneralAuth}=await import('../general-auth');let reads=0,googleCalls=0;
 const auth=createGeneralAuth({unsafe:async()=>{reads++;throw Error('UNEXPECTED_DB');}} as any,{
 AD507_GOOGLE_CLIENT_ID:'isolated',AD507_GOOGLE_CLIENT_SECRET:'isolated',AD507_SESSION_SECRET:'x'.repeat(64),
 AD507_GOOGLE_REDIRECT_URI:'https://direcciones507.com/auth/google/callback',AD507_AUTH_SUCCESS_URL:'/panel',AD507_PUBLIC_BASE_URL:'https://direcciones507.com',
 },(async()=>{googleCalls++;throw Error('UNEXPECTED_PROVIDER');}) as typeof fetch);
 for(const path of ['/auth/google/login','/auth/google/callback','/v1/auth/me']){
  const r=await auth.handle(new Request('https://direcciones.lat'+path,{headers:{cookie:'ad507_session=synthetic','x-forwarded-host':'direcciones507.com'}}));
  expect(r!.status).toBe(400);expect((await r!.json()).error).toBe('AUTH_ORIGIN_DENIED');
 }
 expect(reads).toBe(0);expect(googleCalls).toBe(0);
});


test('same Natalie widget is prepared for LATAM only after exact verified-domain opt-in',()=>{
 const old=process.env.AD507_INTERNATIONAL_DOMAIN_VERIFIED;
 try{
  process.env.AD507_INTERNATIONAL_DOMAIN_VERIFIED='true';
  const html=commercialEntryHtml(true,new URL('https://direcciones.lat/'));
  expect(html).toContain('const SESSION_ENDPOINT = CORE');expect(html).not.toContain('id="natalieLauncher" disabled');
  expect(html).toContain("location.replace('/')");
  expect(commercialEntryHtml(true,new URL('https://direcciones.lat.evil.test/'))).toContain('id="natalieLauncher" disabled');
 }finally{if(old===undefined)delete process.env.AD507_INTERNATIONAL_DOMAIN_VERIFIED;else process.env.AD507_INTERNATIONAL_DOMAIN_VERIFIED=old;}
});


test('additional OAuth config fails closed on unverified domain, malformed callbacks or redirect-host overrides',async()=>{
 const {createGeneralAuth}=await import('../general-auth');const db={unsafe:async()=>{throw Error('UNEXPECTED_DATABASE');}} as any;
 const base={AD507_GOOGLE_CLIENT_ID:'test',AD507_GOOGLE_CLIENT_SECRET:'test',AD507_SESSION_SECRET:'x'.repeat(64),AD507_GOOGLE_REDIRECT_URI:'https://direcciones507.com/auth/google/callback',AD507_PUBLIC_BASE_URL:'https://direcciones507.com',AD507_AUTH_SUCCESS_URL:'/panel'};
 for(const callback of ['http://direcciones.lat/auth/google/callback','https://direcciones.lat.evil.test/auth/google/callback','https://user:password@direcciones.lat/auth/google/callback','https://direcciones.lat/not-callback']){
  const auth=createGeneralAuth(db,{...base,AD507_INTERNATIONAL_DOMAIN_VERIFIED:'true',AD507_GOOGLE_REDIRECT_URI_LATAM:callback});
  expect((await auth.handle(new Request('https://direcciones.lat/auth/google/login')))!.status).toBe(400);
 }
 const wrongSuccess=createGeneralAuth(db,{...base,AD507_INTERNATIONAL_DOMAIN_VERIFIED:'true',AD507_GOOGLE_REDIRECT_URI_LATAM:'https://direcciones.lat/auth/google/callback',AD507_AUTH_SUCCESS_URL_LATAM:'https://evil.test/'});
 expect((await wrongSuccess.handle(new Request('https://direcciones.lat/auth/google/login')))!.status).toBe(400);
});


test('commercial entry applies CSP nonce to both panel and existing Natalie scripts',async()=>{
 const response=await handleUserPanel(new Request('https://direcciones507.com/commercial/panama'),{} as any,{} as any);
 expect(response?.status).toBe(200);
 const html=await response!.text();
 const csp=response!.headers.get('content-security-policy')??'';
 const nonce=csp.match(/script-src 'nonce-([^']+)'/)?.[1];
 expect(nonce).toBeTruthy();
 const scripts=[...html.matchAll(/<script([^>]*)>/g)];
 expect(scripts.length).toBeGreaterThan(0);
 expect(html).toContain("fetch('/v1/user/panel");
 expect(html).toContain('const SESSION_ENDPOINT = CORE');
 expect(html).toContain('const CONVERSATION_ENDPOINT = CORE');
 for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(match[1])).not.toThrow();
 for(const script of scripts)expect(script[1]).toContain('nonce="'+nonce+'"');
 expect(html).toContain('id="natalieLauncher"');
});
