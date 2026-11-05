import {beforeAll,afterAll,test,expect} from 'bun:test';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import postgres from 'postgres';
import {readFileSync} from 'node:fs';
import {createPaymentRepository} from '../payment-repository';
import {createRequestRepository} from '../request-repository';
import {createNewAddressPublication} from '../new-address-publication';
import {createPayPalSandboxProvider,paypalSandboxSchemaReady} from '../paypal-provider';
let db:any,sql:any;
const owner=crypto.randomUUID(),other=crypto.randomUUID();
function adapter(ex:any):any{const s:any={unsafe:(q:string,p:any[]=[])=>p.length?ex.query(q,p).then((r:any)=>r.rows):ex.exec(q).then((results:any[])=>results.flatMap(r=>r.rows)),json:JSON.stringify};s.begin=(fn:any)=>ex.transaction((t:any)=>fn(adapter(t)));s.reserve=async()=>({...s,release:()=>{}});return s;}
beforeAll(async()=>{
 const native=process.env.AD507_PAYPAL_TEST_DATABASE_URL;
 if(native){const u=new URL(native);if(!['127.0.0.1','localhost'].includes(u.hostname)||u.pathname!=='/paypal_sandbox_test')throw Error('ISOLATED_PAYPAL_TEST_DATABASE_REQUIRED');sql=postgres(native,{max:4});}
 else{db=new PGlite({extensions:{pgcrypto}});sql=adapter(db);}
 expect(await paypalSandboxSchemaReady(sql)).toBe(false);
 const initial=native?await sql.reserve():sql;
 const root=new URL('../../../',import.meta.url);
 for(const name of ['0000_migration_ledger.sql','0001_core_foundation.sql','0002_plan_catalog.sql','0003_plan_capabilities.sql','0005_general_google_auth.sql'])await initial.unsafe(readFileSync(new URL('db/migrations/'+name,root),'utf8'));
 for(const name of ['landline','requests','countries','payments','paypal'])await initial.unsafe(readFileSync(new URL('../schema-proposals/'+name+'.sql',import.meta.url),'utf8'));
 expect(await paypalSandboxSchemaReady(sql)).toBe(true);
 await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1,'synthetic-paypal@example.test'),($2,'synthetic-other@example.test')",[owner,other]);if(native)await initial.release();
},30000);
afterAll(async()=>{if(db)await db.close();else await sql?.end();});
async function address(plan='BUSINESS_PREMIUM',extra:any={}){
 const id=crypto.randomUUID();await sql.unsafe("INSERT INTO ad507.addresses(id,code,address_type,status,name,reference,latitude,longitude,source,request_key_hash,country_code,plan_id,request_data) VALUES($1::uuid,NULL,$2,'DRAFT',$3,'Synthetic',8,-80,'USER_REQUEST',$1::text,'PA',(SELECT id FROM ad507.plans WHERE code=$4),$5::jsonb)",[id,plan==='RESIDENTIAL'?'RESIDENTIAL':'BUSINESS','Synthetic '+id,plan,JSON.stringify({plan,workflow:'PAYMENT_PENDING',countryCode:'PA',media:{logos:0,placePhotos:0,galleryPhotos:0},...extra})]);await sql.unsafe('INSERT INTO ad507.address_ownership(address_id,user_id) VALUES($1,$2)',[id,owner]);return id;
}
const providerFor=(id:string,amountCents=1999)=>{let status='CREATED',bad=false,fail=false,captures=0;const ref='PP'+id.replaceAll('-','').slice(0,20).toUpperCase(),config={environment:'test' as const,clientId:'synthetic',clientSecret:'synthetic',merchantId:'SYNTHETICMERCHANT',webhookId:'synthetic'};
 const p=createPayPalSandboxProvider(config,async(url:any,init:any)=>{if(String(url).endsWith('/token'))return Response.json({access_token:'synthetic'});if(String(url).endsWith('verify-webhook-signature'))return Response.json({verification_status:'SUCCESS'});if(fail){fail=false;throw Error('synthetic timeout');}if(String(url).endsWith('/capture')){captures++;status='COMPLETED';}
 return Response.json({id:ref,status,purchase_units:[{custom_id:id,payee:{merchant_id:bad?'OTHER':config.merchantId},amount:{currency_code:'USD',value:(amountCents/100).toFixed(2)},payments:{captures:status==='COMPLETED'?[{id:'CAP'+ref,status:'COMPLETED',amount:{currency_code:'USD',value:(amountCents/100).toFixed(2)},final_capture:true}]:[]}}]});});
 return {p,ref,approve:()=>{status='APPROVED';},setBad:()=>{bad=true;},failOnce:()=>{fail=true;},captures:()=>captures};};
const publication=()=>createRequestRepository(sql,{r2:null,paidWorkflow:true,paymentEnvironment:'test',canonical:createNewAddressPublication(sql,{namespaceExclusive:true,fetch:async()=>Response.json({ok:true,codes:[{codigo:'AD507-HISTORICO'}]})})});
test('Premium and Premium Pro publish only after verified capture via the existing canonical publisher',async()=>{
 for(const plan of ['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO']){
  const a=await address(plan),requests=publication(),repo=createPaymentRepository(sql,{provider:'PAYPAL',environment:'test'},{onVerifiedPayment:id=>requests.activatePaid(id)});
  const intent=await repo.preparePayPal(owner,a,'synthetic-stable-'+a),f=providerFor(intent.order.id,intent.order.amount_cents);
  const provider=f.p;
  await repo.initializePayPal(owner,intent.order.id,provider);
  await expect(repo.confirmPayPal(owner,intent.order.id,provider)).rejects.toThrow('PAYMENT_CONFIRMATION_REQUIRED');
  expect((await sql.unsafe('SELECT status,code FROM ad507.addresses WHERE id=$1',[a]))[0]).toMatchObject({status:'DRAFT',code:null});
  f.approve();await repo.confirmPayPal(owner,intent.order.id,provider,true);await repo.confirmPayPal(owner,intent.order.id,provider,true);
  expect((await sql.unsafe('SELECT status,publication_receipt FROM ad507.addresses WHERE id=$1',[a]))[0].status).toBe('ACTIVE');expect(f.captures()).toBe(1);
  expect((await sql.unsafe("SELECT count(*)::int AS n FROM ad507.audit_log WHERE entity_id=$1 AND action='PAYPAL_PAYMENT_CONFIRMED'",[intent.order.id]))[0].n).toBe(1);
 }
});
test('new server intents reject Residential free historical and foreign ownership without charging',async()=>{
 const repo=createPaymentRepository(sql,{provider:'PAYPAL',environment:'test'});
 for(const [plan,extra]of [['RESIDENTIAL',{}],['BUSINESS_FREE',{}],['BUSINESS_PREMIUM',{migration:{}}]] as any){await expect(repo.preparePayPal(owner,await address(plan,extra),'synthetic-refusal-key')).rejects.toThrow('INVALID_PAYMENT_REQUEST');}
 const a=await address();await expect(repo.preparePayPal(other,a,'synthetic-foreign-key')).rejects.toThrow('PAYMENT_NOT_FOUND');
});
test('timeout retries preserve one local intent and stable provider reference; expired uncertainty requires reconciliation',async()=>{
 const repo=createPaymentRepository(sql,{provider:'PAYPAL',environment:'test'}),a=await address(),intent=await repo.preparePayPal(owner,a,'synthetic-retry-key'),f=providerFor(intent.order.id);
 f.failOnce();await expect(repo.initializePayPal(owner,intent.order.id,f.p)).rejects.toThrow('PAYPAL_PROVIDER_UNCONFIRMED');
 await repo.initializePayPal(owner,intent.order.id,f.p);expect((await repo.initializePayPal(owner,intent.order.id,f.p)).providerOrderId).toBe(f.ref);
 expect((await repo.preparePayPal(owner,a,'synthetic-retry-key')).order.id).toBe(intent.order.id);
 const b=await repo.preparePayPal(owner,await address(),'synthetic-stale-key');await sql.unsafe("UPDATE ad507.orders SET provider_reference='INITIALIZING:'||id::text,updated_at=now()-interval '7 hours' WHERE id=$1",[b.order.id]);await expect(repo.initializePayPal(owner,b.order.id,f.p)).rejects.toThrow('PAYMENT_RECONCILIATION_REQUIRED');
});
test('signed webhook re-reads exact order and merchant; duplicate delivery and publication failures retry safely',async()=>{
 const a=await address(),requests=publication();let fail=true;
 const repo=createPaymentRepository(sql,{provider:'PAYPAL',environment:'test'},{onVerifiedPayment:async id=>{if(fail){fail=false;throw Error('synthetic publication failure');}return requests.activatePaid(id);}}),intent=await repo.preparePayPal(owner,a,'synthetic-webhook-key'),f=providerFor(intent.order.id);await repo.initializePayPal(owner,intent.order.id,f.p);f.approve();
 const headers=new Headers();for(const k of ['auth-algo','cert-url','transmission-id','transmission-sig','transmission-time'])headers.set('paypal-'+k,'synthetic');
 const event={id:'SYNTHETICEVENT',event_type:'CHECKOUT.ORDER.APPROVED',resource:{id:f.ref}};
 await expect(repo.receivePayPalWebhook(headers,event,f.p)).rejects.toThrow('PAYMENT_PUBLICATION_PENDING');expect((await repo.readPayPal(owner,intent.order.id)).status).toBe('PAID');
 await repo.receivePayPalWebhook(headers,event,f.p);await repo.receivePayPalWebhook(headers,event,f.p);expect(f.captures()).toBe(1);expect((await sql.unsafe('SELECT status FROM ad507.addresses WHERE id=$1',[a]))[0].status).toBe('ACTIVE');
 const b=await repo.preparePayPal(owner,await address(),'synthetic-mismatch-key'),bad=providerFor(b.order.id);await repo.initializePayPal(owner,b.order.id,bad.p);bad.approve();bad.setBad();await expect(repo.confirmPayPal(owner,b.order.id,bad.p,true)).rejects.toThrow('PAYPAL_ORDER_MISMATCH');expect((await repo.readPayPal(owner,b.order.id)).status).toBe('PENDING');
});
test.skipIf(!process.env.AD507_PAYPAL_TEST_DATABASE_URL)('native concurrent prepare and confirmations keep one intent and one paid transition',async()=>{
 const repo=createPaymentRepository(sql,{provider:'PAYPAL',environment:'test'}),a=await address();
 const [x,y]=await Promise.all([repo.preparePayPal(owner,a,'synthetic-concurrent-key'),repo.preparePayPal(owner,a,'synthetic-concurrent-key')]);expect(x.order.id).toBe(y.order.id);
 const f=providerFor(x.order.id);await repo.initializePayPal(owner,x.order.id,f.p);
 const proof={confirmedCapture:async()=>({status:'PAID',captureId:'SYNTHETICCAPTURE'})} as any;
 const confirmed=await Promise.all([repo.confirmPayPal(owner,x.order.id,proof),repo.confirmPayPal(owner,x.order.id,proof)]);expect(confirmed.filter(r=>!r.unchanged)).toHaveLength(1);
 expect((await sql.unsafe("SELECT count(*)::int AS n FROM ad507.audit_log WHERE entity_id=$1 AND action='PAYPAL_PAYMENT_CONFIRMED'",[x.order.id]))[0].n).toBe(1);
});
