import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequestRepository} from '../request-repository';
import {createNewAddressPublication,handleNewPublicRoutes} from '../new-address-publication';
import {createPaymentRepository} from '../payment-repository';
import {paymentAmount} from '../payment-policy';
import {requireLegalAcceptance,LEGAL_VERSION} from '../legal';
import {createAnalyticsRepository} from '../analytics-repository';
import {requestedIdentity,reservePublicName,nameAvailable} from '../custom-names';
import {handleNameAvailability} from '../custom-name-routes';

/** Explicit disposable SQL connection only. No production URL, schema bootstrap or network fallback. */
export async function runCustomNamesIntegration(sql:any){
 const root=new URL('../../../',import.meta.url),results:any[]=[];
 for(const file of ['0000_migration_ledger.sql','0001_core_foundation.sql','0002_plan_catalog.sql','0003_plan_capabilities.sql','0005_general_google_auth.sql'])await sql.unsafe(readFileSync(new URL('db/migrations/'+file,root),'utf8'));
 for(const file of ['landline.sql','requests.sql','countries.sql','payments.sql','public-names.sql'])await sql.unsafe(readFileSync(new URL('../schema-proposals/'+file,import.meta.url),'utf8'));
 await sql.unsafe(`CREATE TABLE ad507.ad507_business_analytics_events(event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ad507_code text NOT NULL,event_type text NOT NULL CHECK(event_type IN ('google','waze','uber','share','copy','aviso')),occurred_at timestamptz NOT NULL DEFAULT now(),source text NOT NULL DEFAULT 'direcciones507_web' CHECK(source='direcciones507_web'),idempotency_key uuid); CREATE UNIQUE INDEX test_idempotency ON ad507.ad507_business_analytics_events(idempotency_key) WHERE idempotency_key IS NOT NULL`);
 await sql.unsafe(readFileSync(new URL('../schema-proposals/analytics-visits.sql',import.meta.url),'utf8'));
 const analytics=createAnalyticsRepository(sql);
 const owner=crypto.randomUUID(),admin=crypto.randomUUID(),other=crypto.randomUUID();
 for(const [id,role]of [[owner,'CLIENT'],[admin,'ADMIN'],[other,'CLIENT']]){await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1::uuid,$2)",[id,id+'@example.invalid']);await sql.unsafe('INSERT INTO ad507.user_roles(user_id,role) VALUES($1::uuid,$2)',[id,role]);}
 const http=async(url:any,init:any={})=>String(url).includes('action=list')?Response.json({ok:true,codes:[{codigo:'AD507-0001'}]}):new Response(null,{status:init.method==='DELETE'?204:200});
 const r2={accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'synthetic',secretAccessKey:'synthetic',configurationVerified:true as const};
 const canonical=createNewAddressPublication(sql,{namespaceExclusive:true,customNames:true,fetch:http});
 const repo=createRequestRepository(sql,{r2,canonical,customNames:true,paidWorkflow:true,paymentEnvironment:'test',fetch:http});
 const config={environment:'test' as const,merchantId:'synthetic',domain:'https://example.invalid',secret:Buffer.from('synthetic-proof.secret').toString('base64'),ipnUrl:'https://example.invalid/ipn'};
 const payments=createPaymentRepository(sql,config,{onVerifiedPayment:id=>repo.activatePaid(id)});
 const png=await(await import('sharp')).default({create:{width:16,height:16,channels:3,background:'#0b57d0'}}).png().toBuffer();
 const file={role:'logo' as const,mime:'image/png',bytes:png},acceptance=requireLegalAcceptance({legalAcceptance:{accepted:true,version:LEGAL_VERSION}});
 for(const [plan,name]of [['BUSINESS_PREMIUM','Café del Prado'],['BUSINESS_PREMIUM_PRO','Café Málaga']]){
  const raw={type:'BUSINESS',plan,name,reference:'Sintético: nunca producción',namedCode:name,countryCode:'PA',latitude:8.1,longitude:-80.9,legalAcceptance:acceptance};
  const key='isolated-'+crypto.randomUUID(),r=await repo.submit(owner,key,raw,[file]);assert.equal(r.status,'DRAFT');assert.equal((r as any).workflow,'PAYMENT_PENDING');
  assert.equal((await repo.submit(owner,key,raw,[file])).id,r.id);
  assert.equal((await sql.unsafe('SELECT 1 FROM ad507.public_name_reservations WHERE address_id=$1::uuid',[r.id])).length,1);
  for(const requestKey of [key,'freshkey-'+crypto.randomUUID()]){
   const query=new URLSearchParams({country:'PA',plan,name,key:requestKey});
   const own=await handleNameAvailability(new Request('https://direcciones.lat/v1/user/names/availability?'+query),{enabled:true,sql,auth:{currentUser:async()=>({id:owner,roles:['CLIENT']})}});assert.equal((await own!.json()).available,true);
   const foreign=await handleNameAvailability(new Request('https://direcciones.lat/v1/user/names/availability?'+query),{enabled:true,sql,auth:{currentUser:async()=>({id:other,roles:['CLIENT']})}});assert.equal((await foreign!.json()).available,false);
  }
  await assert.rejects(()=>repo.submit(other,'conflict-'+crypto.randomUUID(),raw,[file]),/NAME_UNAVAILABLE/);
  await assert.rejects(()=>repo.read(other,r.id),/REQUEST_NOT_FOUND/);
  await assert.rejects(()=>repo.publish(admin,r.id));
  const order=await payments.prepare(owner,r.id,'payment-'+crypto.randomUUID());assert.equal(order.order.amount_cents,paymentAmount(plan));
  await payments.registerProviderOrder(order.order.id,'synthetic-'+r.id);
  const q=new URLSearchParams({orderId:order.order.provider_order_id,status:'E',domain:config.domain});q.set('hash',createHmac('sha256','synthetic-proof').update(q.get('orderId')!+'E'+config.domain).digest('hex'));
  await payments.confirm(q);await payments.confirm(q);
  assert.equal((await repo.read(owner,r.id)).status,'PENDING_REVIEW');
  await assert.rejects(()=>repo.publish(admin,r.id),/APPROVAL_REQUIRED/);
  await repo.review(admin,r.id,'APPROVED');const published=await repo.publish(admin,r.id);assert.equal(published.status,'ACTIVE');
  const record=await repo.read(owner,r.id);assert.equal(record.extras.annualContract.amountCents,paymentAmount(plan));assert.equal(record.extras.annualTerm.period,'P1Y');assert.equal(record.extras.annualTerm.automaticCharge,false);
  const pro=plan.endsWith('_PRO'),publicName=pro?'CAFEMALAGA':'AD507-CAFEDELPRADO';
  assert.equal(pro?record.publicCode:record.code,publicName);assert.match(record.code,pro?/^AD507-N\d{8}$/:/^AD507-CAFEDELPRADO$/);
  assert.equal(record.publicUrl,pro?'https://direcciones.lat/CAFEMALAGA':'https://direcciones.lat/AD507-CAFEDELPRADO/');
  for(const path of ['/'+record.code+'/',...(pro?['/CAFEMALAGA','/cafemalaga/']:[])]){
   const page=await handleNewPublicRoutes(new Request('https://direcciones.lat'+path),{enabled:true,sql,r2:null});assert.equal(page?.status,200);const html=await page!.text();assert.ok(html.includes(name));
   const qr=new Function(html.match(/const qrUrl = [^\n]+/)![0]+';return qrUrl;')();assert.equal(new URL(qr).searchParams.get('data'),record.publicUrl);
  }
  // The public alias renders the internal analytics code; storage and private ownership stay unchanged.
  const nonce='a'.repeat(43);
  for(const event of ['visit','whatsapp','google','waze','uber','call','share','copy','qr']){assert.equal((await analytics.track(record.code,event,nonce)).duplicate,false);assert.equal((await analytics.track(record.code,event,nonce)).duplicate,true);}
  await assert.rejects(()=>analytics.summary(other,record.code),/NOT_FOUND/);
  for(const days of [7,30,90]){const summary=await analytics.summary(owner,record.code,days);assert.equal(summary.visits.total,1);for(const event of ['whatsapp','google','waze','uber','call'])assert.equal(summary.interactions![event],1);assert.equal(summary.period_days,pro?days:undefined);assert.equal(Boolean(summary.daily_series),pro);}
  assert.equal((await repo.publish(admin,r.id)).code,record.code);
  const [before]=await sql.unsafe('SELECT to_jsonb(a) AS data FROM ad507.addresses a WHERE id=$1::uuid',[r.id]);
  await payments.confirm(q);const [after]=await sql.unsafe('SELECT to_jsonb(a) AS data FROM ad507.addresses a WHERE id=$1::uuid',[r.id]);assert.deepEqual(after,before);
  results.push({plan,status:published.status,publicName,internalCode:record.code,url:record.publicUrl,annualTerm:record.extras.annualTerm});
 }
 // Protect equivalent names of an already issued legacy code without rewriting it.
 const historicId=crypto.randomUUID();await sql.unsafe("INSERT INTO ad507.addresses(id,code,address_type,status,name,source) VALUES($1::uuid,'AD507-CAFE_HISTORICO','BUSINESS','ACTIVE','Legacy fixture','USER_REQUEST')",[historicId]);
 assert.equal(await nameAvailable(sql,requestedIdentity({type:'BUSINESS',plan:'BUSINESS_PREMIUM_PRO',countryCode:'PA',name:'Café Historico'})!),false);
 // SQL uniqueness across separate addresses/countries, including two simultaneous attempts.
 const ids=[crypto.randomUUID(),crypto.randomUUID()];
 for(const id of ids)await sql.unsafe("INSERT INTO ad507.addresses(id,code,address_type,status,name,source,request_key_hash,request_data) VALUES($1::uuid,NULL,'BUSINESS','DRAFT','Synthetic reservation','USER_REQUEST',$2,'{}'::jsonb)",[id,id]);
 const identity=requestedIdentity({type:'BUSINESS',plan:'BUSINESS_PREMIUM_PRO',countryCode:'PA',name:'Nombre Simultáneo'})!;
 const concurrent=await Promise.allSettled(ids.map((id,i)=>sql.begin((tx:any)=>reservePublicName(tx,id,{...identity,countryCode:i?'CR':'PA'}))));
 assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);assert.equal(concurrent.filter(r=>r.status==='rejected').length,1);
 const [count]=await sql.unsafe('SELECT count(*)::int AS n FROM ad507.public_name_reservations WHERE public_name=$1',[identity.name]);assert.equal(count.n,1);
 // Existing issued identity never changes on repeat publication; names do not disappear on transfer/retirement.
 const pro=results[1];const [target]=await sql.unsafe('SELECT id FROM ad507.addresses WHERE code=$1',[pro.internalCode]);
 await sql.unsafe("UPDATE ad507.address_ownership SET user_id=$2::uuid WHERE address_id=$1::uuid",[target.id,other]);await assert.rejects(()=>repo.read(owner,target.id),/REQUEST_NOT_FOUND/);assert.equal((await repo.read(other,target.id)).publicCode,'CAFEMALAGA');
 await sql.unsafe("UPDATE ad507.addresses SET status='ARCHIVED' WHERE id=$1::uuid",[target.id]);
 assert.equal((await handleNewPublicRoutes(new Request('https://direcciones.lat/CAFEMALAGA'),{enabled:true,sql,r2:null}))?.status,410);
 assert.equal((await sql.unsafe('SELECT 1 FROM ad507.public_name_reservations WHERE address_id=$1::uuid',[target.id])).length,1);
 return {results,concurrent:{fulfilled:1,rejected:1},externalRequests:0,storage:'simulated',payment:'signed synthetic IPN',nativeConcurrencyRequired:true};
}
