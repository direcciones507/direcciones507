import type {Sql} from 'postgres';
import {ANNUAL_POLICY} from './annual-service';
import {createAccountMailer} from './account-email';

const day = 86400000;
const offsets = [15, 7, 1];

export async function sendAnnualReminders(sql:Sql, mailer:ReturnType<typeof createAccountMailer>, now=new Date()) {
 if(!mailer.configured)return 0;
 const candidates=await sql.unsafe(`
  SELECT a.id::text,a.request_data->'annualService'->>'endsAt' AS "endsAt",o.days
  FROM ad507.addresses a
  CROSS JOIN unnest($2::int[]) AS o(days)
  WHERE a.source='USER_REQUEST' AND a.status='ACTIVE' AND a.publication_receipt IS NOT NULL
    AND a.request_data->'migration' IS NULL
    AND a.request_data->'annualService'->>'policy'=$3
    AND a.request_data->'annualService'->>'mode' IN ('ANNUAL','INSTALLMENTS')
    AND a.request_data->'annualService'->>'paymentHold' IS DISTINCT FROM 'true'
    AND a.request_data->'annualService'->>'endsAt' > $1::text
    AND a.request_data->'annualService'->>'endsAt' > to_char(($1::timestamptz AT TIME ZONE 'UTC')+make_interval(days=>o.days-1),'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    AND a.request_data->'annualService'->>'endsAt' <= to_char(($1::timestamptz AT TIME ZONE 'UTC')+make_interval(days=>o.days),'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    AND NOT EXISTS (
      SELECT 1 FROM ad507.audit_log l WHERE l.entity_id=a.id::text AND l.action='ANNUAL_REMINDER_CLAIMED'
      AND l.metadata @> jsonb_build_object('endsAt',a.request_data->'annualService'->>'endsAt','days',o.days)
    )
  ORDER BY "endsAt",a.id LIMIT 20
 `,[now.toISOString(),offsets,ANNUAL_POLICY]);
 let sent=0;
 for(const candidate of candidates){
  const recipient=await sql.begin(async tx=>{
   const rows=await tx.unsafe(`SELECT request_data FROM ad507.addresses
    WHERE id=$1::uuid AND status='ACTIVE' AND source='USER_REQUEST' FOR UPDATE`,[candidate.id]);
   const data=rows[0]?.request_data,s=data?.annualService;
   const remaining=Date.parse(s?.endsAt)-now.getTime();
   if(data?.migration||s?.policy!==ANNUAL_POLICY||s.paymentHold||!['ANNUAL','INSTALLMENTS'].includes(s.mode)||
      s.endsAt!==candidate.endsAt||remaining<=day*(candidate.days-1)||remaining>day*candidate.days)return null;
   const owners=await tx.unsafe(`SELECT u.email FROM ad507.address_ownership own
    JOIN ad507.users u ON u.id=own.user_id AND u.status='ACTIVE'
    WHERE own.address_id=$1::uuid AND own.ownership_role='OWNER' LIMIT 2`,[candidate.id]);
   if(owners.length!==1||!owners[0].email)return null;
   const claim=await tx.unsafe(`INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,metadata)
    SELECT 'SYSTEM','ANNUAL_REMINDER_CLAIMED','ADDRESS',$1,jsonb_build_object('endsAt',$2::text,'days',$3::int)
    WHERE NOT EXISTS (SELECT 1 FROM ad507.audit_log WHERE entity_id=$1 AND action='ANNUAL_REMINDER_CLAIMED'
      AND metadata @> jsonb_build_object('endsAt',$2::text,'days',$3::int)) RETURNING entity_id`,
    [candidate.id,candidate.endsAt,candidate.days]);
   return claim.length?owners[0].email:null;
  });
  if(!recipient)continue;
  try{
   const delivery=await mailer.send({
    to:recipient,
    subject:'Vencimiento de tu Dirección Digital',
    text:'Tu servicio anual vence en '+candidate.days+(candidate.days===1?' día.':' días.')+
      ' Puedes revisar la fecha y renovar manualmente en https://direcciones.lat/panel. Tu código queda reservado y el mismo enlace se reactiva tras confirmar el pago.'
   });
   if(delivery.sent)sent++;
  }catch{
   // A timeout can follow delivery. Keep the claim to prevent a duplicate.
   console.error('ANNUAL_REMINDER_DELIVERY_UNCONFIRMED');
  }
 }
 return sent;
}
