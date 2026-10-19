import {test,expect} from 'bun:test';
import {createNewAddressPublication} from '../new-address-publication';
import {COUNTRIES,FREE_LAUNCH_COUNTRIES,assertCountryPublication,codeMatchesCountry,paymentMethods} from '../country-configuration';
import {latamWelcome} from '../latam-presentation';
import {renderNewPublicAddress} from '../new-address-publication';
import {userPanelHtml} from '../user-panel';

const id='12345678-1234-1234-1234-123456789abc';
function codeAllocator(request:{existing?:string;row?:any}={}){
 const queries:string[]=[];
 const sql={unsafe:async(query:string,args:any[]=[])=>{
   queries.push(query);
   if(query.includes('upper(trim(code))'))return request.existing?[{id:'another'}]:[];
   if(query.includes("status IN ('PENDING_REVIEW'"))return request.row?[request.row]:[];
   return [];
 }} as any;
 let externalCalls=0;
 const canonical=createNewAddressPublication(sql,{namespaceExclusive:true,fetch:async()=>{externalCalls++;throw Error('GOOGLE_REGISTRY_MUST_NOT_BE_CALLED');}});
 return {canonical,queries,getExternalCalls:()=>externalCalls};
}
test('all seven new foreign countries reserve distinct canonical codes using only PostgreSQL',async()=>{
 const codes:string[]=[];
 for(const country of FREE_LAUNCH_COUNTRIES.filter(c=>c!=='PA')){
  for(const [type,plan] of [['BUSINESS','BUSINESS_FREE'],['PLACE','PLACE']] as const){
   const {canonical,getExternalCalls,queries}=codeAllocator();
   const code=await canonical.reserve({id,countryCode:country,type,plan,name:'Test',requestedName:''});
   expect(code).toMatch(new RegExp('^AD'+COUNTRIES[country].prefix+'-N[0-9]{8}$'));
   expect(codeMatchesCountry(code,country)).toBe(true);
   expect(getExternalCalls()).toBe(0);
   expect(queries.some(q=>q.includes('upper(trim(code))'))).toBe(true);
   codes.push(code);
  }
 }
 expect(new Set(codes).size).toBe(7);
});
test('foreign paid/residential, unknown and future countries fail before reserving or publishing anything',async()=>{
 for(const country of FREE_LAUNCH_COUNTRIES.filter(c=>c!=='PA')){
  for(const [type,plan] of [['BUSINESS','BUSINESS_PREMIUM'],['BUSINESS','BUSINESS_PREMIUM_PRO'],['RESIDENTIAL','RESIDENTIAL']] as const){
   const {canonical,queries,getExternalCalls}=codeAllocator();
   await expect(canonical.reserve({id,countryCode:country,type,plan,name:'Test',requestedName:''})).rejects.toThrow('COUNTRY_NOT_ENABLED');
   expect(queries).toHaveLength(0);expect(getExternalCalls()).toBe(0);
  }
  expect(paymentMethods(country)).toEqual([]);
 }
 for(const country of ['PE','EC','ZZ']){
  expect(()=>assertCountryPublication(country,'PLACE','PLACE')).toThrow();
 }
});
test('foreign publication requires reviewed request with a free plan, without external publisher',async()=>{
 for(const country of FREE_LAUNCH_COUNTRIES.filter(c=>c!=='PA')){
  for(const [type,plan] of [['BUSINESS','BUSINESS_FREE'],['PLACE','PLACE']] as const){
   const {canonical,queries,getExternalCalls}=codeAllocator({row:{id,address_type:type,country_code:country,request_data:{countryCode:country,plan}}});
   const code='AD'+COUNTRIES[country].prefix+'-N12345678';
   const publication=await canonical.publish({id,code,type});
   expect(publication.confirmed).toBe(true);
   expect(publication.receipt).toContain(id);
   expect(queries[0]).toContain("review_decision='APPROVED'");
   expect(getExternalCalls()).toBe(0);
  }
  const bad=codeAllocator({row:{id,address_type:'BUSINESS',country_code:country,request_data:{countryCode:country,plan:'BUSINESS_PREMIUM'}}});
  await expect(bad.canonical.publish({id,code:'AD'+COUNTRIES[country].prefix+'-N12345678',type:'BUSINESS'})).rejects.toThrow('COUNTRY_NOT_ENABLED');
 }
});
test('LATAM presentation advertises all eight free countries, while original Panama and historical HTML are unaffected',()=>{
 for(const country of FREE_LAUNCH_COUNTRIES){
  const html=latamWelcome(country,COUNTRIES,FREE_LAUNCH_COUNTRIES);
  expect(html).toContain('Negocio Gratis');
  expect(html).toContain('Lugar Gratis');
  expect(html).toContain('Gratis disponible');
  expect(html).not.toContain('Solo Panamá y Costa Rica');
 }
 expect(userPanelHtml).toContain("!submissionAllowed||!allowed");
 const historical=renderNewPublicAddress({type:'BUSINESS',name:'Test',code:'AD507-0038',url:'https://direcciones507.com/ad507-0038/',socials:[],media:[],coordinates:{latitude:8,longitude:-80},extras:{countryCode:'PA',historical:true}} as any);
 expect(historical).toContain('DIRECCIONES<span>507</span>');
});
