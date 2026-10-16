import { test, expect } from 'bun:test';
import { createNewAddressPublication,normalizeCodeName } from '../new-address-publication';
const id='123e4567-e89b-42d3-a456-426614174000';
const request={id,type:'BUSINESS',plan:'BUSINESS_FREE',name:'Fonda Tatiana',requestedName:''};
const registry=(codes=['ad507-0001'])=>(async()=>Response.json({ok:true,codes:codes.map(codigo=>({codigo}))})) as typeof fetch;
const publisher=(fetcher=registry(),sql:any={unsafe:async()=>[]})=>createNewAddressPublication(sql,{namespaceExclusive:true,productNamespaceExclusive:true,fetch:fetcher});
test('new Free codes have exactly eight numeric digits and retries are stable',async()=>{
 const p=publisher(),a=await p.reserve(request);expect(a).toMatch(/^AD507-\d{8}$/);expect(await p.reserve(request)).toBe(a);
 expect(await p.reserve({...request,id:'123e4567-e89b-42d3-a456-426614174001'})).not.toBe(a);
});
test('named plans normalize accents/punctuation and resolve historical and database duplicates',async()=>{
 expect(normalizeCodeName('Fónda — Tatiana!')).toBe('FONDATATIANA');expect(()=>normalizeCodeName('---')).toThrow('INVALID_CODE_NAME');
 for(const [type,plan]of [['BUSINESS','BUSINESS_PREMIUM'],['BUSINESS','BUSINESS_PREMIUM_PRO'],['PLACE','PLACE']]){
 const r={...request,type,plan};expect(await publisher().reserve(r)).toBe('AD507-FONDATATIANA');
 expect(await publisher(registry(['ad507-fondatatiana'])).reserve(r)).toBe('AD507-FONDATATIANA2');
 expect(await publisher(registry(),{unsafe:async(_q:any,params:any)=>params[0]==='AD507-FONDATATIANA'?[{id:'occupied'}]:[]}).reserve(r)).toBe('AD507-FONDATATIANA2');
 }
});
test('both independent namespace gates fail closed',async()=>{
 await expect(createNewAddressPublication({} as any,{namespaceExclusive:false}).reserve(request)).rejects.toThrow('HISTORICAL_NAMESPACE_NOT_VERIFIED');
 await expect(createNewAddressPublication({} as any,{namespaceExclusive:true}).reserve(request)).rejects.toThrow('PRODUCT_CODE_NAMESPACE_NOT_VERIFIED');
});
test('numeric historical collision selects another bounded candidate',async()=>{
 const first=await publisher().reserve(request);const next=await publisher(registry([first.toLowerCase()])).reserve(request);expect(next).toMatch(/^AD507-\d{8}$/);expect(next).not.toBe(first);
});
test('malformed UUID and unenabled countries cannot reserve',async()=>{
 for(const invalid of ['-'.repeat(36),'a'.repeat(36),'123e4567e-89b-42d3-a456-426614174000'])await expect(publisher().reserve({...request,id:invalid})).rejects.toThrow('INVALID_REQUEST');
 await expect(publisher().reserve({...request,countryCode:'CO'})).rejects.toThrow('COUNTRY_NOT_ENABLED');
});
