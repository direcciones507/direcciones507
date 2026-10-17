import {beforeAll,afterAll,test,expect} from 'bun:test';
import postgres from 'postgres';
import EmbeddedPostgres from 'embedded-postgres';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPlanLifecycle} from '../plan-lifecycle';
import {createPlanMailWorker,PLAN_SENDER,planMailTemplate} from '../plan-mail';
import {configuredPlanPeriods,expiryFor,paidBenefitsActive,reminderKind} from '../plan-policy';
import {createRequestRepository} from '../request-repository';
import {newPublicAddress,handleNewPublicRoutes} from '../new-address-publication';
import {handlePlanRoutes} from '../plan-routes';
import {createAddressEditing} from '../address-editing';
import {createPaymentRepository} from '../payment-repository';
import {createHmac} from 'node:crypto';
import {paymentPage} from '../payment-ui';
const dir=mkdtempSync(join(tmpdir(),'ad507-plans-')),password=crypto.randomUUID();
const pg=new EmbeddedPostgres({databaseDir:join(dir,'db'),user:'postgres',password,port:55440,persistent:false,createPostgresUser:true,onLog:()=>{},onError:()=>{}});
let sql:ReturnType<typeof postgres>,base:ReturnType<typeof postgres>,isolatedName:string;
let time=new Date('2026-10-17T05:00:00Z');
const now=()=>new Date(time),owner=crypto.randomUUID(),admin=crypto.randomUUID(),other=crypto.randomUUID();
const periods={'PA:BUSINESS_PREMIUM':30,'PA:BUSINESS_PREMIUM_PRO':30};
const service=()=>createPlanLifecycle(sql,{periods,environment:'test',providers:new Set(['YAPPY']),now});
const yappy={environment:'test' as const,merchantId:'fixture',domain:'https://direcciones.lat',secret:Buffer.from('fixture.signature').toString('base64'),ipnUrl:'https://direcciones.lat/v1/payments/yappy/ipn'};
const root=new URL('../../../',import.meta.url);
beforeAll(async()=>{
 const external=process.env.AD507_TEST_DATABASE_URL;
 if(external&&!['127.0.0.1','localhost'].includes(new URL(external).hostname))throw Error('TEST_DATABASE_MUST_BE_LOCAL');
 if(!external){await pg.initialise();await pg.start();}
 const url=external??`postgres://postgres:${password}@127.0.0.1:55440/postgres`;
 base=postgres(url);isolatedName='plans_'+crypto.randomUUID().replaceAll('-','');await base.unsafe('CREATE DATABASE '+isolatedName);
 const parsed=new URL(url);parsed.pathname='/'+isolatedName;sql=postgres(parsed.toString(),{max:1});
 for(const file of ['0000_migration_ledger.sql','0001_core_foundation.sql','0002_plan_catalog.sql','0003_plan_capabilities.sql'])await sql.unsafe(readFileSync(new URL('db/migrations/'+file,root),'utf8'));
 for(const file of ['landline.sql','requests.sql','countries.sql','payments.sql','paypal.sql','plan-lifecycle.sql'])await sql.unsafe(readFileSync(new URL('../schema-proposals/'+file,import.meta.url),'utf8'));
 await sql.end();sql=postgres(parsed.toString(),{max:5});
 for(const [id,role]of [[owner,'CLIENT'],[admin,'ADMIN'],[other,'CLIENT']]){await sql.unsafe('INSERT INTO ad507.users(id,email) VALUES($1::uuid,$2)',[id,id+'@example.test']);await sql.unsafe('INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,$2)',[id,role]);}
},60000);
afterAll(async()=>{await sql?.end();if(base){await base.unsafe('DROP DATABASE '+isolatedName);await base.end();}if(!process.env.AD507_TEST_DATABASE_URL)await pg.stop();rmSync(dir,{recursive:true,force:true});});
async function fixture(plan='BUSINESS_PREMIUM_PRO',type='BUSINESS'){
 const id=crypto.randomUUID(),code='AD507-TEST'+id.replaceAll('-','').toUpperCase();
 await sql.unsafe("INSERT INTO ad507.addresses(id,code,address_type,status,source,name,description,commercial_description,latitude,longitude,plan_id,country_code,request_data,review_decision) VALUES($1::uuid,$2,$3,'PENDING_REVIEW','USER_REQUEST','Test name','Pro description','Paid description',8,-80,(SELECT id FROM ad507.plans WHERE code=$4),'PA',$5::jsonb,'APPROVED')",[id,code,type,plan,sql.json({plan,countryCode:'PA',postalCode:'001',media:{logos:0,placePhotos:0,galleryPhotos:0}})]);
 await sql.unsafe('INSERT INTO ad507.address_ownership(address_id,user_id) VALUES($1::uuid,$2::uuid)',[id,owner]);
 await sql.unsafe("INSERT INTO ad507.address_socials(address_id,platform,url) VALUES($1::uuid,'instagram','https://instagram.com/test')",[id]);return {id,code};
}
async function initialOrder(id:string,plan='BUSINESS_PREMIUM_PRO'){
 const [order]=await sql.unsafe("INSERT INTO ad507.orders(user_id,address_id,amount_cents,provider,payment_plan,payment_environment,provider_order_id,operation_key,provider_reference) VALUES($1::uuid,$2::uuid,$3,'YAPPY',$4,'test',$5,$6,$7) RETURNING *",[owner,id,plan==='BUSINESS_PREMIUM_PRO'?3999:1999,plan,crypto.randomUUID().replaceAll('-','').slice(0,14),crypto.randomUUID(),'fixture-provider-'+crypto.randomUUID()]);return order;
}
async function confirm(order:any,status='E'){
 const query=new URLSearchParams({orderId:order.provider_order_id,status,domain:yappy.domain});query.set('hash',createHmac('sha256','fixture').update(order.provider_order_id+status+yappy.domain).digest('hex'));return createPaymentRepository(sql,yappy).confirm(query);
}
function repository(){return createRequestRepository(sql,{r2:null,paymentEnvironment:'test',lifecycle:service(),canonical:{historicalRegistryVerified:true,reserve:async()=>{throw Error('UNEXPECTED_RESERVATION')},publish:async()=>({confirmed:true,receipt:'fixture-publication'})}});}
let published:{id:string;code:string},paid:any,qrBytes:Uint8Array;
test('policy: exact expiry, leap/year boundaries and reminder windows',()=>{
 expect(expiryFor(new Date('2028-02-28T05:00Z'),2).toISOString()).toBe('2028-03-01T05:00:00.000Z');expect(expiryFor(new Date('2026-12-31T05:00Z'),1).toISOString()).toBe('2027-01-01T05:00:00.000Z');
 expect(paidBenefitsActive({planLifecycle:{expiresAt:time.toISOString()}},time.getTime())).toBe(false);expect(reminderKind(new Date(time.getTime()+15*86400000),time)).toBe('D15');
 expect(configuredPlanPeriods('{"PA:BUSINESS_PREMIUM":30}')).toEqual({'PA:BUSINESS_PREMIUM':30});expect(()=>configuredPlanPeriods('{"PA:BUSINESS_PREMIUM":0}')).toThrow();
});
test('signed payment required; atomic term, queue and permanent identity',async()=>{
 published=await fixture();paid=await initialOrder(published.id);await expect(repository().publish(admin,published.id)).rejects.toThrow('PAYMENT_CONFIRMATION_REQUIRED');expect(await sql.unsafe('SELECT * FROM ad507.plan_terms')).toHaveLength(0);
 await expect(createPaymentRepository(sql,yappy).confirm(new URLSearchParams({orderId:paid.provider_order_id,status:'E',domain:yappy.domain,hash:'bad'}))).rejects.toThrow();
 await confirm(paid);await repository().publish(admin,published.id);await repository().publish(admin,published.id);
 const [term]=await sql.unsafe('SELECT * FROM ad507.plan_terms WHERE address_id=$1::uuid',[published.id]);expect(term.expires_at.toISOString()).toBe('2026-11-16T05:00:00.000Z');expect(await sql.unsafe('SELECT * FROM ad507.plan_mail_outbox WHERE term_id=$1::uuid',[term.id])).toHaveLength(1);
 await expect(sql.unsafe("UPDATE ad507.addresses SET code='AD507-CHANGED' WHERE id=$1::uuid",[published.id])).rejects.toThrow('PERMANENT_CODE_RESERVED');await expect(sql.unsafe('DELETE FROM ad507.addresses WHERE id=$1::uuid',[published.id])).rejects.toThrow('PERMANENT_CODE_RESERVED');
});
test('expiry retains URL/QR while masking paid data and direct gallery access without cron',async()=>{
 for(let i=0;i<2;i++)await sql.unsafe("INSERT INTO ad507.address_media(address_id,media_type,url,position,upload_status) VALUES($1::uuid,'IMAGE',$2,$3,'READY')",[published.id,'https://example.test/'+i,i]);
 await sql.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{planLifecycle,expiresAt}',to_jsonb('2020-01-01T00:00:00Z'::text)) WHERE id=$1::uuid",[published.id]);
 const record=await newPublicAddress(sql,published.code,'https://direcciones.lat');expect(record!.url).toBe('https://direcciones.lat/'+published.code+'/');expect(record!.description).toBeNull();expect(record!.socials).toEqual([]);expect(record!.media).toHaveLength(1);expect(record!.extras.postalCode).toBeNull();
 const qr=await handleNewPublicRoutes(new Request('https://direcciones.lat/v1/addresses/'+published.code+'/qr.png'),{enabled:true,sql,r2:null});expect(qr!.status).toBe(200);expect(qr!.headers.get('content-type')).toBe('image/png');qrBytes=new Uint8Array(await qr!.arrayBuffer());
 const media=await sql.unsafe('SELECT id FROM ad507.address_media WHERE address_id=$1::uuid ORDER BY position',[published.id]);const denied=await handleNewPublicRoutes(new Request('https://direcciones.lat/v1/addresses/'+published.code+'/media/'+media[1].id),{enabled:true,sql,r2:{accountId:'x',bucket:'x',accessKeyId:'x',secretAccessKey:'x',configurationVerified:true}} as any);expect(denied!.status).toBe(404);
 const detail=await repository().read(owner,published.id);await expect(createAddressEditing(sql,{r2:null}).edit(owner,published.id,{version:detail.version,name:'Edit'},[],false)).rejects.toThrow('CAPABILITY_VIOLATION');
});
test('voluntary owner-bound renewal, concurrent duplicate payment confirmations and refunds',async()=>{
 await expect(service().prepareRenewal(other,published.id,'renewal-key-00000001',true)).rejects.toThrow('PLAN_ADDRESS_NOT_FOUND');await expect(service().prepareRenewal(owner,published.id,'renewal-key-00000001',false)).rejects.toThrow('INVALID_RENEWAL');
 const [a,b]=await Promise.all([service().prepareRenewal(owner,published.id,'renewal-key-00000001',true),service().prepareRenewal(owner,published.id,'renewal-key-00000001',true)]);expect(a.id).toBe(b.id);expect((await sql.unsafe("SELECT count(*)::int AS count FROM ad507.plan_terms WHERE address_id=$1::uuid",[published.id]))[0].count).toBe(1);
 await createPaymentRepository(sql,yappy).claimProviderOrder(a.id);await createPaymentRepository(sql,yappy).completeProviderOrder(a.id,'renewal-provider');await confirm(a);await confirm(a);await Promise.all([service().reconcile(),service().reconcile()]);
 expect((await sql.unsafe('SELECT count(*)::int AS count FROM ad507.plan_terms WHERE address_id=$1::uuid',[published.id]))[0].count).toBe(2);expect((await sql.unsafe('SELECT code FROM ad507.addresses WHERE id=$1::uuid',[published.id]))[0].code).toBe(published.code);
 const record=await newPublicAddress(sql,published.code,'https://direcciones.lat');expect(record!.description).toBe('Pro description');expect(record!.media).toHaveLength(2);const qr=await handleNewPublicRoutes(new Request('https://direcciones.lat/v1/addresses/'+published.code+'/qr.png'),{enabled:true,sql,r2:null});expect(new Uint8Array(await qr!.arrayBuffer())).toEqual(qrBytes);
 await sql.unsafe("UPDATE ad507.orders SET status='REFUNDED' WHERE id=$1::uuid",[a.id]);expect((await newPublicAddress(sql,published.code,'https://direcciones.lat'))!.description).toBeNull();await service().reconcile();
});
test('free and PLACE indefinite; residential and historical excluded',async()=>{
 const free=await fixture('BUSINESS_FREE');await repository().publish(admin,free.id);const [term]=await sql.unsafe('SELECT * FROM ad507.plan_terms WHERE address_id=$1::uuid',[free.id]);expect(term.expires_at).toBeNull();expect(term.order_id).toBeNull();
 const place=await fixture('PLACE','PLACE');await repository().publish(admin,place.id);expect((await sql.unsafe('SELECT expires_at FROM ad507.plan_terms WHERE address_id=$1::uuid',[place.id]))[0].expires_at).toBeNull();
 const privateId=await fixture('RESIDENTIAL','RESIDENTIAL');expect(await newPublicAddress(sql,privateId.code,'https://direcciones.lat')).toBeNull();await expect(sql.begin(tx=>service().published(tx,privateId.id))).rejects.toThrow('PLAN_ADDRESS_NOT_FOUND');
 const history=await fixture('BUSINESS_FREE');await sql.unsafe("UPDATE ad507.addresses SET status='ACTIVE',publication_receipt='old',request_data=request_data||'{\"migration\":{}}'::jsonb WHERE id=$1::uuid",[history.id]);await expect(sql.begin(tx=>service().published(tx,history.id))).rejects.toThrow('PLAN_ADDRESS_NOT_FOUND');
});
test('15/7/1/expiry reminders deduplicate; status/code remain unchanged',async()=>{
 const address=await fixture('BUSINESS_PREMIUM');const order=await initialOrder(address.id,'BUSINESS_PREMIUM');await confirm(order);await repository().publish(admin,address.id);
 for(const day of [15,23,29,30]){time=new Date(Date.parse('2026-10-17T05:00Z')+day*86400000);await service().reconcile();await service().reconcile();}
 const jobs=await sql.unsafe('SELECT m.kind FROM ad507.plan_mail_outbox m JOIN ad507.plan_terms t ON t.id=m.term_id WHERE t.address_id=$1::uuid ORDER BY m.kind',[address.id]);expect(jobs.map(j=>j.kind)).toEqual(['D1','D15','D7','DELIVERY','EXPIRED']);
 const [same]=await sql.unsafe('SELECT code,status FROM ad507.addresses WHERE id=$1::uuid',[address.id]);expect(same.code).toBe(address.code);expect(same.status).toBe('ACTIVE');expect((await service().summary()).counts.expired).toBeGreaterThanOrEqual(1);
});
test('mail retries frozen payload/idempotency; inactive owner skipped; templates escaped',async()=>{
 const calls:any[]=[];let fail=true;const http=(async(url:any,init:any)=>{calls.push({url,...init});return fail?new Response('',{status:503}):Response.json({id:'provider-fixture'});}) as typeof fetch;
 const env={EMAIL_FROM:PLAN_SENDER,RESEND_API_KEY:'fixture',AD507_PLAN_EMAIL_ENABLED:'true'};expect((await createPlanMailWorker(sql,{},http,now).run()).configured).toBe(false);
 await createPlanMailWorker(sql,env,http,now).run();expect(calls.length).toBeGreaterThan(0);const before=calls[0];fail=false;time=new Date(time.getTime()+60001);await createPlanMailWorker(sql,env,http,now).run();
 const retry=calls.find((c,i)=>i>0&&c.headers['Idempotency-Key']===before.headers['Idempotency-Key']);expect(retry).toBeTruthy();expect(retry.body).toBe(before.body);expect(JSON.parse(before.body).from).toBe(PLAN_SENDER);
 const stale=await fixture('BUSINESS_FREE');await repository().publish(admin,stale.id);await sql.unsafe("UPDATE ad507.users SET status='DISABLED' WHERE id=$1::uuid",[owner]);const count=calls.length;await createPlanMailWorker(sql,env,http,now).run();expect(calls.length).toBe(count);await sql.unsafe("UPDATE ad507.users SET status='ACTIVE' WHERE id=$1::uuid",[owner]);
 expect(planMailTemplate({code:published.code,name:'<script>bad</script>',country:'PA',expiresAt:time.toISOString(),kind:'D1'}).html).not.toContain('<script>');
});
test('route authorization, origin, disabled provider and renewal UI syntax',async()=>{
 const context={enabled:true,auth:{currentUser:async()=>({id:owner,roles:['CLIENT']})},lifecycle:service(),payments:null,provider:null,sql,periods};
 expect((await handlePlanRoutes(new Request('https://direcciones.lat/v1/admin/plan-lifecycle'),context))!.status).toBe(403);expect((await handlePlanRoutes(new Request('https://direcciones.lat/v1/admin/plan-lifecycle'),{...context,auth:{currentUser:async()=>({id:owner,roles:['ADMIN']})}}))!.status).toBe(403);const endpoint='https://direcciones.lat/v1/user/requests/'+published.id+'/renewal';
 expect((await handlePlanRoutes(new Request(endpoint,{method:'POST',headers:{origin:'https://evil.test'}}),context))!.status).toBe(403);expect((await handlePlanRoutes(new Request(endpoint,{method:'POST',headers:{origin:'https://direcciones.lat'}}),context))!.status).toBe(503);
 expect((await (await handlePlanRoutes(new Request(endpoint),context))!.json()).quote.available).toBe(false);
 const tampered=await handlePlanRoutes(new Request(endpoint,{method:'POST',headers:{origin:'https://direcciones.lat','content-type':'application/json','idempotency-key':'tampered-checkout-0001'},body:JSON.stringify({accepted:true,policyVersion:'plan-lifecycle-v1',periodDays:30,amountCents:1,currency:'USD',alias:'61234567'})}),{...context,payments:{} as any,provider:{} as any});expect(tampered!.status).toBe(409);
 for(const mode of [false,true])for(const match of paymentPage(published.id,'test',mode).matchAll(/<script>([\s\S]*?)<\/script>/g))expect(()=>new Function(match[1])).not.toThrow();
});

test('early renewal extends from existing expiry and does not overwrite its purchased plan',async()=>{
 const a=await fixture('BUSINESS_PREMIUM');const first=await initialOrder(a.id,'BUSINESS_PREMIUM');await confirm(first);await repository().publish(admin,a.id);
 const [before]=await sql.unsafe('SELECT request_data FROM ad507.addresses WHERE id=$1::uuid',[a.id]);
 const renewal=await service().prepareRenewal(owner,a.id,'early-renewal-000001',true);await createPaymentRepository(sql,yappy).claimProviderOrder(renewal.id);await createPaymentRepository(sql,yappy).completeProviderOrder(renewal.id,'early-provider-'+renewal.id);await confirm(renewal);
 await service().reconcile();await service().reconcile();
 const [after]=await sql.unsafe('SELECT code,request_data FROM ad507.addresses WHERE id=$1::uuid',[a.id]);expect(Date.parse(after.request_data.planLifecycle.expiresAt)-Date.parse(before.request_data.planLifecycle.expiresAt)).toBe(30*86400000);expect(after.request_data.plan).toBe('BUSINESS_PREMIUM');expect(after.code).toBe(a.code);
});
test('mail concurrent workers claim once, permanent failures stop, and expired idempotency windows require reconciliation',async()=>{
 const a=await fixture('BUSINESS_FREE');await repository().publish(admin,a.id);
 let calls=0;const http=(async()=>{calls++;return new Response('',{status:422});}) as typeof fetch;
 const env={EMAIL_FROM:PLAN_SENDER,RESEND_API_KEY:'fixture',AD507_PLAN_EMAIL_ENABLED:'true'};
 await Promise.all([createPlanMailWorker(sql,env,http,now).run(),createPlanMailWorker(sql,env,http,now).run()]);
 const [job]=await sql.unsafe('SELECT m.* FROM ad507.plan_mail_outbox m JOIN ad507.plan_terms t ON t.id=m.term_id WHERE t.address_id=$1::uuid',[a.id]);expect(job.state).toBe('FAILED');expect(job.attempts).toBe(1);
 const before=calls;await createPlanMailWorker(sql,env,http,now).run();expect(calls).toBe(before);
 await sql.unsafe("UPDATE ad507.plan_mail_outbox SET state='SENDING',first_attempt_at=$2,available_at=$3 WHERE id=$1::uuid",[job.id,new Date(time.getTime()-24*3600000),time]);
 await createPlanMailWorker(sql,env,http,now).run();expect(calls).toBe(before);expect((await sql.unsafe('SELECT state FROM ad507.plan_mail_outbox WHERE id=$1::uuid',[job.id]))[0].state).toBe('UNCERTAIN');
});
