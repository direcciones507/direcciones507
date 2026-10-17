import type {Sql} from 'postgres';
import {createAccountMailer,type Mail} from './account-email';
import {COUNTRY_TIMEZONES} from './plan-policy';
import {proposedCountryUrl} from './country-configuration';

export const PLAN_SENDER='soporte@direcciones507.com';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function planMailTemplate(data:{code:string;name:string;country:string;expiresAt:string|null;kind:string}) {
 const url=proposedCountryUrl(data.country,data.code),qr='https://direcciones.lat/v1/addresses/'+data.code+'/qr.png';
 const expiry=data.expiresAt?new Intl.DateTimeFormat('es',{dateStyle:'long',timeStyle:'short',timeZone:COUNTRY_TIMEZONES[data.country]??'UTC'}).format(new Date(data.expiresAt)):'Sin vencimiento programado';
 const heading=data.kind==='DELIVERY'?'Tu dirección digital está lista':data.kind==='RENEWED'?'Renovación confirmada':data.kind==='EXPIRED'?'Tu plan ha vencido':'Tu plan está próximo a vencer';
 const detail=data.kind==='EXPIRED'?'Los beneficios pagados están suspendidos. Conservas indefinidamente tu código, enlace y QR.':'Conservas indefinidamente tu código, enlace y QR.';
 const panel='https://direcciones.lat/panel?country='+encodeURIComponent(data.country);
 const text=[heading,data.name,'Código: '+data.code,'Dirección: '+url,'QR: '+qr,'Vigencia: '+expiry,detail,'Mi cuenta y renovación voluntaria: '+panel,'No realizamos cobros automáticos.','Direcciones 507/LATAM',PLAN_SENDER].join('\n');
 const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+escape(heading)+'</title></head><body style="font-family:Arial,sans-serif;color:#142748;background:#f3f6fa;padding:24px"><main style="max-width:580px;margin:auto;background:white;padding:24px;border-radius:14px"><h1 style="font-size:24px;color:#124ca1">'+escape(heading)+'</h1><p>'+escape(data.name)+'</p><p><strong>'+escape(data.code)+'</strong></p><p><a href="'+url+'">Abrir dirección digital</a></p><p><a href="'+qr+'">Descargar QR</a></p><p>Vigencia: '+escape(expiry)+'</p><p>'+escape(detail)+'</p><p><a href="'+panel+'">Mi cuenta y renovación voluntaria</a></p><p>No realizamos cobros automáticos.</p><footer>Direcciones 507/LATAM · '+PLAN_SENDER+'</footer></main></body></html>';
 return {subject:heading+' · '+data.code,text,html};
}
export function createPlanMailWorker(sql:Sql,env:Record<string,string|undefined>,request:typeof fetch=fetch,clock=()=>new Date()) {
 const mailer=createAccountMailer(env,request);
 // The generic webhook must explicitly promise durable idempotency and return
 // an accepted message id. No blind retries against a non-idempotent relay.
 const relaySafe=!env.EMAIL_WEBHOOK_URL||env.AD507_EMAIL_WEBHOOK_IDEMPOTENT==='true';
 const configured=env.AD507_PLAN_EMAIL_ENABLED==='true'&&env.EMAIL_FROM===PLAN_SENDER&&mailer.configured&&relaySafe;
 return {configured,async run(limit=50){
  if(!configured)return {sent:0,configured:false};
  let sent=0;
  for(let index=0;index<Math.min(limit,100);index++){
   const at=clock();
   const claimed=await sql.begin(async tx=>{
    const [job]=await tx.unsafe("SELECT * FROM ad507.plan_mail_outbox WHERE state IN ('PENDING','SENDING') AND available_at<=$1 ORDER BY available_at,id LIMIT 1 FOR UPDATE SKIP LOCKED",[at]);if(!job)return null;
    if(job.first_attempt_at&&at.getTime()-new Date(job.first_attempt_at).getTime()>=23*60*60*1000){await tx.unsafe("UPDATE ad507.plan_mail_outbox SET state='UNCERTAIN',last_error='RECONCILE_PROVIDER_BEFORE_RETRY' WHERE id=$1::uuid",[job.id]);return {skip:true};}
    const owners=await tx.unsafe(`SELECT u.id AS owner_id,u.email,a.code,a.name,a.country_code,t.expires_at,a.request_data,t.revoked_at
      FROM ad507.plan_terms t JOIN ad507.addresses a ON a.id=t.address_id JOIN ad507.address_ownership o ON o.address_id=a.id AND o.ownership_role='OWNER' JOIN ad507.users u ON u.id=o.user_id AND u.status='ACTIVE'
      WHERE t.id=$1::uuid AND a.source='USER_REQUEST' AND a.address_type IN ('BUSINESS','PLACE') AND a.status='ACTIVE' AND a.review_decision='APPROVED' AND a.publication_receipt IS NOT NULL AND NOT a.request_data ? 'migration'`,[job.term_id]);
    const owner=owners[0];
    const stale=owner&&(owner.request_data.planLifecycle?.termId!==job.term_id||owner.revoked_at);
    const tooLate=owner&&['D15','D7','D1'].includes(job.kind)&&new Date(owner.expires_at)<=at;
    if(owners.length!==1||!owner||stale||tooLate||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email)||job.payload&&(job.payload.ownerId!==owner.owner_id||job.payload.to!==owner.email)){
      await tx.unsafe("UPDATE ad507.plan_mail_outbox SET state='CANCELLED',last_error='RECIPIENT_OR_TERM_CHANGED' WHERE id=$1::uuid",[job.id]);return {skip:true};
    }
    const payload=job.payload??{ownerId:owner.owner_id,to:owner.email,...planMailTemplate({code:owner.code,name:owner.name,country:owner.country_code,expiresAt:owner.expires_at?new Date(owner.expires_at).toISOString():null,kind:job.kind})};
    await tx.unsafe("UPDATE ad507.plan_mail_outbox SET state='SENDING',attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,$2),available_at=$2::timestamptz+interval '2 minutes',payload=$3::jsonb WHERE id=$1::uuid",[job.id,at,tx.json(payload)]);
    return {...job,payload,attempts:job.attempts+1};
   });
   if(!claimed)break;if(claimed.skip)continue;
   try{
    const mail:Mail={to:claimed.payload.to,subject:claimed.payload.subject,text:claimed.payload.text,html:claimed.payload.html,idempotencyKey:'ad507-plan-'+claimed.id};
    const result=await mailer.send(mail);if(!result.sent)throw Error('EMAIL_NOT_CONFIGURED');
    await sql.unsafe("UPDATE ad507.plan_mail_outbox SET state='SENT',sent_at=$2,provider_id=$3,last_error=NULL WHERE id=$1::uuid",[claimed.id,clock(),result.providerId??null]);sent++;
   }catch(error){
    const status=(error as {status?:number}).status;
    const retry=(!status||status===429||status>=500)&&claimed.attempts<10;
    const delay=Math.min(3600,60*2**(claimed.attempts-1));
    await sql.unsafe("UPDATE ad507.plan_mail_outbox SET state=$2,available_at=$3,last_error=$4 WHERE id=$1::uuid",[claimed.id,retry?'PENDING':'FAILED',new Date(clock().getTime()+delay*1000),status?'PROVIDER_HTTP_'+status:'PROVIDER_UNCONFIRMED']);
   }
  }
  return {sent,configured:true};
 }};
}
