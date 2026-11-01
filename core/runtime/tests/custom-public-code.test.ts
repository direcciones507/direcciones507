import {beforeAll,afterAll,test,expect} from 'bun:test';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {readFileSync} from 'node:fs';
import {personalizedCode,assertCodeAvailable,addressPublicUrl,verifyHistoricalCustomCode} from '../custom-public-code';
import {createAddressEditing} from '../address-editing';
import {createRequestRepository} from '../request-repository';
import {createNewAddressPublication,handleNewPublicRoutes,newPublicAddress,renderNewPublicAddress} from '../new-address-publication';
import {handleRequestRoutes} from '../request-routes';
import {adminAddressPage} from '../admin-address-pagination';
import {renderPanelAddressCard} from '../panel-address-card';
const db=new PGlite({extensions:{pgcrypto}});
function adapter(executor:any):any{const sql:any=(strings:TemplateStringsArray,...args:any[])=>executor.query(strings.reduce((s,v,i)=>s+(i?'$'+i:'')+v,''),args).then((r:any)=>r.rows);sql.unsafe=(query:string,args:any[]=[])=>executor.query(query,args).then((r:any)=>r.rows);sql.json=(v:any)=>JSON.stringify(v);sql.begin=(fn:any)=>executor.transaction((tx:any)=>fn(adapter(tx)));sql.reserve=async()=>Object.assign(sql,{release:()=>{}});return sql;}
const sql=adapter(db),actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
const fetcher=(async()=>Response.json({ok:true,codes:[{codigo:'AD507-HISTORICO'}]})) as typeof fetch;
const repo=createRequestRepository(sql,{r2:null,fetch:fetcher});
const editor=createAddressEditing(sql,{r2:null,fetch:fetcher});
const context={enabled:true,sql,r2:null};
beforeAll(async()=>{
 const root=new URL('../../../',import.meta.url);
 for(const file of ['0000_migration_ledger.sql','0001_core_foundation.sql','0002_plan_catalog.sql','0003_plan_capabilities.sql','0005_general_google_auth.sql'])await db.exec(readFileSync(new URL('db/migrations/'+file,root),'utf8'));
 for(const file of ['landline','requests','countries'])await db.exec(readFileSync(new URL('../schema-proposals/'+file+'.sql',import.meta.url),'utf8'));
 await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1::uuid,'owner@example.test'),($2::uuid,'other@example.test')",[actor,other]);
 await sql.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,'CLIENT'),($1::uuid,'ADMIN'),($2::uuid,'CLIENT')",[actor,other]);
 await sql.unsafe(`INSERT INTO ad507.addresses(id,code,address_type,status,plan_id,name,reference,latitude,longitude,source,request_data,publication_receipt,country_code) VALUES($1::uuid,'AD507-N00900792','BUSINESS','ACTIVE',(SELECT id FROM ad507.plans WHERE code='BUSINESS_PREMIUM_PRO'),'Synthetic','Synthetic',8,-80,'USER_REQUEST',$2::jsonb,'synthetic','PA')`,[id,sql.json({plan:'BUSINESS_PREMIUM_PRO',media:{logos:1,placePhotos:0,galleryPhotos:0},namedCode:'Old-name'})]);
 await sql.unsafe('INSERT INTO ad507.address_ownership(address_id,user_id) VALUES($1::uuid,$2::uuid)',[id,actor]);
 await sql.unsafe("INSERT INTO ad507.address_media(address_id,media_type,url) VALUES($1::uuid,'LOGO','https://example.test/logo.png')",[id]);
},30000);
afterAll(()=>db.close());
test('formats, reserved routes, invalid characters and automatic prefix',()=>{
 expect(personalizedCode('BUSINESS_PREMIUM','direcciones-LATAM')).toBe('AD507-direcciones-LATAM');expect(personalizedCode('BUSINESS_PREMIUM_PRO','direcciones-LATAM')).toBe('direcciones-LATAM');
 for(const name of ['admin','Panel','v1','AD507-demo','AD9999-test','a b','a.b','a,b','../x','a_b','a--b','-a','a-','N12345678','á','x'.repeat(81)])expect(()=>personalizedCode('BUSINESS_PREMIUM_PRO',name)).toThrow('INVALID_NAMED_CODE');
 for(const plan of ['BUSINESS_FREE','PLACE','RESIDENTIAL'])expect(()=>personalizedCode(plan,'hello')).toThrow('CAPABILITY_VIOLATION');
});
test('historical collision and unavailable registry fail closed',async()=>{
 await expect(verifyHistoricalCustomCode('AD507-historico',fetcher)).rejects.toThrow('CANONICAL_CODE_COLLISION');
 await expect(verifyHistoricalCustomCode('AD507-test',(async()=>new Response('bad',{status:500})) as any)).rejects.toThrow('HISTORICAL_REGISTRY_UNAVAILABLE');
});
test('published personalized code is immutable for owner and ADMIN general edit',async()=>{
 const read=await repo.read(actor,id);
 await expect(editor.edit(actor,id,{version:read.version,namedCode:'changed'},[],false)).rejects.toThrow('PUBLISHED_CODE_LOCKED');
 await expect(editor.edit(actor,id,{version:read.version,namedCode:'changed'},[],true)).rejects.toThrow('PUBLISHED_CODE_LOCKED');
 const after=await repo.read(actor,id);
 expect(after.publicCode).toBe(read.publicCode);
 expect(after.code).toBe(read.code);
 await expect(editor.edit(other,id,{version:read.version,namedCode:'stolen'},[],false)).rejects.toThrow('PUBLISHED_CODE_LOCKED');
});
test('free/Lugar/Residential URLs and historical originals unchanged',()=>{
 for(const plan of ['BUSINESS_FREE','PLACE','RESIDENTIAL']){const row={code:'AD507-N12345678',source:'USER_REQUEST',country_code:'PA',request_data:{plan}};expect(addressPublicUrl(row)).toBe('https://direcciones.lat/AD507-N12345678/');}
 expect(addressPublicUrl({code:'AD507-0012',country_code:'PA',source:'USER_REQUEST',request_data:{plan:'BUSINESS_PREMIUM_PRO',publicCode:'ignored',migration:{originalUrl:'https://direcciones507.com/ad507-0012/'}}})).toBe('https://direcciones507.com/ad507-0012/');
});

test('create and publish Premium/Pro with real reservation, synthetic storage and no payment calls',async()=>{
 const sharp=(await import('sharp')).default;
 const bytes=new Uint8Array(await sharp({create:{width:4,height:4,channels:3,background:'#135799'}}).png().toBuffer());
 const http=(async(input:any)=>String(input).includes('script.google.com')?fetcher(input):new Response(null,{status:200})) as typeof fetch;
 const canonical=createNewAddressPublication(sql,{namespaceExclusive:true,fetch:http});
 const creation=createRequestRepository(sql,{r2:{configurationVerified:true,accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'synthetic',secretAccessKey:'synthetic'},fetch:http,canonical});
 for(const plan of ['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO']){
  const name=plan==='BUSINESS_PREMIUM'?'Created-Premium':'Created-Pro';
  const raw={countryCode:'PA',type:'BUSINESS',plan,name,reference:'Synthetic',latitude:8,longitude:-80,namedCode:name};
  const created=await creation.createAdmin(actor,crypto.randomUUID(),raw,[{role:'logo',mime:'image/png',bytes}]);expect(created.status).toBe('PENDING_REVIEW');
  if(plan==='BUSINESS_PREMIUM_PRO')await sql.unsafe("UPDATE ad507.addresses SET request_data=request_data-'publicCode'-'codeAliases' WHERE id=$1::uuid",[created.id]);
  await creation.review(actor,created.id,'APPROVED');await creation.publish(actor,created.id);
  const record=await creation.read(actor,created.id);expect(record.code).toMatch(/^AD507-N[0-9]{8}$/);expect(record.publicUrl).toBe('https://direcciones.lat/'+(plan==='BUSINESS_PREMIUM'?'AD507-':'')+name+'/');
  expect((await handleNewPublicRoutes(new Request(record.publicUrl!),context))?.status).toBe(200);
 }
 const raw={countryCode:'PA',type:'BUSINESS',plan:'BUSINESS_PREMIUM_PRO',name:'Race',reference:'Synthetic',latitude:8,longitude:-80,namedCode:'Concurrent-name'};
 const outcomes=await Promise.allSettled(['Concurrent-name','CONCURRENT-name'].map(namedCode=>creation.createAdmin(actor,crypto.randomUUID(),{...raw,namedCode},[{role:'logo',mime:'image/png',bytes}])));
 expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(outcomes.filter(r=>r.status==='rejected')).toHaveLength(1);
 const counts=await sql.unsafe("SELECT count(*)::int AS count FROM ad507.orders");expect(counts[0].count).toBe(0);
});

test('reservation/publication reuse the locked connection instead of requesting another pool slot',async()=>{
 const pool={unsafe:async()=>{throw Error('POOL_SLOT_MUST_NOT_BE_REQUESTED')}} as any;
 const publisher=createNewAddressPublication(pool,{namespaceExclusive:true,fetch:fetcher});
 const executor={unsafe:async(query:string)=>query.includes('SELECT id,request_data,address_type,country_code')?[{id,request_data:{plan:'BUSINESS_PREMIUM_PRO'},address_type:'BUSINESS',country_code:'PA'}]:[]} as any;
 const code=await publisher.reserve({id,type:'BUSINESS',plan:'BUSINESS_PREMIUM_PRO',name:'Synthetic',requestedName:'',executor});
 expect(code).toMatch(/^AD507-N[0-9]{8}$/);
 expect((await publisher.publish({id,type:'BUSINESS',code,executor})).confirmed).toBe(true);
});
