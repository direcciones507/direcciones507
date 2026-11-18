import type {Sql} from 'postgres';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {createPagaditoSandboxClient} from './pagadito-sandbox-configuration';
import {createPagaditoSandboxOrderBridge} from './pagadito-sandbox-order-bridge';
import {executeSandboxFirstPayment,type SandboxCard} from './pagadito-sandbox-first-payment';
import {commercialQuote} from './commercial-policy';

const endpoint='https://direcciones507-pagadito-sandbox.up.railway.app/v1/internal/pagadito/certification';
const sign=(secret:string,body:string)=>createHmac('sha256',secret).update(body).digest('hex');
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
  const q=await createPagaditoSandboxOrderBridge(sql).quote(input.userId,input.addressId,input.mode);
  if(!q.available)throw Error('CERTIFICATION_ALREADY_EXISTS');
  const operation=sign(secret,'certification:'+input.addressId+':'+input.mode);
  if(input.card.number!=='4111111111111111'||input.card.expirationDate!=='01/2030'||input.card.cvv!=='123')throw Error('SANDBOX_TEST_CARD_REQUIRED');
  // Send the quote and required browser metadata, not customer or card details.
  const body=JSON.stringify({operation,plan:q.plan,mode:input.mode,amountCents:q.amountCents,browserInfo:input.browserInfo});
  const r=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-certification-signature':sign(secret,body)},body,signal:AbortSignal.timeout(27000)});
  const data=await r.json();
  if(!r.ok||data.result?.state!=='VERIFIED')throw Error('CERTIFICATION_UNCONFIRMED');
  return data.result as {orderId:string;amountCents:number;currency:'USD';authorization:string;state:'VERIFIED'};
 };
}

export async function handlePagaditoCertificationRelay(req:Request,sql:Sql,env:Env):Promise<Response|null>{
 if(new URL(req.url).pathname!=='/v1/internal/pagadito/certification')return null;
 const secret=env.AD507_PAGADITO_RELAY_SECRET;
 if(!secret||secret.length<48||env.AD507_PAGADITO_ISOLATED_DB!=='true'||env.AD507_PAGADITO_CERTIFICATION_ENABLED!=='true'||env.AD507_PAGADITO_ENVIRONMENT!=='sandbox')return json(404,{error:'DISABLED'});
 if(req.method!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
 const signature=req.headers.get('x-certification-signature')||'';
 if(!/^[a-f0-9]{64}$/.test(signature))return json(403,{error:'FORBIDDEN'});
 const body=await req.text();
 if(body.length>8192||!timingSafeEqual(Buffer.from(signature),Buffer.from(sign(secret,body))))return json(403,{error:'FORBIDDEN'});
 const client=createPagaditoSandboxClient(env);
 if(!client)return json(503,{error:'DISABLED'});
 const value=JSON.parse(body);
 if(!/^[a-f0-9]{64}$/.test(value.operation)||!['ANNUAL','INSTALLMENTS'].includes(value.mode)||!['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO','PLACE'].includes(value.plan))return json(400,{error:'INVALID_QUOTE'});
 const quote=commercialQuote(value.plan,value.mode);
 if(quote.amountCents!==value.amountCents||quote.amountCents<=0)return json(400,{error:'INVALID_QUOTE'});
 // This ledger exists exclusively in the already configured isolated database.
 await sql.unsafe('CREATE TABLE IF NOT EXISTS ad507.pagadito_certification_relay (operation text PRIMARY KEY, order_id uuid NOT NULL UNIQUE, state text NOT NULL, "authorization" text)');
 const id=crypto.randomUUID();
 const reserved=await sql.unsafe("INSERT INTO ad507.pagadito_certification_relay(operation,order_id,state) VALUES($1,$2::uuid,'SUBMITTING') ON CONFLICT DO NOTHING RETURNING order_id",[value.operation,id]);
 if(!reserved.length){
  const rows=await sql.unsafe('SELECT order_id::text,state,"authorization" FROM ad507.pagadito_certification_relay WHERE operation=$1',[value.operation]);
  const previous=rows[0];
  if(previous?.state==='VERIFIED')return json(200,{result:{orderId:previous.order_id,amountCents:quote.amountCents,currency:'USD',state:'VERIFIED',authorization:previous.authorization}});
  return json(409,{error:'CERTIFICATION_ALREADY_SUBMITTED'});
 }
 try{
  const verified=await executeSandboxFirstPayment(client,{id,provider:'PAGADITO',payment_environment:'test',status:'PENDING',amount_cents:quote.amountCents,currency:'USD',payment_plan:value.plan},{number:'4111111111111111',expirationDate:'01/2030',cvv:'123',cardHolderName:'Sandbox Test',firstName:'Sandbox',lastName:'Test',email:'sandbox@example.com',billingAddress:{city:'Panama',state:'Panama',zip:'',countryId:'591',line1:'Sandbox',phone:'50760000000'}},value.browserInfo);
  await sql.unsafe("UPDATE ad507.pagadito_certification_relay SET state='VERIFIED',\"authorization\"=$2 WHERE operation=$1",[value.operation,verified.authorization]);
  return json(200,{result:{orderId:id,amountCents:quote.amountCents,currency:'USD',authorization:verified.authorization,state:'VERIFIED'}});
 }catch{
  await sql.unsafe("UPDATE ad507.pagadito_certification_relay SET state='UNCERTAIN' WHERE operation=$1",[value.operation]);
  return json(502,{error:'CERTIFICATION_UNCONFIRMED'});
 }
}

/** Read-only reconciliation of a prior Sandbox attempt. Does not submit payment. */
export async function lookupPagaditoCertification(sql:Sql,env:Env,userId:string,addressId:string,mode:string){
 const secret=env.AD507_PAGADITO_RELAY_SECRET;
 if(!pagaditoRelayEnabled(env)||!secret)throw Error('CERTIFICATION_DISABLED');
 await createPagaditoSandboxOrderBridge(sql).quote(userId,addressId,mode);
 const operation=sign(secret,'certification:'+addressId+':'+mode);
 const body=JSON.stringify({operation});
 const response=await fetch(endpoint+'/status',{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-certification-signature':sign(secret,body)},body,signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('CERTIFICATION_STATUS_UNAVAILABLE');
 const result=await response.json();
 return {state:result.state,orderId:result.orderId,authorization:result.authorization};
}
