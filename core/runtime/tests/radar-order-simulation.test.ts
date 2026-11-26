import type {Sql} from 'postgres';
import {createCoreRadarAdmin} from '../radar/core-admin';
import {test,expect} from 'bun:test';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {createRadarOrderSimulation} from '../radar/order-simulation';
const id='00000000-0000-4000-8000-000000000001',owner='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
test('simulation is disabled by default and never touches the database',async()=>{
 const s=createRadarOrderSimulation({unsafe:async()=>{throw Error('disabled');}});
 expect(await s.create(id,owner,'annual',id)).toBeNull();
 expect(await s.confirm(id,owner)).toBeNull();
});
test('independent orders, ownership, catalog, idempotency, confirmation and isolation',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec('CREATE SCHEMA ad507;CREATE TABLE ad507.users(id uuid PRIMARY KEY)');
  for(const f of ['schema.sql','ownership.sql','registration-profiles.sql','campaigns.sql','simulated-orders.sql'])await pg.exec(readFileSync(new URL('../radar/'+f,import.meta.url),'utf8'));
  await pg.query('INSERT INTO ad507.users VALUES($1),($2)',[owner,other]);
  await pg.query("INSERT INTO radar.establishments(id,account_ref,name,category,country,latitude,longitude,published) VALUES($1,$2,'Synthetic','shop','PA',8,-80,true)",[id,owner]);
  await pg.query('INSERT INTO radar.verified_owners(establishment_id,account_ref) VALUES($1,$2)',[id,owner]);
  const s=createRadarOrderSimulation({unsafe:async(q,p)=>(await pg.query(q,p)).rows as any[]},true);
  expect(await s.create(id,other,'annual',id)).toBeNull();
  expect(await s.create(id,owner,'basic',id)).toBeNull();
  const annual=await s.create(id,owner,'annual',id);
  const live=await s.create(id,owner,'live',owner);
  const featured=await s.create(id,owner,'featured',other);
  expect([annual.amount_cents,live.amount_cents,featured.amount_cents]).toEqual([999,199,399]);
  expect((await s.create(id,owner,'annual',id)).id).toBe(annual.id);
  expect(await s.create(id,owner,'live',id)).toBeNull();
  expect(await s.confirm(live.id,other)).toBeNull();
  const confirmed=await s.confirm(live.id,owner);
  expect(new Date(confirmed.simulated_until).getTime()-new Date(confirmed.confirmed_at).getTime()).toBe(3600000);
  expect(await s.confirm(live.id,owner)).toBeNull();
  expect((await pg.query('SELECT * FROM radar.campaigns')).rows).toHaveLength(0);
  expect((await pg.query('SELECT * FROM radar.simulated_orders')).rows).toHaveLength(3);
  expect((await pg.query('SELECT * FROM radar.simulated_orders WHERE confirmed_at IS NOT NULL')).rows).toHaveLength(1);
 }finally{await pg.close();}
},20000);


test('owner panel orders are scoped, serialized and renew only simulated time',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec('CREATE SCHEMA ad507;CREATE TABLE ad507.users(id uuid PRIMARY KEY)');
  for(const f of ['schema.sql','ownership.sql','registration-profiles.sql','campaigns.sql','simulated-orders.sql'])await pg.exec(readFileSync(new URL('../radar/'+f,import.meta.url),'utf8'));
  await pg.query('INSERT INTO ad507.users VALUES($1),($2)',[owner,other]);
  await pg.query("INSERT INTO radar.establishments(id,account_ref,name,category,country,latitude,longitude,published) VALUES($1,$2,'Synthetic','shop','PA',8,-80,true)",[id,owner]);
  await pg.query('INSERT INTO radar.verified_owners(establishment_id,account_ref) VALUES($1,$2)',[id,owner]);
  const db={
   unsafe:async(q:string,p:unknown[])=>(await pg.query(q,p)).rows as any[],
   begin:(callback:(tx:unknown)=>Promise<unknown>)=>pg.transaction(tx=>callback({
    unsafe:async(q:string,p:unknown[])=>(await tx.query(q,p)).rows,
   })),
  } as unknown as Sql;
  const env={RADAR_ENABLED:'true',RADAR_OWNERSHIP_ENABLED:'true',RADAR_BUSINESS_DETAILS_ENABLED:'true',RADAR_CORE_ADMIN_ENABLED:'true',
   RADAR_REGISTRATION_PROFILES_ENABLED:'true',RADAR_COMMERCIAL_MODEL_ENABLED:'true',RADAR_PROMOTION_SIMULATION_ENABLED:'true'};
  const auth={currentUser:async(req:Request)=>({id:req.headers.get('x-test-account')!,roles:[]})};
  const handler=createCoreRadarAdmin(db,auth,env);
  const request=(body:object,account=owner,origin='https://direcciones.lat')=>new Request('https://direcciones.lat/v1/user/radar/business',{
   method:'POST',headers:{origin,'content-type':'application/json','x-test-account':account},body:JSON.stringify({id,...body})
  });
  const order=(product:string,previous:string|null)=>({action:'promotion_simulation_request',product,previous});
  const list={action:'promotion_simulation_status'};
  expect((await createCoreRadarAdmin(db,auth,{...env,RAILWAY_ENVIRONMENT_NAME:'production'})(request(list)))?.status).toBe(404);
  expect((await handler(request(list,other)))?.status).toBe(403);
  expect((await handler(request(order('live',null),other)))?.status).toBe(403);
  expect((await handler(request(order('live',null),owner,'https://radar.direcciones.lat')))?.status).toBe(403);
  const [first,duplicate]=await Promise.all([handler(request(order('live',null))),handler(request(order('live',null)))]);
  const responses=[first!,duplicate!];
  expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
  const current=(await responses.find(r=>r.status===200)!.json()).items[0];
  const renewal=await handler(request(order('live',current.id)));
  expect(renewal?.status).toBe(200);
  const next=(await renewal!.json()).items[0];
  expect(Date.parse(next.ends_at)-Date.parse(current.ends_at)).toBe(3600000);
  expect((await handler(request(order('live',current.id))))?.status).toBe(409);
  expect((await handler(request(order('featured',null))))?.status).toBe(200);
  expect((await (await handler(request(list)))!.json()).items).toHaveLength(2);
  expect((await pg.query('SELECT id FROM radar.simulated_orders')).rows).toHaveLength(3);
  expect((await pg.query('SELECT id FROM radar.campaigns')).rows).toHaveLength(0);
 }finally{await pg.close();}
},20000);
