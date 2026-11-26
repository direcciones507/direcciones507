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
