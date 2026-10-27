import {test,expect} from 'bun:test';
import {normalizeCodeName,requestedIdentity,nameAvailable,reservePublicName,publicIdentityUrl} from '../custom-names';
import {annualContract,annualExpiry,startAnnualTerm,voluntaryAnnualRenewal} from '../annual-term';
import {createNewAddressPublication,renderNewPublicAddress} from '../new-address-publication';
import {renderPanelAddressCard} from '../panel-address-card';
import {handleNameAvailability} from '../custom-name-routes';
const id='123e4567-e89b-42d3-a456-426614174000';
const request={id,type:'BUSINESS',plan:'BUSINESS_PREMIUM',countryCode:'PA',name:'Café Málaga',requestedName:'Café Málaga'};
const registry=async()=>Response.json({ok:true,codes:[{codigo:'AD507-0001'}]});
test('selectively recovered normalization merges accents, spaces and punctuation without truncation',()=>{
 for(const name of ['Café Málaga','CAFE-MALAGA','cafe.malaga',"Café 'Málaga'"])expect(normalizeCodeName(name)).toBe('CAFEMALAGA');
 for(const name of ['---','123','x'.repeat(61),'café/otro','<script>','Кафе'])expect(()=>normalizeCodeName(name)).toThrow('INVALID_CODE_NAME');
});
test('Premium keeps country prefix, Pro public name is bare and foreign paid plans stay closed',()=>{
 expect(requestedIdentity({...request,namedCode:request.requestedName})).toMatchObject({name:'AD507-CAFEMALAGA',kind:'PREMIUM'});
 const pro=requestedIdentity({...request,plan:'BUSINESS_PREMIUM_PRO',namedCode:'Café Málaga'});expect(pro?.name).toBe('CAFEMALAGA');expect(publicIdentityUrl(pro,'BUSINESS_PREMIUM_PRO','fallback')).toBe('https://direcciones.lat/CAFEMALAGA');
 expect(requestedIdentity({...request,namedCode:''})).toBeNull();expect(()=>requestedIdentity({...request,countryCode:'CR',namedCode:'Café Málaga'})).toThrow('COUNTRY_NOT_ENABLED');
});
test('system paths, historical profiles, named historical codes and numeric namespace are reserved',()=>{
 for(const name of ['admin','panel','auth','health','mi-cuenta','crear-cuenta','verificar-correo','places','sitemap.xml','jacinto','liliana','THE1920','N12345678','AD507CAFEMALAGA'])expect(()=>requestedIdentity({...request,plan:'BUSINESS_PREMIUM_PRO',namedCode:name})).toThrow('NAME_RESERVED');
});
test('availability is read only and global Pro collision keys cover every country',async()=>{
 const seen:any[]=[];const sql={unsafe:async(q:string,args:any[])=>{expect(q.startsWith('SELECT')).toBe(true);seen.push(args);return []}};
 const identity=requestedIdentity({...request,plan:'BUSINESS_PREMIUM_PRO',namedCode:'Café Málaga'})!;
 expect(await nameAvailable(sql,identity)).toBe(true);expect(seen[0][0]).toContain('AD506-CAFEMALAGA');expect(seen[0][0]).toContain('AD57-CAFEMALAGA');
 expect(await nameAvailable({unsafe:async()=>[{}]},identity)).toBe(false);
});
test('reservation serializes normalized stems, retains immutable address binding and translates unique conflicts',async()=>{
 const identity=requestedIdentity({...request,namedCode:'Café Málaga'})!,queries:string[]=[];
 await reservePublicName({unsafe:async(q:string)=>{queries.push(q);return []}},id,identity);
 expect(queries[0]).toContain('pg_advisory_xact_lock');expect(queries.at(-1)).toContain('INSERT INTO ad507.public_name_reservations');
 await expect(reservePublicName({unsafe:async(q:string)=>q.includes('WHERE address_id=')?[{public_name:'OTHER',kind:'PREMIUM',country_code:'PA'}]:[]},id,identity)).rejects.toThrow('NAME_IMMUTABLE');
 await expect(reservePublicName({unsafe:async(q:string)=>{if(q.startsWith('INSERT'))throw Object.assign(Error(),{code:'23505'});return []}},id,identity)).rejects.toThrow('NAME_UNAVAILABLE');
});
test('Premium recovers reserved code, Pro retains numeric internal code and disabled named purchases fail closed',async()=>{
 const sql={unsafe:async()=>{throw Error('GENERAL_POOL_MUST_NOT_BE_USED')}};
 for(const pro of [false,true]){
 const connection={unsafe:async(q:string)=>q.includes('FROM ad507.public_name_reservations')?[{public_name:pro?'CAFEMALAGA':'AD507-CAFEMALAGA',kind:pro?'PRO':'PREMIUM',country_code:'PA'}]:[]};
 const publisher=createNewAddressPublication(sql as any,{namespaceExclusive:true,customNames:true,fetch:registry});
 const code=await publisher.reserve({...request,plan:pro?'BUSINESS_PREMIUM_PRO':request.plan},connection);
 expect(code).toMatch(pro?/^AD507-N\d{8}$/:/^AD507-CAFEMALAGA$/);
 }
 await expect(createNewAddressPublication(sql as any,{namespaceExclusive:true,customNames:false,fetch:registry}).reserve(request)).rejects.toThrow('CUSTOM_NAMES_NOT_READY');
});
test('no missing reservation silently becomes a numeric purchased name',async()=>{
 const publisher=createNewAddressPublication({unsafe:async()=>[]} as any,{namespaceExclusive:true,customNames:true,fetch:registry});
 await expect(publisher.reserve(request)).rejects.toThrow('NAME_NOT_RESERVED');
});
test('availability requires auth and roles, and never touches DB while disabled',async()=>{
 let reads=0;const ctx={enabled:false,sql:{unsafe:async()=>{reads++;return []}},auth:{currentUser:async()=>null}};
 const req=new Request('https://direcciones.lat/v1/user/names/availability?plan=BUSINESS_PREMIUM_PRO&name=CafeMalaga');
 expect((await handleNameAvailability(req,ctx))?.status).toBe(503);expect(reads).toBe(0);
 expect((await handleNameAvailability(req,{...ctx,enabled:true}))?.status).toBe(401);
 expect((await handleNameAvailability(req,{...ctx,enabled:true,auth:{currentUser:async()=>({id,roles:['CLIENT']})}}))?.status).toBe(200);
});
test('annual prices stay original and one calendar year clamps leap day; renewal is voluntary and repeat safe',()=>{
 for(const [plan,cents]of [['RESIDENTIAL',1299],['BUSINESS_PREMIUM',1999],['BUSINESS_PREMIUM_PRO',3999]] as const)expect(annualContract(plan,'2026-10-26T12:00:00Z').amountCents).toBe(cents);
 expect(annualExpiry(new Date('2028-02-29T14:00:00Z')).toISOString()).toBe('2029-02-28T14:00:00.000Z');
 const c=annualContract('BUSINESS_PREMIUM_PRO','2026-10-26T12:00:00Z'),term=startAnnualTerm(c,id,new Date('2026-10-26T12:00:00Z'));
 expect(term.expiresAt).toBe('2027-10-26T12:00:00.000Z');expect(term.automaticCharge).toBe(false);
 expect(()=>voluntaryAnnualRenewal(term,{id:'next',status:'PAID',amountCents:3999},'BUSINESS_PREMIUM_PRO',false)).toThrow('RENEWAL_CONFIRMATION_REQUIRED');
 expect(voluntaryAnnualRenewal(term,{id,status:'PAID',amountCents:3999},'BUSINESS_PREMIUM_PRO',true)).toBe(term);
 expect(voluntaryAnnualRenewal(term,{id:'next',status:'PAID',amountCents:3999},'BUSINESS_PREMIUM_PRO',true,new Date('2027-10-01')).expiresAt).toBe('2028-10-26T12:00:00.000Z');
});
test('public Pro page uses bare identity in copy/share/QR but tracking keeps internal code; markup and CSS unchanged',()=>{
 const base:any={code:'AD507-N12345678',type:'BUSINESS',name:'Café Málaga',plan:{code:'BUSINESS_PREMIUM_PRO',name:'Premium Pro'},url:'https://direcciones.lat/CAFEMALAGA',coordinates:{latitude:8,longitude:-80},phone:null,landlinePhone:null,hours:null,socials:[],media:[],extras:{countryCode:'PA',historical:false}};
 const old=renderNewPublicAddress(base),html=renderNewPublicAddress({...base,publicCode:'CAFEMALAGA'});
 expect(html).toContain('const CODE = "CAFEMALAGA"');expect(html).toContain('const code="AD507-N12345678"');
 const qr=new Function(html.match(/const qrUrl = [^\n]+/)![0]+';return qrUrl;')();expect(new URL(qr).searchParams.get('data')).toBe(base.url);
 expect(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')).toBe(old.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''));
 const card=renderPanelAddressCard({id,code:base.code,publicCode:'CAFEMALAGA',planCode:'BUSINESS_PREMIUM_PRO',addressType:'BUSINESS',source:'USER_REQUEST',status:'ACTIVE',name:base.name,publicUrl:base.url});
 expect(card).toContain('data-copy-code="CAFEMALAGA"');expect(card).toContain('data-analytics-code="AD507-N12345678"');
});
