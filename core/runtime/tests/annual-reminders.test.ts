import {test,expect} from 'bun:test';
import {PGlite} from '@electric-sql/pglite';
import {annualEnd,ANNUAL_POLICY} from '../annual-service';
import {sendAnnualReminders} from '../annual-reminders';

test('annual reminders claim 15, 7 and 1 day once per term and exclude historical and courtesy records',async()=>{
 const db=new PGlite();
 const owner='11111111-1111-4111-8111-111111111111';
 const address='22222222-2222-4222-8222-222222222222';
 const sql:any={
  unsafe:async(q:string,params:unknown[]) => (await db.query(q,params)).rows,
  begin:(fn:any)=>db.transaction(tx=>fn({unsafe:async(q:string,params:unknown[])=>(await tx.query(q,params)).rows}))
 };
 const sent:string[]=[];
 const mailer={configured:true,send:async(mail:{to:string;text:string})=>{expect(mail.to).toBe('customer@example.test');sent.push(mail.text);return {sent:true};}};
 try{
  await db.exec(`CREATE SCHEMA ad507;
   CREATE TABLE ad507.addresses(id uuid PRIMARY KEY,status text,source text,publication_receipt text,request_data jsonb);
   CREATE TABLE ad507.users(id uuid PRIMARY KEY,email text,status text);
   CREATE TABLE ad507.address_ownership(user_id uuid,address_id uuid,ownership_role text);
   CREATE TABLE ad507.audit_log(actor_type text,action text,entity_type text,entity_id text,metadata jsonb);`);
  const startsAt='2026-02-01T00:00:00.000Z',endsAt=annualEnd(startsAt);
  const annualService={policy:ANNUAL_POLICY,startsAt,endsAt,mode:'ANNUAL'};
  await db.query("INSERT INTO ad507.users VALUES ($1,'customer@example.test','ACTIVE')",[owner]);
  for(const [id,terms] of [
   [address,{annualService}],
   ['33333333-3333-4333-8333-333333333333',{annualService,migration:{}}],
   ['44444444-4444-4444-8444-444444444444',{annualService:{...annualService,mode:'ADMIN_EXEMPT'}}]
  ]){
   await db.query("INSERT INTO ad507.addresses VALUES ($1,'ACTIVE','USER_REQUEST','receipt',$2)",[id,terms]);
   await db.query("INSERT INTO ad507.address_ownership VALUES ($1,$2,'OWNER')",[owner,id]);
  }
  for(const days of [15,7,1]){
   const now=new Date(Date.parse(endsAt)-days*86400000);
   expect(await sendAnnualReminders(sql,mailer as any,now)).toBe(1);
   expect(await sendAnnualReminders(sql,mailer as any,now)).toBe(0);
  }
  expect(await sendAnnualReminders(sql,mailer as any,new Date(endsAt))).toBe(0);
  expect(sent).toHaveLength(3);
 }finally{await db.close();}
});
