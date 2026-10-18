import {readRequestBody} from './request-routes';
import type {Sql} from 'postgres';
import {createHash} from 'node:crypto';
import {canOfferAnalytics} from './analytics-summary-view';
const actions=['google','waze','uber','share','copy','aviso','whatsapp','call','qr'];
export const analyticsEvents=['visit',...actions];
const limits=new Map<string,{minute:number;count:number}>();
function allow(key:string,max:number){const minute=Math.floor(Date.now()/60000);for(const [k,v]of limits)if(v.minute!==minute)limits.delete(k);const row=limits.get(key)||{minute,count:0};if(!limits.has(key)&&limits.size>=2048)return false;limits.set(key,row);return ++row.count<=max;}
const codeRe=/^AD\d{2,3}-[A-Z0-9_-]+$/;
/** Same event store as historical analytics; no migration or bootstrap at runtime. */
export function createAnalyticsRepository(sql:Sql){
 async function address(code:string,owner?:string){
  const rows=await sql.unsafe(`SELECT a.id,a.code,a.address_type AS "addressType",a.status,a.source,to_jsonb(a)->>'publication_receipt' AS receipt,CASE WHEN a.address_type='PLACE' AND p.code IS NULL THEN 'PLACE' ELSE p.code END AS "planCode",to_jsonb(a)->'request_data'->>'workflow' AS workflow FROM ad507.addresses a LEFT JOIN ad507.plans p ON p.id=a.plan_id WHERE a.code=$1 AND a.status='ACTIVE' AND a.address_type IN ('BUSINESS','PLACE') ${owner?'AND EXISTS(SELECT 1 FROM ad507.address_ownership o WHERE o.address_id=a.id AND o.user_id=$2::uuid)':''}`,owner?[code,owner]:[code]);
  return rows.length===1&&canOfferAnalytics(rows[0])?rows[0]:null;
 }
 return {
 async summary(owner:string,code:string,requestedDays=30){
  const initial=codeRe.test(code)?await address(code,owner):null;if(!initial)throw Error('NOT_FOUND');
  const days=initial.planCode==='BUSINESS_PREMIUM_PRO'&&[7,30,90].includes(requestedDays)?requestedDays:30;
  const rows=await sql.unsafe(`SELECT event_type,to_char(occurred_at AT TIME ZONE 'America/Panama','YYYY-MM-DD') AS day,count(*)::int AS total FROM ad507.ad507_business_analytics_events WHERE ad507_code=$1 AND occurred_at>=(date_trunc('day',now() AT TIME ZONE 'America/Panama') AT TIME ZONE 'America/Panama')-($2::int-1)*interval '1 day' AND occurred_at<=now() GROUP BY event_type,day ORDER BY day,event_type`,[code,days]);
  // Recheck ownership and plan after reading, so transfers/downgrades cannot leak a cached entitlement.
  const a=await address(code,owner);if(!a||a.planCode!==initial.planCode)throw Error('NOT_FOUND');
  const plan=a.planCode==='BUSINESS_PREMIUM_PRO'?'premium_pro':a.planCode==='BUSINESS_PREMIUM'?'premium':a.planCode==='PLACE'?'place':'free';
  const support=await sql.unsafe("SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ad507.ad507_business_analytics_events'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%visit%') AS ready");
  const visits=rows.filter(r=>r.event_type==='visit').reduce((n,r)=>n+Number(r.total),0);
  const interactions:Record<string,number>={};for(const r of rows)if(actions.includes(r.event_type))interactions[r.event_type]=(interactions[r.event_type]||0)+Number(r.total);
  return {ok:true,plan,visits:visits?{status:'available',total:visits}:{status:support[0]?.ready?'no_data':'not_available'},...(['premium','premium_pro'].includes(plan)?{interactions}:{}),...(plan==='premium_pro'?{period_days:days,daily_series:rows.filter(r=>analyticsEvents.includes(r.event_type))}:{})};
 },
 async track(code:string,event:string,session:string,now=Date.now()){
  if(!codeRe.test(code)||!analyticsEvents.includes(event)||! /^[A-Za-z0-9_-]{43}$/.test(session))throw Error('INVALID_EVENT');
  const target=await address(code);if(!target||target.source!=='USER_REQUEST'||!target.receipt)throw Error('NOT_FOUND');
  // Only a per-tab random nonce is accepted, never IP/identity. Stable 30-minute
  // key deduplicates reloads, repeated buttons and concurrent retries in PostgreSQL.
  const hex=createHash('sha256').update([code,event,session,Math.floor(now/1800000)].join('|')).digest('hex');
  const key=hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-a'+hex.slice(17,20)+'-'+hex.slice(20,32);
  const rows=await sql.unsafe(`INSERT INTO ad507.ad507_business_analytics_events(ad507_code,event_type,idempotency_key) VALUES($1,$2,$3::uuid) ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING event_id`,[code,event,key]);
  return {ok:true,duplicate:!rows.length};
 }
 };
}
export async function handleAnalyticsRoutes(req:Request,context:{sql:Sql;auth:{currentUser:(req:Request)=>Promise<any>}}):Promise<Response|null>{
 const url=new URL(req.url),privateMatch=url.pathname.match(/^\/v1\/user\/analytics\/(AD\d{2,3}-[A-Z0-9_-]+)$/),tracking=url.pathname==='/internal/v1/analytics/track';
 if(!privateMatch&&!tracking)return null;
 const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff'};
 const json=(status:number,data:unknown)=>Response.json(data,{status,headers});
 // Preserve historical requests and their original validation/session paths.
 if(tracking){
  if(req.method!=='POST')return null;
  if(req.headers.get('content-length')&&Number(req.headers.get('content-length'))>1024)return json(413,{ok:false});
  let body:any;try{const bytes=await readRequestBody(req.clone(),1024);body=JSON.parse(bytes.toString());}catch(e){return (e as Error).message==='PAYLOAD_TOO_LARGE'?json(413,{ok:false}):null;}
  if(body?.source!=='core_public_card')return null;
  const expectedOrigin=url.protocol==='http:'&&req.headers.get('x-forwarded-proto')==='https'?'https://'+url.host:url.origin;
  if(req.headers.get('sec-fetch-site')==='cross-site'||req.headers.get('origin')!==expectedOrigin||!['direcciones507.com','www.direcciones507.com','direcciones.lat','ad507-core-production.up.railway.app','localhost','127.0.0.1'].includes(url.hostname))return json(403,{ok:false});
  if(!allow('global',2000)||!allow('code:'+String(body.code).slice(0,90),120))return json(429,{ok:false});
  if(body.consent!==true)return json(400,{ok:false,error:'CONSENT_REQUIRED'});
  try{return json(202,await createAnalyticsRepository(context.sql).track(body.code,body.event,body.session));}catch(e){return json((e as Error).message==='INVALID_EVENT'?400:(e as Error).message==='NOT_FOUND'?404:503,{ok:false,error:'ANALYTICS_UNAVAILABLE'});}
 }
 if(req.method!=='GET')return json(405,{ok:false});
 const days=url.searchParams.get('days');if(days!==null&&!['7','30','90'].includes(days))return json(400,{ok:false,error:'INVALID_PERIOD'});
 try{const user=await context.auth.currentUser(req);if(!user)return json(401,{ok:false});if(!allow('user:'+user.id,120))return json(429,{ok:false});return json(200,await createAnalyticsRepository(context.sql).summary(user.id,privateMatch![1],days===null?30:Number(days)));}catch(e){return json((e as Error).message==='NOT_FOUND'?404:503,{ok:false,error:'ANALYTICS_UNAVAILABLE'});}
}
