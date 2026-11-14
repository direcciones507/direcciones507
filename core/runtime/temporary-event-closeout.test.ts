import {test,expect} from 'bun:test';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {validateTemporaryEventDraft} from './temporary-event-draft';
import {createHmac} from 'node:crypto';
import {createTemporaryEventPayment} from './temporary-event-payment';
import {createTemporaryEventRefunds,expireTemporaryEvents} from './temporary-event-ledger';
const config={environment:'test' as const,merchantId:'fixture',domain:'https://direcciones.lat',secret:Buffer.from('fixture.secret').toString('base64'),ipnUrl:'https://direcciones.lat/v1/payments/temporary-events/yappy/ipn'};
const owner='11111111-1111-4111-8111-111111111111';
function adapter(db:any):any{return {unsafe:async(q:string,p:any[]=[]) =>(await db.query(q,p)).rows,json:JSON.stringify,begin:async(fn:any)=>db.transaction((tx:any)=>fn(adapter(tx)))}}
async function fixture(){
 const db=new PGlite();await db.exec(`CREATE SCHEMA ad507;CREATE TABLE ad507.users(id uuid PRIMARY KEY);INSERT INTO ad507.users VALUES('${owner}');CREATE TABLE ad507.audit_log(id bigserial PRIMARY KEY,actor_type text,action text,entity_type text,entity_id text,metadata jsonb,created_at timestamptz DEFAULT now());`);
 await db.exec(readFileSync(new URL('./schema-proposals/temporary-events.sql',import.meta.url),'utf8'));
 const sql=adapter(db);const [event]=await sql.unsafe(`INSERT INTO ad507.temporary_events(owner_user_id,slug,title,responsible_name,responsible_email,responsible_phone,country_code,region,municipality,locality,starts_on,ends_on,event_timezone) VALUES($1,'fixture-event','Evento fixture','Fixture','fixture@example.test','60000000','PA','Veraguas','Santiago','Santiago',current_date,current_date,'America/Panama') RETURNING *`,[owner]);
 await sql.unsafe("INSERT INTO ad507.temporary_event_media(event_id,slot,object_key,mime_type,byte_size) VALUES($1,1,'fixture','image/webp',10)",[event.id]);
 const payment=createTemporaryEventPayment(sql,config,{createOrder:async()=>({transactionId:'fixture-transaction',token:'fixture',documentName:'fixture'})} as any);
 const intent=await payment.initialize(owner,event.id,'60000000');const [order]=await sql.unsafe('SELECT * FROM ad507.temporary_event_orders WHERE id=$1',[intent.orderId]);
 const ipn=(status='E')=>new URLSearchParams({orderId:order.provider_order_id,status,domain:config.domain,hash:createHmac('sha256','fixture').update(order.provider_order_id+status+config.domain).digest('hex')});
 return {db,sql,event,order,payment,ipn};
}
test('temporary payment: signed receipt, immutable quote, duplicate delivery and lifecycle history',async()=>{
 const f=await fixture();try{
 expect((await f.sql.unsafe('SELECT status FROM ad507.temporary_events WHERE id=$1',[f.event.id]))[0].status).toBe('AWAITING_PAYMENT');
 await expect(f.payment.initialize(owner,f.event.id,'60000000')).rejects.toThrow('EVENT_NOT_PAYABLE');
 const bad=f.ipn();bad.set('hash','0'.repeat(64));await expect(f.payment.confirm(bad)).rejects.toThrow();
 await f.sql.unsafe('UPDATE ad507.temporary_event_orders SET amount_cents=799 WHERE id=$1',[f.order.id]);
 // Historic 799 remains valid by policy; use wrong environment to test rejection without altering accepted quotes.
 await f.sql.unsafe("UPDATE ad507.temporary_event_orders SET environment='production' WHERE id=$1",[f.order.id]);await expect(f.payment.confirm(f.ipn())).rejects.toThrow('INVALID_PAYMENT_ORDER');
 await f.sql.unsafe("UPDATE ad507.temporary_event_orders SET amount_cents=1299,environment='test' WHERE id=$1",[f.order.id]);
 await f.payment.confirm(f.ipn('R'));await f.payment.confirm(f.ipn('R'));
 const results=await Promise.all([f.payment.confirm(f.ipn()),f.payment.confirm(f.ipn())]);expect(results.filter(x=>x.unchanged)).toHaveLength(1);
 const records=await f.sql.unsafe('SELECT * FROM ad507.audit_log ORDER BY id');
 expect(records.filter((x:any)=>x.action==='TEMPORARY_EVENT_PAYMENT_CONFIRMED')).toHaveLength(1);
 expect(records.filter((x:any)=>x.action==='TEMPORARY_EVENT_NOTIFICATION'&&x.metadata.type==='PAYMENT_CONFIRMED')).toHaveLength(1);
 const activation=records.find((x:any)=>x.action==='TEMPORARY_EVENT_ACTIVATED');expect(activation.metadata.activatedAt).toBeTruthy();expect(activation.metadata.expiresAt).toBeTruthy();
 await f.sql.unsafe("UPDATE ad507.temporary_events SET ends_on=current_date-3,starts_on=current_date-4 WHERE id=$1",[f.event.id]);
 expect(await expireTemporaryEvents(f.sql)).toBe(1);expect(await expireTemporaryEvents(f.sql)).toBe(0);
 expect((await f.sql.unsafe("SELECT * FROM ad507.audit_log WHERE action='TEMPORARY_EVENT_EXPIRED'"))).toHaveLength(1);
 }finally{await f.db.close()}
});
test('refund: pending without provider; exact verified full refund cancels only once and preserves capture',async()=>{
 const f=await fixture();try{
 await f.payment.confirm(f.ipn());const pending=createTemporaryEventRefunds(f.sql);
 expect((await pending.request(f.order.id,'fixture-request')).status).toBe('PENDING_PROVIDER');expect((await pending.request(f.order.id,'fixture-request')).unchanged).toBe(true);
 await expect(pending.confirm(f.order.id,'fixture-refund')).rejects.toThrow('REFUND_PROVIDER_UNAVAILABLE');
 const proof={reference:'fixture-refund',providerOrderId:f.order.provider_order_id,transactionId:'fixture-transaction',amountCents:1299,currency:'USD',environment:'test',status:'PENDING' as any};
 const refunds=createTemporaryEventRefunds(f.sql,async()=>proof);
 await refunds.confirm(f.order.id,proof.reference);expect((await f.sql.unsafe('SELECT status FROM ad507.temporary_events WHERE id=$1',[f.event.id]))[0].status).toBe('ACTIVE');
 proof.status='CONFIRMED';proof.amountCents=1;await expect(refunds.confirm(f.order.id,proof.reference)).rejects.toThrow('INVALID_REFUND_CONFIRMATION');proof.amountCents=1299;
 expect((await refunds.confirm(f.order.id,proof.reference)).unchanged).toBe(false);expect((await refunds.confirm(f.order.id,proof.reference)).unchanged).toBe(true);
 await f.payment.confirm(f.ipn());
 expect((await f.sql.unsafe('SELECT status FROM ad507.temporary_events WHERE id=$1',[f.event.id]))[0].status).toBe('CANCELLED');
 expect((await f.sql.unsafe('SELECT status FROM ad507.temporary_event_orders WHERE id=$1',[f.order.id]))[0].status).toBe('PAID');
 expect((await f.sql.unsafe("SELECT * FROM ad507.audit_log WHERE action='TEMPORARY_EVENT_NOTIFICATION' AND metadata->>'type'='REFUNDED'"))).toHaveLength(1);
 }finally{await f.db.close()}
});

test('ambiguous initialization keeps intent pending and never retries the charge',async()=>{
 const f=await fixture();try{
 await f.sql.unsafe('UPDATE ad507.temporary_events SET payment_order_id=NULL,status=\'DRAFT\' WHERE id=$1',[f.event.id]);await f.sql.unsafe('DELETE FROM ad507.temporary_event_orders WHERE id=$1',[f.order.id]);
 let calls=0;const payment=createTemporaryEventPayment(f.sql,config,{createOrder:async()=>{calls++;throw Error('fixture timeout')}} as any);
 await expect(payment.initialize(owner,f.event.id,'60000000')).rejects.toThrow('YAPPY_PROVIDER_UNCONFIRMED');
 await expect(payment.initialize(owner,f.event.id,'60000000')).rejects.toThrow('EVENT_NOT_PAYABLE');expect(calls).toBe(1);
 const [order]=await f.sql.unsafe('SELECT * FROM ad507.temporary_event_orders WHERE event_id=$1',[f.event.id]);expect(order.status).toBe('PENDING');expect(order.provider_reference).toBe('INITIALIZING');
 expect((await f.sql.unsafe("SELECT * FROM ad507.audit_log WHERE action='TEMPORARY_EVENT_PAYMENT_ERROR'"))).toHaveLength(1);
 }finally{await f.db.close()}
});
test('unapproved palette is rejected before draft persistence',()=>{
 expect(()=>validateTemporaryEventDraft({palette:'UNAPPROVED'})).toThrow('UNAPPROVED_EVENT_PALETTE');
});
