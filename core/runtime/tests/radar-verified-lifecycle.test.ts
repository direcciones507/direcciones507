import {expect,test} from 'bun:test';
import {PGlite} from '@electric-sql/pglite';
import type {Sql} from 'postgres';
import {readFileSync} from 'node:fs';
import {createRadarVerifiedOrderReconciler} from '../radar/verified-orders';
import {radarAnnualUntil} from '../radar/annual-memberships';
import {createRadarCampaignLookup} from '../radar/campaign-repository';
import {createRadarCoverRepository} from '../radar/cover-repository';
import {sendRadarAnnualReminders} from '../radar/annual-reminders';

test('verified Radar orders, renewals, refunds and idempotent reminders',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(`CREATE SCHEMA ad507;
   CREATE TABLE ad507.users(id uuid PRIMARY KEY,email text,status text);
   CREATE TABLE ad507.orders(id uuid PRIMARY KEY,user_id uuid,address_id uuid,status text,currency text,
    amount_cents int,provider text,provider_reference text,provider_order_id text,payment_environment text,confirmed_at timestamptz);
   CREATE TABLE ad507.audit_log(actor_type text,action text,entity_type text,entity_id text,metadata jsonb,after_json jsonb,created_at timestamptz DEFAULT now());`);
  for(const file of ['schema','ownership','registration-profiles','campaigns','annual-memberships','verified-orders']){
   await pg.exec(readFileSync(new URL('../radar/'+file+'.sql',import.meta.url),'utf8'));
  }
  const db={
   unsafe:async(q:string,p:unknown[])=>(await pg.query(q,p)).rows,
   begin:(callback:(tx:unknown)=>Promise<unknown>)=>pg.transaction(tx=>callback({
    unsafe:async(q:string,p:unknown[])=>(await tx.query(q,p)).rows,
   })),
  } as unknown as Sql;
  const id='10000000-0000-4000-8000-000000000001',owner='20000000-0000-4000-8000-000000000001';
  const stranger='20000000-0000-4000-8000-000000000002';
  const initial='2026-01-01T00:00:00Z',end=Date.parse('2027-01-01T00:00:00Z');
  await db.unsafe("INSERT INTO ad507.users VALUES($1::uuid,'owner@example.test','ACTIVE'),($2::uuid,'other@example.test','ACTIVE')",[owner,stranger]);
  await db.unsafe("INSERT INTO radar.establishments(id,account_ref,name,category,country,latitude,longitude,published) VALUES($1::uuid,$2::uuid,'Synthetic','shop','PA',8,-80,true)",[id,owner]);
  await db.unsafe('INSERT INTO radar.verified_owners(establishment_id,account_ref) VALUES($1::uuid,$2::uuid)',[id,owner]);
  const seed=async(n:number,product:string,price:number,options:{account?:string;environment?:string;proof?:boolean}={})=>{
   const key='30000000-0000-4000-8000-'+String(n).padStart(12,'0');
   const account=options.account??owner;
   await db.unsafe(`INSERT INTO ad507.orders VALUES($1::uuid,$2::uuid,NULL,'PAID','USD',$3,'FAKE','reference-'||$1::text,'checkout-'||$1::text,$4,$5::timestamptz)`,
    [key,account,price,options.environment??'production',initial]);
   await db.unsafe(`INSERT INTO radar.verified_order_intents VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5::timestamptz)`,[key,id,account,product,initial]);
   if(options.proof!==false)await db.unsafe(`INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,after_json)
    VALUES('SYSTEM','RADAR_PROVIDER_PAYMENT_VERIFIED','ORDER',$1,jsonb_build_object('status','PAID','provider','FAKE',
      'providerOrderId','checkout-'||$1::text,'providerReference','reference-'||$1::text))`,[key]);
   return key;
  };
  const activate=createRadarVerifiedOrderReconciler(db,true);
  const annual=await seed(1,'annual',999);
  expect(await createRadarVerifiedOrderReconciler(db)(annual)).toBe(false);
  for(const invalid of [await seed(2,'annual',998),await seed(3,'annual',999,{environment:'test'}),
   await seed(4,'annual',999,{proof:false}),await seed(5,'annual',999,{account:stranger})]){
   expect(await activate(invalid)).toBe(false);
  }
  expect((await Promise.all([activate(annual),activate(annual)])).sort()).toEqual([false,true]);
  const duplicate=await seed(9,'annual',999);
  await db.unsafe("UPDATE ad507.orders SET provider_reference='reference-'||$2::text WHERE id=$1::uuid",[duplicate,annual]);
  await db.unsafe("UPDATE ad507.audit_log SET after_json=after_json||jsonb_build_object('providerReference','reference-'||$2::text) WHERE entity_id=$1",[duplicate,annual]);
  expect(await activate(duplicate)).toBe(false);
  expect((await radarAnnualUntil(db,[id],end-1,true)).get(id)).toBe(end);
  expect((await radarAnnualUntil(db,[id],end,true)).size).toBe(0);
  const delivered:string[]=[];
  const mailer={configured:true,send:async(message:{text:string})=>{delivered.push(message.text);return {sent:true};}};
  for(const days of [15,7,1]){
   const clock=new Date(end-days*86400000);
   const results=await Promise.all([sendRadarAnnualReminders(db,mailer,clock),sendRadarAnnualReminders(db,mailer,clock)]);
   expect(results.reduce((a,b)=>a+b,0)).toBe(1);
  }
  expect(delivered).toHaveLength(3);
  const renewal=await seed(6,'annual',999);
  expect(await activate(renewal)).toBe(true);
  expect((await radarAnnualUntil(db,[id],end,true)).get(id)).toBe(Date.parse('2028-01-01T00:00:00Z'));
  await db.unsafe("UPDATE ad507.orders SET status='REFUNDED' WHERE id=$1::uuid",[renewal]);
  expect((await radarAnnualUntil(db,[id],end,true)).size).toBe(0);

  const live=await seed(7,'live',199),featured=await seed(8,'featured',399);
  expect(await activate(live)).toBe(true);
  expect(await activate(featured)).toBe(true);
  const lookup=createRadarCampaignLookup(db,true,true),at=Date.parse(initial);
  expect((await lookup([id],at)).get(id)?.kind).toBe('live');
  expect((await lookup([id],at+3600000)).get(id)?.kind).toBe('featured');
  // Cover access uses the same paid campaign guard.
  const cover=createRadarCoverRepository(db,true);
  expect(await cover.canUpload(owner,id)).toBe(false);
  await db.unsafe("UPDATE ad507.orders SET status='REFUNDED' WHERE id=$1::uuid",[live]);
  expect((await lookup([id],at)).get(id)?.kind).toBe('featured');
  await db.unsafe("UPDATE ad507.orders SET status='REFUNDED' WHERE id=$1::uuid",[featured]);
  expect((await lookup([id],at)).size).toBe(0);
 }finally{await pg.close();}
},20000);
