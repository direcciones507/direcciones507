import {test,expect} from 'bun:test';
import {commercialEntryContext,sharedCommercialRoot,initializeCommercialNavigation} from '../commercial-entry';
import {commercialEntryHtml} from '../user-panel';
import {addressPageOptions} from '../admin-address-pagination';
import {createMediaAuthorizer} from '../r2-media-authorization';

test('one shared interface prepares both exact domains, defaults Panama and fails closed on activation',()=>{
 const env={AD507_SHARED_COMMERCIAL_ENTRY_ENABLED:'true',AD507_INTERNATIONAL_DOMAIN_VERIFIED:'true'};
 for(const host of ['direcciones507.com','direcciones.lat']){
   const u=new URL('https://'+host+'/');expect(commercialEntryContext(u).country).toBe('PA');
   const html=commercialEntryHtml(host==='direcciones.lat',u);expect(html).toContain('Direcciones LATAM');expect(html).toContain('Direcciones507');expect(html).toContain('id="requestForm"');
   expect(html).toContain('href="https://'+host+'/"');
   for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
   expect(sharedCommercialRoot(new Request(u),{})).toBe(false);expect(sharedCommercialRoot(new Request(u),env)).toBe(true);
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
