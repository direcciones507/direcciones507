import type {Sql} from 'postgres';
import {createHash,randomBytes} from 'node:crypto';
import {commercialQuote} from './commercial-policy';
export function createAdvertisingRepository(sql:Sql,environment:string,enabled=false){
 const own=async(tx:any,userId:string,id:string)=>{
  if(!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9-]{36}$/.test(userId))throw Error('PAYMENT_NOT_FOUND');
  const rows=await tx.unsafe("SELECT a.* FROM ad507.addresses a JOIN ad507.address_ownership o ON o.address_id=a.id JOIN ad507.users u ON u.id=o.user_id WHERE a.id=$1::uuid AND o.user_id=$2::uuid AND o.ownership_role='OWNER' AND u.status='ACTIVE' AND a.source='USER_REQUEST' AND a.address_type='PLACE' AND a.status='ACTIVE' AND a.country_code='PA' AND a.publication_receipt IS NOT NULL FOR UPDATE OF a",[id,userId]);
  if(!rows[0]||rows[0].request_data?.migration)throw Error('PAYMENT_NOT_FOUND');return rows[0];
 };
 const admin=async(tx:any,id:string)=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('FORBIDDEN');const r=await tx.unsafe("SELECT 1 FROM ad507.users u JOIN ad507.user_roles r ON r.user_id=u.id WHERE u.id=$1::uuid AND u.status='ACTIVE' AND r.role='ADMIN'",[id]);if(!r.length)throw Error('FORBIDDEN');};
 return {
 async quote(userId:string,id:string,mode='PLACE_AD_30'){
  return sql.begin(async tx=>{const row=await own(tx,userId,id),images=await tx.unsafe("SELECT id::text FROM ad507.address_media WHERE address_id=$1::uuid AND upload_status='READY' AND media_type='IMAGE' ORDER BY position,id",[id]);
   return {...commercialQuote('PLACE',mode),addressId:id,paymentAvailable:enabled,images,state:row.request_data?.adService?.status??'NONE',orderId:['AWAITING_PAYMENT','PENDING_REVIEW','REJECTED'].includes(row.request_data?.adService?.status)||row.request_data?.adService?.status==='APPROVED'&&Date.parse(row.request_data.adService.endsAt)>Date.now()?row.request_data.adService.orderId:null};
  });
 },
 async prepare(userId:string,id:string,key:string,mode:string,raw:any){
  if(!enabled)throw Error('PAYMENT_MODALITY_NOT_ENABLED');if(!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw Error('INVALID_IDEMPOTENCY_KEY');
  const title=String(raw?.title??'').trim(),text=String(raw?.text??'').trim(),mediaId=String(raw?.mediaId??''),link=String(raw?.link??'');
  if(!title||title.length>100||!text||text.length>500||!/^[a-f0-9-]{36}$/.test(mediaId))throw Error('INVALID_PAYMENT_REQUEST');
  const target=new URL(link);if(target.protocol!=='https:'||target.username||target.password||link.length>2048)throw Error('INVALID_PAYMENT_REQUEST');
  return sql.begin(async tx=>{const row=await own(tx,userId,id),s=row.request_data?.adService;
   const operation=createHash('sha256').update('place-ad:'+environment+':'+userId+':'+id+':'+key).digest('hex');
   const previous=await tx.unsafe("SELECT * FROM ad507.orders WHERE operation_key=$1 AND provider='YAPPY'",[operation]);if(previous[0])return {required:true,order:previous[0]};
   if(s&&(['AWAITING_PAYMENT','PENDING_REVIEW','REJECTED'].includes(s.status)||s.status==='APPROVED'&&Date.parse(s.endsAt)>Date.now()))throw Error('PAYMENT_ALREADY_EXISTS');
   const media=await tx.unsafe("SELECT id FROM ad507.address_media WHERE id=$1::uuid AND address_id=$2::uuid AND upload_status='READY' AND media_type='IMAGE'",[mediaId,id]);if(!media.length)throw Error('INVALID_PAYMENT_REQUEST');
   const q=commercialQuote('PLACE',mode),order=await tx.unsafe("INSERT INTO ad507.orders(user_id,address_id,amount_cents,provider,payment_plan,payment_environment,provider_order_id,operation_key) VALUES($1::uuid,$2::uuid,$3,'YAPPY','PLACE',$4,$5,$6) RETURNING *",[userId,id,q.amountCents,environment,randomBytes(7).toString('hex'),operation]);
   await tx.unsafe("INSERT INTO ad507.commercial_payment_terms(order_id,address_id,payment_environment,purpose,cycle,quote) VALUES($1::uuid,$2::uuid,$3,'PLACE_AD',$4,$5::jsonb)",[order[0].id,id,environment,operation,tx.json(q)]);
   await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{adService}',$2::jsonb),updated_at=now() WHERE id=$1::uuid",[id,tx.json({orderId:order[0].id,status:'AWAITING_PAYMENT',durationDays:q.durationDays,title,text,link:target.href,mediaId})]);
   await tx.unsafe("INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id) VALUES($1::uuid,'USER','PLACE_AD_PREPARED','ORDER',$2)",[userId,order[0].id]);return {required:true,order:order[0]};
  });
 },
 async pending(actor:string){return sql.begin(async tx=>{await admin(tx,actor);return tx.unsafe("SELECT id::text,name,code,request_data->'adService' AS advertising FROM ad507.addresses WHERE source='USER_REQUEST' AND request_data->'migration' IS NULL AND request_data->'adService'->>'status'='PENDING_REVIEW' ORDER BY updated_at LIMIT 100");});},
 async review(actor:string,id:string,decision:string){
  if(!['APPROVED','REJECTED'].includes(decision)||!/^[a-f0-9-]{36}$/.test(id))throw Error('INVALID_PAYMENT_REQUEST');
  return sql.begin(async tx=>{await admin(tx,actor);const rows=await tx.unsafe("SELECT * FROM ad507.addresses WHERE id=$1::uuid AND source='USER_REQUEST' AND address_type='PLACE' AND status='ACTIVE' FOR UPDATE",[id]);const row=rows[0],s=row?.request_data?.adService;
   if(!row||row.request_data?.migration||!s)throw Error('PAYMENT_NOT_FOUND');if(s.status===decision)return {id,status:s.status};if(s.status!=='PENDING_REVIEW')throw Error('INVALID_PAYMENT_STATE');
   const paid=await tx.unsafe("SELECT o.id FROM ad507.orders o JOIN ad507.commercial_payment_terms t ON t.order_id=o.id WHERE o.id=$1::uuid AND o.address_id=$2::uuid AND o.payment_environment=$3 AND o.status='PAID' AND o.confirmed_at IS NOT NULL AND t.purpose='PLACE_AD' AND o.amount_cents=(t.quote->>'amountCents')::integer",[s.orderId,id,environment]);if(!paid.length)throw Error('PAYMENT_CONFIRMATION_REQUIRED');
   const startsAt=new Date().toISOString(),terms={...s,status:decision,reviewedBy:actor,...(decision==='APPROVED'?{startsAt,endsAt:new Date(Date.parse(startsAt)+s.durationDays*86400000).toISOString()}:{} )};
   await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{adService}',$2::jsonb),updated_at=now() WHERE id=$1::uuid",[id,tx.json(terms)]);
   await tx.unsafe("INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,metadata) VALUES($1::uuid,'ADMIN',$2,'ADDRESS',$3,$4::jsonb)",[actor,'PLACE_AD_'+decision,id,tx.json({orderId:s.orderId})]);return {id,status:decision};
  });
 }
 };
}
export async function confirmPlaceAdvertising(tx:any,order:any){
 if(order.payment_plan!=='PLACE'||order.status!=='PAID'||!order.confirmed_at)return;
 const rows=await tx.unsafe("SELECT request_data FROM ad507.addresses WHERE id=$1::uuid AND source='USER_REQUEST' FOR UPDATE",[order.address_id]);const data=rows[0]?.request_data,s=data?.adService;
 if(data?.migration||s?.orderId!==order.id||s.status!=='AWAITING_PAYMENT')return;
 await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{adService}',$2::jsonb),updated_at=now() WHERE id=$1::uuid",[order.address_id,tx.json({...s,status:'PENDING_REVIEW',paidAt:new Date(order.confirmed_at).toISOString()})]);
}
