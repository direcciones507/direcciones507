import type {Sql} from 'postgres';
import {createHash,randomBytes} from 'node:crypto';
import {assertCountryCommerce} from './country-configuration';
import {paymentAmount} from './payment-policy';
import {expiryFor,PLAN_POLICY_VERSION,type PlanPeriods} from './plan-policy';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const paidPlans=['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'];
export function createPlanLifecycle(sql:Sql,options:{periods:PlanPeriods;environment:'test'|'production';providers:ReadonlySet<string>;now?:()=>Date}) {
 const now=()=>options.now?.()??new Date();
 const daysFor=(row:any)=>{const days=options.periods[row.country_code+':'+row.request_data.plan];if(!days)throw Error('PLAN_PERIOD_NOT_CONFIGURED');return days;};
 async function eligible(tx:any,id:string,actorId?:string){
  const rows=await tx.unsafe(`SELECT a.* FROM ad507.addresses a WHERE a.id=$1::uuid AND a.source='USER_REQUEST' AND a.address_type IN ('BUSINESS','PLACE') AND a.status='ACTIVE' AND a.review_decision='APPROVED' AND a.publication_receipt IS NOT NULL AND NOT COALESCE(a.request_data,'{}'::jsonb) ? 'migration' ${actorId?"AND EXISTS(SELECT 1 FROM ad507.address_ownership o JOIN ad507.users u ON u.id=o.user_id WHERE o.address_id=a.id AND o.user_id=$2::uuid AND o.ownership_role='OWNER' AND u.status='ACTIVE')":''} FOR UPDATE OF a`,actorId?[id,actorId]:[id]);
  if(!rows.length)throw Error('PLAN_ADDRESS_NOT_FOUND');return rows[0];
 }
 async function proof(tx:any,row:any,orderId?:string){
  const orders=await tx.unsafe(`SELECT * FROM ad507.orders WHERE address_id=$1::uuid AND payment_environment=$2 AND payment_plan=$3 AND amount_cents=$4 AND currency='USD' AND status='PAID' AND confirmed_at IS NOT NULL AND provider_reference IS NOT NULL AND provider_reference NOT LIKE 'INITIALIZING:%' ${orderId?'AND id=$5::uuid':''} ORDER BY confirmed_at,id LIMIT 1 FOR UPDATE`,[row.id,options.environment,row.request_data.plan,paymentAmount(row.request_data.plan),...(orderId?[orderId]:[])]);
  const order=orders[0];
  if(!order||!options.providers.has(order.provider))throw Error('PAYMENT_CONFIRMATION_REQUIRED');
  // Ownership and amount are checked again here; only existing signed/server
  // provider confirmation methods are allowed to set PAID/confirmed_at.
  const owners=await tx.unsafe("SELECT 1 FROM ad507.address_ownership o JOIN ad507.users u ON u.id=o.user_id WHERE o.address_id=$1::uuid AND o.user_id=$2::uuid AND o.ownership_role='OWNER' AND u.status='ACTIVE'",[row.id,order.user_id]);
  if(!owners.length)throw Error('PAYMENT_CONFIRMATION_REQUIRED');return order;
 }
 async function install(tx:any,row:any,kind:'INITIAL'|'RENEWAL',order:any,days:number|null,acceptedAt:Date|null){
  const at=now(),old=row.request_data.planLifecycle;
  const start=kind==='RENEWAL'&&old?.expiresAt&&!old.revoked&&Date.parse(old.expiresAt)>at.getTime()?new Date(old.expiresAt):at;
  const end=days?expiryFor(start,days):null;
  const result=await tx.unsafe(`INSERT INTO ad507.plan_terms(address_id,order_id,kind,plan_code,country_code,starts_at,expires_at,period_days,accepted_at,policy_version) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[row.id,order?.id??null,kind,row.request_data.plan,row.country_code,start,end,days,acceptedAt,PLAN_POLICY_VERSION]);
  const term=result[0];
  await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{planLifecycle}',$2::jsonb),updated_at=clock_timestamp() WHERE id=$1::uuid",[row.id,tx.json({termId:term.id,startsAt:at.toISOString(),orderId:order?.id??null,expiresAt:end?.toISOString()??null,revoked:false})]);
  await tx.unsafe('INSERT INTO ad507.address_identity_reservations(code,address_id) VALUES(upper(trim($1)),$2::uuid) ON CONFLICT(address_id) DO NOTHING',[row.code,row.id]);
  await tx.unsafe('INSERT INTO ad507.plan_mail_outbox(term_id,kind) VALUES($1::uuid,$2) ON CONFLICT DO NOTHING',[term.id,kind==='INITIAL'?'DELIVERY':'RENEWED']);
  await tx.unsafe("INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,metadata) VALUES('SYSTEM',$1,'ADDRESS',$2,$3::jsonb)",[kind==='INITIAL'?'PLAN_STARTED':'PLAN_RENEWED',row.id,tx.json({termId:term.id,orderId:order?.id??null})]);
  return term;
 }
 return {
  // Called INSIDE publication's final transaction. Email is queued, never sent here.
  async published(tx:any,id:string){
   const row=await eligible(tx,id);
   const prior=await tx.unsafe("SELECT * FROM ad507.plan_terms WHERE address_id=$1::uuid AND kind='INITIAL'",[id]);if(prior.length)return prior[0];
   const paid=paidPlans.includes(row.request_data.plan);
   const order=paid?await proof(tx,row):null;
   return install(tx,row,'INITIAL',order,paid?daysFor(row):null,row.request_data.acceptance?.acceptedAt?new Date(row.request_data.acceptance.acceptedAt):null);
  },
  async prepareRenewal(userId:string,id:string,key:string,accepted:boolean){
   if(!uuid.test(id)||!uuid.test(userId)||!/^[A-Za-z0-9_-]{16,128}$/.test(key)||accepted!==true)throw Error('INVALID_RENEWAL');
   return sql.begin(async tx=>{
    const row=await eligible(tx,id,userId);assertCountryCommerce(row.country_code);
    if(!paidPlans.includes(row.request_data.plan)||!row.request_data.planLifecycle)throw Error('INVALID_RENEWAL');
    if(!options.providers.has('YAPPY'))throw Error('PAYMENT_PROVIDER_NOT_ENABLED');
    const operation=createHash('sha256').update('renewal:'+options.environment+':'+userId+':'+id+':'+key).digest('hex');
    const previous=await tx.unsafe('SELECT * FROM ad507.orders WHERE operation_key=$1',[operation]);if(previous.length)return previous[0];
    const days=daysFor(row);
    const pending=await tx.unsafe("SELECT id FROM ad507.orders WHERE address_id=$1::uuid AND payment_environment=$2 AND status='PENDING'",[id,options.environment]);if(pending.length)throw Error('PAYMENT_ALREADY_EXISTS');
    const result=await tx.unsafe("INSERT INTO ad507.orders(user_id,address_id,amount_cents,provider,payment_plan,payment_environment,provider_order_id,operation_key) VALUES($1::uuid,$2::uuid,$3,'YAPPY',$4,$5,$6,$7) RETURNING *",[userId,id,paymentAmount(row.request_data.plan),row.request_data.plan,options.environment,randomBytes(7).toString('hex'),operation]);
    await tx.unsafe('INSERT INTO ad507.plan_renewals(order_id,address_id,user_id,period_days,policy_version) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5)',[result[0].id,id,userId,days,PLAN_POLICY_VERSION]);
    await tx.unsafe("INSERT INTO ad507.legal_acceptances(user_id,address_id,document_type,document_version,metadata) VALUES($1::uuid,$2::uuid,'VOLUNTARY_RENEWAL',$3,$4::jsonb)",[userId,id,PLAN_POLICY_VERSION,tx.json({orderId:result[0].id,periodDays:days,amountCents:result[0].amount_cents,currency:'USD',automaticCharge:false})]);
    return result[0];
   });
  },
  async reconcile(){
   // Bounded batches. Locks on each address serialize publication and renewal.
   const pending=await sql.unsafe("SELECT r.order_id,r.address_id FROM ad507.plan_renewals r JOIN ad507.orders o ON o.id=r.order_id JOIN ad507.addresses a ON a.id=r.address_id WHERE o.payment_environment=$1 AND o.provider=ANY($2::text[]) AND o.status='PAID' AND a.status='ACTIVE' AND a.source='USER_REQUEST' AND a.address_type='BUSINESS' AND NOT a.request_data ? 'migration' AND EXISTS(SELECT 1 FROM ad507.address_ownership own JOIN ad507.users u ON u.id=own.user_id WHERE own.address_id=a.id AND own.user_id=r.user_id AND own.user_id=o.user_id AND own.ownership_role='OWNER' AND u.status='ACTIVE') AND NOT EXISTS(SELECT 1 FROM ad507.plan_terms t WHERE t.order_id=o.id) ORDER BY r.accepted_at LIMIT 100",[options.environment,[...options.providers]]);
   for(const item of pending)try{await sql.begin(async tx=>{
    const row=await eligible(tx,item.address_id);
    if((await tx.unsafe('SELECT 1 FROM ad507.plan_terms WHERE order_id=$1::uuid',[item.order_id])).length)return;
    const order=await proof(tx,row,item.order_id);
    const [intent]=await tx.unsafe('SELECT * FROM ad507.plan_renewals WHERE order_id=$1::uuid',[order.id]);
    if(intent.user_id!==order.user_id)throw Error('PAYMENT_CONFIRMATION_REQUIRED');
    await install(tx,row,'RENEWAL',order,intent.period_days,intent.accepted_at);
   });
   }catch(error){if(!['PLAN_ADDRESS_NOT_FOUND','PAYMENT_CONFIRMATION_REQUIRED'].includes(error instanceof Error?error.message:''))throw error;}
   // A refund revokes the affected term only. The reader independently joins
   // payment state so a stopped worker cannot retain refunded paid benefits.
   await sql.begin(async tx=>{
    const refunded=await tx.unsafe("UPDATE ad507.plan_terms t SET revoked_at=$1 FROM ad507.orders o WHERE t.order_id=o.id AND o.status='REFUNDED' AND t.revoked_at IS NULL RETURNING t.id,t.address_id",[now()]);
    for(const t of refunded){await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{planLifecycle,revoked}','true'::jsonb) WHERE id=$1::uuid AND request_data->'planLifecycle'->>'termId'=$2",[t.address_id,t.id]);await tx.unsafe("INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id) VALUES('SYSTEM','PLAN_REFUNDED','ADDRESS',$1)",[t.address_id]);}
    await tx.unsafe(`INSERT INTO ad507.plan_mail_outbox(term_id,kind)
      SELECT t.id,CASE WHEN t.expires_at<=$1 THEN 'EXPIRED' WHEN t.expires_at<=$1::timestamptz+interval '1 day' THEN 'D1' WHEN t.expires_at<=$1::timestamptz+interval '7 days' THEN 'D7' ELSE 'D15' END
      FROM ad507.plan_terms t JOIN ad507.addresses a ON a.id=t.address_id
      WHERE a.status='ACTIVE' AND a.request_data->'planLifecycle'->>'termId'=t.id::text AND t.revoked_at IS NULL AND t.expires_at<=$1::timestamptz+interval '15 days' ON CONFLICT DO NOTHING`,[now()]);
   });
  },
  async summary(params=new URLSearchParams()){
   const country=params.get('country'),plan=params.get('plan'),code=params.get('code')??'';
   if(country&&!/^(PA|CO|CR|GT|SV|HN|NI|MX)$/.test(country)||plan&&!paidPlans.includes(plan)||code.length>100)throw Error('INVALID_PLAN_FILTER');
   const rows=await sql.unsafe(`SELECT a.id,a.code,a.country_code,t.plan_code,t.starts_at,t.expires_at,t.revoked_at,
     CASE WHEN t.revoked_at IS NOT NULL OR t.expires_at<=$1 THEN 'EXPIRED' WHEN t.expires_at<=$1::timestamptz+interval '15 days' THEN 'EXPIRING' ELSE 'ACTIVE' END AS state,
     (SELECT count(*)::int FROM ad507.plan_terms p WHERE p.address_id=a.id AND p.kind='RENEWAL') AS renewals,
     (SELECT count(*)::int FROM ad507.plan_mail_outbox m JOIN ad507.plan_terms p ON p.id=m.term_id WHERE p.address_id=a.id AND m.state IN ('FAILED','UNCERTAIN')) AS failed_mail,
     count(*) OVER()::int AS total
     FROM ad507.addresses a JOIN ad507.plan_terms t ON t.id::text=a.request_data->'planLifecycle'->>'termId'
     WHERE a.status='ACTIVE' AND ($2::text IS NULL OR a.country_code=$2) AND ($3::text IS NULL OR t.plan_code=$3) AND ($4='' OR a.code ILIKE '%'||$4||'%') ORDER BY t.expires_at NULLS LAST,a.id LIMIT 100`,[now(),country,plan,code]);
   const counts=await sql.unsafe(`SELECT count(*) FILTER(WHERE t.revoked_at IS NULL AND (t.expires_at IS NULL OR t.expires_at>$1))::int AS active,count(*) FILTER(WHERE t.revoked_at IS NULL AND t.expires_at>$1 AND t.expires_at<=$1::timestamptz+interval '15 days')::int AS expiring,count(*) FILTER(WHERE t.revoked_at IS NOT NULL OR t.expires_at<=$1)::int AS expired,count(*) FILTER(WHERE t.kind='RENEWAL')::int AS renewed FROM ad507.addresses a JOIN ad507.plan_terms t ON t.id::text=a.request_data->'planLifecycle'->>'termId' WHERE a.status='ACTIVE' AND ($2::text IS NULL OR a.country_code=$2) AND ($3::text IS NULL OR t.plan_code=$3) AND ($4='' OR a.code ILIKE '%'||$4||'%')`,[now(),country,plan,code]);
   return {counts:counts[0],items:rows,total:rows[0]?.total??0};
  }
 };
}
