import {test,expect} from 'bun:test';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {createBusinessRoutes,createBusinessStore,validateBusiness} from '../radar/business';
const id='00000000-0000-4000-8000-000000000001',owner='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
const origin='https://radar.direcciones.lat';
const data={hours:{monday:'08:00-17:00',sunday:'closed'},quantity:10,unit:'tables'};
test('business input validates times, days and integer quantities without commercial flags',()=>{
 expect(validateBusiness({...data,pin:'live',featured:true})).toEqual(data);
 for(const bad of [{...data,quantity:-1},{...data,quantity:1.5},{...data,hours:{monday:'25:00-17:00'}},{...data,hours:{fake:'closed'}},{...data,unit:'gold'}])expect(validateBusiness(bad)).toBeNull();
});
test('owner route reuses authenticated identity and origin; ADMIN cannot spoof ownership',async()=>{
 const calls:any[]=[];const store={mine:async()=>[],inspect:async()=>({authorized:false,requested:false}),claim:async(...args:any[])=>{calls.push(args);return true;},update:async()=>false,requests:async()=>[]};
 const handler=createBusinessRoutes(store,{currentUser:async()=>({id:owner,roles:['ADMIN']})},new Set([origin]),true);
 const request=(body:any,site=origin)=>new Request(origin+'/v1/radar/business',{method:'POST',headers:{origin:site},body:JSON.stringify(body)});
 expect((await handler(request({action:'claim',id,reason:'Soy representante autorizado',accountRef:other})))?.status).toBe(201);
 expect(calls[0]).toEqual([id,owner,'Soy representante autorizado']);
 expect((await handler(request({action:'update',id,...data})))?.status).toBe(403);
 expect((await handler(request({action:'claim',id,reason:'Soy representante autorizado'},'https://evil.test')))?.status).toBe(403);
});
test('approved owner can update basic availability; revocation immediately denies writes and public details',async()=>{
 const pg=new PGlite();try{
 await pg.exec('CREATE SCHEMA ad507; CREATE TABLE ad507.users(id uuid PRIMARY KEY)');
 await pg.exec(readFileSync(new URL('../radar/schema.sql',import.meta.url),'utf8'));
 await pg.exec(readFileSync(new URL('../radar/ownership.sql',import.meta.url),'utf8'));
 await pg.exec(readFileSync(new URL('../radar/business-details.sql',import.meta.url),'utf8'));
 const db={unsafe:async(q:string,p:any[])=> (await pg.query(q,p)).rows as any[]};
 await db.unsafe('INSERT INTO ad507.users(id) VALUES($1),($2)',[owner,other]);
 await db.unsafe("INSERT INTO radar.establishments(id,account_ref,name,category,country,latitude,longitude,published) VALUES($1,$2,'Test','restaurant','PA',8,-80,true)",[id,owner]);
 const store=createBusinessStore(db);
  expect((await store.mine(owner))[0]).toMatchObject({id,submitted:true,authorized:false,requested:false}); // A contribution remains visible, without ownership rights.
 expect(await store.claim(id,other,'Soy representante autorizado')).toBe(true);
 expect(await store.claim(id,other,'Solicitud repetida no modifica permiso')).toBe(false);
 expect((await store.mine(other))[0]).toMatchObject({id,authorized:false,requested:true});
 expect(await store.update(id,other,data)).toBe(false);
 await db.unsafe('INSERT INTO radar.verified_owners(establishment_id,account_ref) VALUES($1,$2)',[id,owner]);
 expect((await store.mine(owner))[0]).toMatchObject({id,authorized:true,requested:false});
 expect(await store.update(id,owner,data)).toBe(true);
 expect((await store.inspect(id,owner)).quantity).toBe(10);
 const {createRadarRepository}=await import('../radar/repository');
 const {publicFeatures}=await import('../radar/public-map');
 const repo=createRadarRepository(db,true,undefined,true),bounds={west:-83,south:7,east:-77,north:10};
 let rows=await repo.listPublished('PA',bounds);expect(rows[0].details?.quantity).toBe(10);
 expect(publicFeatures(rows,bounds,'PA',Date.now(),true).features[0].properties.pin).toBe('normal');
 expect((await db.unsafe('SELECT count(*)::int AS n FROM radar.activity_reports',[]))[0].n).toBe(0);
 await db.unsafe('DELETE FROM radar.verified_owners WHERE establishment_id=$1',[id]);
  expect((await store.mine(owner))[0]).toMatchObject({id,submitted:true,authorized:false,requested:false}); // A contribution remains visible, without ownership rights.
 expect(await store.update(id,owner,data)).toBe(false);
 rows=await repo.listPublished('PA',bounds);expect(rows[0].details).toBeUndefined();
 }finally{await pg.close();}
},20000);
