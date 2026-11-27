import type {Sql} from 'postgres';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {createPagaditoSandboxClient} from './pagadito-sandbox-configuration';
import {createPagaditoSandboxOrderBridge,CERTIFICATION_AMOUNTS,isCertificationMode} from './pagadito-sandbox-order-bridge';
import {executeSandboxFirstPayment,type SandboxCard} from './pagadito-sandbox-first-payment';
import {commercialQuote} from './commercial-policy';
import {PagaditoApiError} from './pagadito-rest-client';
import {readRequestBody} from './request-routes';

const endpoint='https://direcciones507-pagadito-sandbox.up.railway.app/v1/internal/pagadito/certification';
const sign=(secret:string,body:string)=>createHmac('sha256',secret).update(body).digest('hex');
const attemptKey=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function certificationReferences(secret:string,addressId:string,mode:string,key?:string){
 const scope=sign(secret,'certification:'+addressId+':'+mode);
 if(!isCertificationMode(mode)||key===undefined)return {operation:scope};
 if(typeof key!=='string'||!attemptKey.test(key))throw Error('CERTIFICATION_INVALID_REQUEST');
 return {operation:sign(secret,'certification-attempt:'+scope+':'+key),scope};
}
const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
type Env=Record<string,string|undefined>;
type CheckoutInput={userId:string;addressId:string;key:string;mode:string;card:SandboxCard;browserInfo:{deviceFingerprintID:string;customerIp:string}};
export function pagaditoRelayEnabled(env:Env){
 return env.AD507_PAGADITO_RELAY_ENABLED==='true'&&!!env.AD507_PAGADITO_RELAY_SECRET&&env.AD507_PAGADITO_RELAY_SECRET.length>=48;
}

export function createPagaditoCertificationRelay(sql:Sql,env:Env){
 return async(input:CheckoutInput)=>{
  const secret=env.AD507_PAGADITO_RELAY_SECRET;
  if(!pagaditoRelayEnabled(env)||!secret)throw Error('CERTIFICATION_DISABLED');
  const q=await createPagaditoSandboxOrderBridge(sql).quote(input.userId,input.addressId,input.mode,input.addressId==='bcd3213d-1b3a-4072-9570-e83c97480fa4');
  if(!q.available)throw Error('CERTIFICATION_ALREADY_EXISTS');
  if(isCertificationMode(input.mode)&&(typeof input.key!=='string'||!attemptKey.test(input.key)))throw Error('CERTIFICATION_INVALID_REQUEST');
  const refs=certificationReferences(secret,input.addressId,input.mode,input.key);
  if(input.card.number!=='4111111111111111'||input.card.expirationDate!=='01/2030'||input.card.cvv!=='123')throw Error('SANDBOX_TEST_CARD_REQUIRED');
  // Send the quote and required browser metadata, not customer or card details.
  // Fail closed during a mixed-version deployment. The isolated relay must support
  // attempt scopes before a new reference may be submitted.
  if(refs.scope){
   const statusBody=JSON.stringify(refs);
   const statusResponse=await fetch(endpoint+'/status',{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-certification-signature':sign(secret,statusBody)},body:statusBody,signal:AbortSignal.timeout(10000)});
   if(!statusResponse.ok||(await statusResponse.json()).repeatSupported!==true)throw Error('CERTIFICATION_SERVICE_UNAVAILABLE');
  }
  const body=JSON.stringify({...refs,plan:q.plan,mode:input.mode,amountCents:q.amountCents,browserInfo:input.browserInfo});
  const r=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-certification-signature':sign(secret,body)},body,signal:AbortSignal.timeout(27000)});
  const data=await r.json();
  if(r.status===409)throw Error('CERTIFICATION_ALREADY_SUBMITTED');
  if(r.status===404||r.status===503)throw Error('CERTIFICATION_SERVICE_UNAVAILABLE');
  if(r.status===400)throw Error('CERTIFICATION_INVALID_REQUEST');
  if(!r.ok||data.result?.state!=='VERIFIED')throw Error('CERTIFICATION_UNCONFIRMED');
  return data.result as {orderId:string;amountCents:number;currency:'USD';authorization:string;state:'VERIFIED'};
 };
}

export async function handlePagaditoCertificationRelay(req:Request,sql:Sql,env:Env):Promise<Response|null>{
 const pathname=new URL(req.url).pathname;
 if(pathname!=='/v1/internal/pagadito/certification'&&pathname!=='/v1/internal/pagadito/certification/status')return null;
 const secret=env.AD507_PAGADITO_RELAY_SECRET;
 if(!secret||secret.length<48||env.AD507_PAGADITO_ISOLATED_DB!=='true'||env.AD507_PAGADITO_CERTIFICATION_ENABLED!=='true'||env.AD507_PAGADITO_ENVIRONMENT!=='sandbox')return json(404,{error:'DISABLED'});
 if(req.method!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
 const signature=req.headers.get('x-certification-signature')||'';
 if(!/^[a-f0-9]{64}$/.test(signature))return json(403,{error:'FORBIDDEN'});
 let body:string;
 try{body=(await readRequestBody(req,8192)).toString('utf8');}catch(error){return json(error instanceof Error&&error.message==='PAYLOAD_TOO_LARGE'?413:400,{error:'INVALID_BODY'});}
 if(!timingSafeEqual(Buffer.from(signature),Buffer.from(sign(secret,body))))return json(403,{error:'FORBIDDEN'});
 let value:any;
 try{value=JSON.parse(body);}catch{return json(400,{error:'INVALID_BODY'});}
 if(!value||typeof value!=='object'||Array.isArray(value))return json(400,{error:'INVALID_BODY'});
 if(pathname.endsWith('/status')){
  if(typeof value.operation!=='string'||! /^[a-f0-9]{64}$/.test(value.operation))return json(400,{error:'INVALID_REFERENCE'});
  if(value.scope!==undefined&&(typeof value.scope!=='string'||! /^[a-f0-9]{64}$/.test(value.scope)||value.scope===value.operation))return json(400,{error:'INVALID_REFERENCE'});
  const rows=await sql.unsafe(`SELECT operation,order_id::text,state,"authorization",to_jsonb(r)->>'amount_cents' AS amount_cents,to_jsonb(r)->>'recorded_at' AS recorded_at FROM ad507.pagadito_certification_relay r WHERE operation=$1 OR ($2::text IS NOT NULL AND (operation=$2 OR to_jsonb(r)->>'attempt_scope'=$2) AND state NOT IN ('VERIFIED','REJECTED')) ORDER BY CASE WHEN operation=$1 THEN 1 ELSE 0 END LIMIT 1`,[value.operation,value.scope??null]);
  const row=rows[0];return json(200,{repeatSupported:true,blockedByPrior:!!row&&row.operation!==value.operation,state:row?.state||'NOT_FOUND',orderId:row?.order_id||null,ern:row?.order_id||null,authorization:row?.authorization||null,amountCents:row?.amount_cents?Number(row.amount_cents):null,recordedAt:row?.recorded_at||null});
 }
 const client=createPagaditoSandboxClient(env);
 if(!client)return json(503,{error:'DISABLED'});
 if(typeof value.operation!=='string'||! /^[a-f0-9]{64}$/.test(value.operation)||(!['ANNUAL','INSTALLMENTS'].includes(value.mode)&&!isCertificationMode(value.mode))||!['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO','PLACE'].includes(value.plan))return json(400,{error:'INVALID_QUOTE'});
 if(value.scope!==undefined&&(!isCertificationMode(value.mode)||typeof value.scope!=='string'||! /^[a-f0-9]{64}$/.test(value.scope)||value.scope===value.operation))return json(400,{error:'INVALID_REFERENCE'});
 if(typeof value.browserInfo?.deviceFingerprintID!=='string'||!/^\d{1,40}$/.test(value.browserInfo.deviceFingerprintID))return json(400,{error:'FINGERPRINT_INVALID'});
 const quote=isCertificationMode(value.mode)?{amountCents:CERTIFICATION_AMOUNTS[value.mode]}:commercialQuote(value.plan,value.mode);
 if(quote.amountCents!==value.amountCents||quote.amountCents<=0)return json(400,{error:'INVALID_QUOTE'});
 // This ledger exists exclusively in the already configured isolated database.
 await sql.unsafe('CREATE TABLE IF NOT EXISTS ad507.pagadito_certification_relay (operation text PRIMARY KEY, order_id uuid NOT NULL UNIQUE, state text NOT NULL, "authorization" text)');
 await sql.unsafe('ALTER TABLE ad507.pagadito_certification_relay ADD COLUMN IF NOT EXISTS amount_cents integer, ADD COLUMN IF NOT EXISTS recorded_at timestamptz, ADD COLUMN IF NOT EXISTS attempt_scope text');
 // Record the outcome and reference of earlier attempts before reserving a new one.
 await sql.unsafe("CREATE TABLE IF NOT EXISTS ad507.pagadito_certification_history (order_id uuid PRIMARY KEY, operation text NOT NULL, outcome text NOT NULL, evidence text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now())");
 const id=crypto.randomUUID();
 const reserved=await sql.begin(async tx=>{
  if(value.scope){
   // Serialize reservations for a modality, including its historical fixed reference.
   await tx.unsafe('SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))',[value.scope]);
   const unresolved=await tx.unsafe("SELECT operation FROM ad507.pagadito_certification_relay WHERE (operation=$1 OR attempt_scope=$1) AND operation<>$2 AND state NOT IN ('VERIFIED','REJECTED') LIMIT 1",[value.scope,value.operation]);
   if(unresolved.length)return [];
  }else if(isCertificationMode(value.mode)){
   await tx.unsafe('SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))',[value.operation]);
   const unresolved=await tx.unsafe("SELECT operation FROM ad507.pagadito_certification_relay WHERE attempt_scope=$1 AND state NOT IN ('VERIFIED','REJECTED') LIMIT 1",[value.operation]);
   if(unresolved.length)return [];
  }
  const existing=await tx.unsafe('SELECT order_id::text AS order_id,state,"authorization" FROM ad507.pagadito_certification_relay WHERE operation=$1 FOR UPDATE',[value.operation]);
  const prior=existing[0];
  if(!prior)return tx.unsafe("INSERT INTO ad507.pagadito_certification_relay(operation,order_id,state,attempt_scope,amount_cents,recorded_at) VALUES($1,$2::uuid,'SUBMITTING',$3,$4,now()) ON CONFLICT DO NOTHING RETURNING order_id",[value.operation,id,value.scope??null,quote.amountCents]);
  if(isCertificationMode(value.mode))return [];
  // Only definite provider rejections or the exact Sandbox reference manually
  // reconciled by the merchant after checking the provider report may be retried.
  const manuallyReconciled=prior.state==='UNCERTAIN'&&!prior.authorization&&prior.order_id===env.AD507_PAGADITO_RECONCILED_ORDER_ID;
  if(prior.state!=='REJECTED'&&!manuallyReconciled)return [];
  await tx.unsafe("INSERT INTO ad507.pagadito_certification_history(order_id,operation,outcome,evidence) VALUES($1::uuid,$2,$3,$4) ON CONFLICT DO NOTHING",[prior.order_id,value.operation,manuallyReconciled?'RECONCILED_NO_PAYMENT':prior.state,manuallyReconciled?(env.AD507_PAGADITO_RECONCILIATION_EVIDENCE||'Merchant checked Pagadito Sandbox report; no payment found'):'Definitive provider validation rejection']);
  return tx.unsafe("UPDATE ad507.pagadito_certification_relay SET order_id=$2::uuid,state='SUBMITTING' WHERE operation=$1 AND order_id=$3::uuid AND \"authorization\" IS NULL RETURNING order_id",[value.operation,id,prior.order_id]);
 });
 if(!reserved.length){
  const rows=await sql.unsafe('SELECT order_id::text,state,"authorization",recorded_at FROM ad507.pagadito_certification_relay WHERE operation=$1',[value.operation]);
  const previous=rows[0];
  if(previous?.state==='VERIFIED')return json(200,{result:{orderId:previous.order_id,ern:previous.order_id,recordedAt:previous.recorded_at,amountCents:quote.amountCents,currency:'USD',state:'VERIFIED',authorization:previous.authorization}});
  return json(409,{error:'CERTIFICATION_ALREADY_SUBMITTED'});
 }
 const recordedAt=new Date().toISOString();
 await sql.unsafe('UPDATE ad507.pagadito_certification_relay SET amount_cents=$2,recorded_at=$3::timestamptz WHERE operation=$1',[value.operation,quote.amountCents,recordedAt]);
 try{
  const verified=await executeSandboxFirstPayment(client,{id,provider:'PAGADITO',payment_environment:'test',status:'PENDING',amount_cents:quote.amountCents,currency:'USD',payment_plan:value.plan},{number:'4111111111111111',expirationDate:'01/2030',cvv:'123',cardHolderName:'Sandbox Test',firstName:'Sandbox',lastName:'Test',email:'sandbox@example.com',billingAddress:{city:'Panama',state:'Panama',zip:'',countryId:'591',line1:'Sandbox',phone:'50760000000'}},value.browserInfo);
  await sql.unsafe("UPDATE ad507.pagadito_certification_relay SET state='VERIFIED',\"authorization\"=$2 WHERE operation=$1",[value.operation,verified.authorization]);
  return json(200,{result:{orderId:id,ern:id,recordedAt,amountCents:quote.amountCents,currency:'USD',authorization:verified.authorization,state:'VERIFIED'}});
 }catch(error){
  console.warn('Pagadito certification failure', {orderId:id,category:error instanceof Error?error.name:'UnknownError'});
  const rejected=error instanceof PagaditoApiError&&[400,401].includes(error.status);
  await sql.unsafe("UPDATE ad507.pagadito_certification_relay SET state=$2 WHERE operation=$1",[value.operation,rejected?'REJECTED':'UNCERTAIN']);
  return json(rejected?422:502,{error:rejected?'CERTIFICATION_REJECTED':'CERTIFICATION_UNCONFIRMED',orderId:id});
 }
}

/** Read-only reconciliation of a prior Sandbox attempt. Does not submit payment. */
export async function lookupPagaditoCertification(sql:Sql,env:Env,userId:string,addressId:string,mode:string,key?:string){
 const secret=env.AD507_PAGADITO_RELAY_SECRET;
 if(!pagaditoRelayEnabled(env)||!secret)throw Error('CERTIFICATION_DISABLED');
 await createPagaditoSandboxOrderBridge(sql).quote(userId,addressId,mode,addressId==='bcd3213d-1b3a-4072-9570-e83c97480fa4');
 const body=JSON.stringify(certificationReferences(secret,addressId,mode,key));
 const response=await fetch(endpoint+'/status',{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-certification-signature':sign(secret,body)},body,signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('CERTIFICATION_STATUS_UNAVAILABLE');
 const result=await response.json();
 return result;
}
