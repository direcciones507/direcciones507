import type {Sql} from 'postgres';
import type {createAccountMailer} from '../account-email';
import {radarOrderOwner,radarVerifiedOrder} from './verified-orders';

const offsets=[15,7,1];
const active=(daysSource:string)=>`FROM radar.annual_memberships m JOIN radar.verified_order_intents b ON b.order_id=m.order_id
 JOIN ad507.orders o ON o.id=b.order_id JOIN radar.establishments e ON e.id=m.establishment_id
 JOIN ad507.users u ON u.id=b.account_id AND u.status='ACTIVE'
 ${daysSource} WHERE e.published AND b.product='annual' AND b.establishment_id=m.establishment_id AND b.account_id=m.account_id
 AND (${radarVerifiedOrder}) AND (${radarOrderOwner}) AND m.starts_at<=$1::timestamptz
 AND m.ends_at>$1::timestamptz AND u.email IS NOT NULL
 AND NOT EXISTS(
  SELECT 1 FROM radar.annual_memberships next JOIN radar.verified_order_intents b ON b.order_id=next.order_id
  JOIN ad507.orders o ON o.id=b.order_id
  WHERE next.establishment_id=m.establishment_id AND b.establishment_id=m.establishment_id
   AND b.product='annual' AND b.account_id=m.account_id AND next.starts_at<=m.ends_at AND next.ends_at>m.ends_at
   AND (${radarVerifiedOrder})
 )`;
const unclaimed=`NOT EXISTS (SELECT 1 FROM ad507.audit_log a WHERE a.entity_type='ORDER'
 AND a.entity_id=m.order_id::text AND a.action='RADAR_ANNUAL_REMINDER_CLAIMED' AND a.metadata @> jsonb_build_object('days',days))`;
const due=`m.ends_at>$1::timestamptz+make_interval(hours=>(days-1)*24)
 AND m.ends_at<=$1::timestamptz+make_interval(hours=>days*24)`;

export async function sendRadarAnnualReminders(sql:Sql,mailer:Pick<ReturnType<typeof createAccountMailer>,'configured'|'send'>,now=new Date()){
 if(!mailer.configured)return 0;
 const at=now.toISOString();
 const candidates=await sql.unsafe(`SELECT m.order_id,e.id,o_days.days ${active('CROSS JOIN unnest($2::int[]) o_days(days)')}
  AND ${due} AND ${unclaimed} ORDER BY m.ends_at,m.order_id LIMIT 20`,[at,offsets]);
 let sent=0;
 for(const candidate of candidates){
  const email=await sql.begin(async tx=>{
   await tx.unsafe('SELECT id FROM radar.establishments WHERE id=$1::uuid FOR UPDATE',[candidate.id]);
   const [row]=await tx.unsafe(`SELECT u.email ${active('CROSS JOIN (SELECT $3::int AS days) reminder')}
    AND m.order_id=$2::uuid AND ${due} AND ${unclaimed} FOR UPDATE OF o`,[at,candidate.order_id,candidate.days]);
   if(!row)return null;
   await tx.unsafe(`INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,metadata)
    VALUES('SYSTEM','RADAR_ANNUAL_REMINDER_CLAIMED','ORDER',$1,jsonb_build_object('days',$2::int))`,[candidate.order_id,candidate.days]);
   return row.email as string;
  });
  if(!email)continue;
  try{
   const result=await mailer.send({to:email,subject:'Vencimiento de tu ficha comercial de Radar',
    text:`Tu ficha comercial anual de Radar vence en ${candidate.days}${candidate.days===1?' día':' días'}. Puedes renovarla manualmente en https://direcciones.lat/panel.`});
   if(result.sent)sent++;
  }catch{
   // Keep the claim after ambiguous delivery, as with CORE annual reminders.
   console.error('RADAR_ANNUAL_REMINDER_DELIVERY_UNCONFIRMED');
  }
 }
 return sent;
}
