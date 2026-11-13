/** Terms are attached only to new, server-created payment intents. No backfill. */
export const ANNUAL_POLICY='annual-manual-20261113';
export const annualPlans=['RESIDENTIAL','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'];
export function annualEnd(start:string):string {
 const d=new Date(start);if(!Number.isFinite(d.getTime()))throw Error('INVALID_SERVICE_DATE');
 const month=d.getUTCMonth(),day=d.getUTCDate();d.setUTCDate(1);d.setUTCFullYear(d.getUTCFullYear()+1);d.setUTCMonth(month);
 const last=new Date(Date.UTC(d.getUTCFullYear(),month+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString();
}
export function serviceExpired(data:any,now=Date.now()):boolean {
 const s=data?.annualService;return !data?.migration&&s?.policy===ANNUAL_POLICY&&(!s.startsAt||!s.endsAt||!Number.isFinite(Date.parse(s.endsAt))||Date.parse(s.endsAt)<=now);
}
export function effectiveServicePlan(data:any,plan:string|null,now=Date.now()):string|null {
 if(data?.migration||data?.annualService?.policy!==ANNUAL_POLICY)return plan;
 if(serviceExpired(data,now))return plan==='RESIDENTIAL'?plan:'BUSINESS_FREE';
 const s=data.annualService;
 if(s.mode==='INSTALLMENTS'&&!s.fullyPaid){
  if(plan==='BUSINESS_PREMIUM_PRO'&&s.secondDueAt&&now>Date.parse(s.secondDueAt)+5*86400000)return 'BUSINESS_PREMIUM';
  const half=new Date(s.startsAt);const day=half.getUTCDate();half.setUTCDate(1);half.setUTCMonth(half.getUTCMonth()+6);const last=new Date(Date.UTC(half.getUTCFullYear(),half.getUTCMonth()+1,0)).getUTCDate();half.setUTCDate(Math.min(day,last));
  if(plan==='BUSINESS_PREMIUM'&&now>=half.getTime())return 'BUSINESS_FREE';
 }
 return plan;
}
export async function activateAnnualService(tx:any,addressId:string,environment:string){
 const rows=await tx.unsafe("SELECT request_data,source,status FROM ad507.addresses WHERE id=$1::uuid FOR UPDATE",[addressId]);const row=rows[0],s=row?.request_data?.annualService;
 if(!row||row.source!=='USER_REQUEST'||row.request_data?.migration||s?.policy!==ANNUAL_POLICY||s.startsAt||!annualPlans.includes(s.plan))return;
 const paid=await tx.unsafe("SELECT id FROM ad507.orders WHERE id=$1::uuid AND address_id=$2::uuid AND payment_environment=$3 AND payment_plan=$4 AND status='PAID' AND confirmed_at IS NOT NULL",[s.orderId,addressId,environment,s.plan]);
 if(!paid.length)throw Error('PAYMENT_CONFIRMATION_REQUIRED');
 const startsAt=new Date().toISOString(),terms={...s,startsAt,endsAt:annualEnd(startsAt),lastPaidOrderId:s.orderId,...(s.mode==='INSTALLMENTS'?{secondDueAt:new Date(Date.parse(startsAt)+30*86400000).toISOString()}:{} )};
 await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{annualService}',$2::jsonb) WHERE id=$1::uuid",[addressId,tx.json(terms)]);
 await tx.unsafe("INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,metadata) VALUES('SYSTEM','ANNUAL_SERVICE_ACTIVATED','ADDRESS',$1,$2::jsonb)",[addressId,tx.json(terms)]);
}
/** Same signed IPN and immutable order; duplicates never extend a second time. */
export async function applyAnnualRenewal(tx:any,order:any){
 const rows=await tx.unsafe("SELECT * FROM ad507.addresses WHERE id=$1::uuid FOR UPDATE",[order.address_id]);const row=rows[0],s=row?.request_data?.annualService;
 if(!row||row.source!=='USER_REQUEST'||row.request_data?.migration||s?.policy!==ANNUAL_POLICY)return;
 if(s.pendingSecondOrderId===order.id&&order.status==='PAID'&&order.confirmed_at&&order.payment_plan===s.plan){
  const terms={...s,fullyPaid:true,pendingSecondOrderId:null,lastPaidOrderId:order.id};
  await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{annualService}',$2::jsonb),updated_at=now() WHERE id=$1::uuid",[row.id,tx.json(terms)]);
  await tx.unsafe("INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,metadata) VALUES('SYSTEM','ANNUAL_INSTALLMENTS_COMPLETED','ADDRESS',$1,$2::jsonb)",[row.id,tx.json({orderId:order.id,endsAt:s.endsAt})]);return;
 }
 if(s.pendingRenewalOrderId!==order.id)return;
 if(order.status!=='PAID'||!order.confirmed_at||order.payment_plan!==s.plan||!s.endsAt)throw Error('PAYMENT_CONFIRMATION_REQUIRED');
 const startsAt=new Date(Math.max(Date.parse(s.endsAt),Date.parse(order.confirmed_at))).toISOString();
 const terms={...s,endsAt:annualEnd(startsAt),lastPaidOrderId:order.id,pendingRenewalOrderId:null,mode:'ANNUAL',fullyPaid:true,secondDueAt:null,pendingSecondOrderId:null};
 await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{annualService}',$2::jsonb),updated_at=now() WHERE id=$1::uuid",[row.id,tx.json(terms)]);
 await tx.unsafe("INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,metadata) VALUES('SYSTEM','ANNUAL_SERVICE_RENEWED','ADDRESS',$1,$2::jsonb)",[row.id,tx.json({orderId:order.id,startsAt,endsAt:terms.endsAt})]);
}
