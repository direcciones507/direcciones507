import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {handlePagaditoCertificationRelay} from './pagadito-certification-relay';
import {CERTIFICATION_AMOUNTS,createPagaditoSandboxOrderBridge} from './pagadito-sandbox-order-bridge';
import {PAYMENT_PRICES,acceptedOrderAmounts} from './payment-policy';
import {pagaditoSandboxPage} from './pagadito-sandbox-ui';

const secret='certification-test-only-'.repeat(3);
const env={AD507_PAGADITO_RELAY_SECRET:secret,AD507_PAGADITO_ISOLATED_DB:'true',AD507_PAGADITO_CERTIFICATION_ENABLED:'true',AD507_PAGADITO_ENVIRONMENT:'sandbox',AD507_PAGADITO_ENABLED:'true',AD507_PAGADITO_SANDBOX_UID:'test',AD507_PAGADITO_SANDBOX_WSK:'test'};
const endpoint='https://sandbox.invalid/v1/internal/pagadito/certification';
function request(value:unknown,path=''){
 const body=JSON.stringify(value);
 return new Request(endpoint+path,{method:'POST',headers:{'x-certification-signature':createHmac('sha256',secret).update(body).digest('hex')},body});
}
function ledger(){
 const rows=new Map<string,any>();
 const sql:any={begin:async(fn:any)=>fn(sql),unsafe:async(query:string,p:any[]=[])=>{
  if(query.startsWith('SELECT'))return rows.has(p[0])?[{...rows.get(p[0])}]:[];
  if(query.startsWith('INSERT INTO ad507.pagadito_certification_relay')){
   if(rows.has(p[0]))return [];
   rows.set(p[0],{order_id:p[1],state:'SUBMITTING'});return [{order_id:p[1]}];
  }
  if(query.includes('SET amount_cents'))Object.assign(rows.get(p[0]),{amount_cents:p[1],recorded_at:p[2]});
  if(query.includes("SET state='VERIFIED'"))Object.assign(rows.get(p[0]),{state:'VERIFIED',authorization:p[1]});
  if(query.includes('SET state=$2'))Object.assign(rows.get(p[0]),{state:p[1]});
  return [];
 }};return {sql,rows};
}
function quote(mode:string,amountCents:number){return {operation:createHmac('sha256',secret).update(mode).digest('hex'),plan:'BUSINESS_PREMIUM',mode,amountCents,browserInfo:{deviceFingerprintID:'123456',customerIp:'192.0.2.1'}};}

test('four certification amounts use independent persisted orders, retain results and never resubmit',async()=>{
 const {sql,rows}=ledger(),original=globalThis.fetch;let calls=0;
 globalThis.fetch=(async(url:any,options:any)=>{
  assert.equal(url,'https://sandbox-api.pagadito.com/v1/customer/');calls++;
  const data=JSON.parse(options.body);
  return Response.json({response_code:'PG200-00',customer_reply:{merchantTransactionId:data.transaction.merchantTransactionId,totalAmount:data.transaction.transactionDetails[0].amount,authorization:'TEST-'+calls}});
 }) as typeof fetch;
 try{
  for(const [mode,amount] of Object.entries(CERTIFICATION_AMOUNTS)){
   const value=quote(mode,amount);
   const first=await handlePagaditoCertificationRelay(request(value),sql,env);
   assert.equal(first?.status,200);const {result}=await first!.json();
   assert.equal(result.amountCents,amount);assert.ok(result.recordedAt);assert.equal(result.ern,result.orderId);
   const duplicate=await handlePagaditoCertificationRelay(request(value),sql,env);
   assert.equal((await duplicate!.json()).result.orderId,result.orderId);
   const status=await handlePagaditoCertificationRelay(request({operation:value.operation},'/status'),sql,env);
   const saved=await status!.json();assert.equal(saved.authorization,result.authorization);assert.equal(saved.amountCents,amount);assert.equal(saved.recordedAt,result.recordedAt);
  }
  assert.equal(calls,4);assert.equal(rows.size,4);assert.equal(new Set([...rows.values()].map(r=>r.order_id)).size,4);
 }finally{globalThis.fetch=original;}
});
test('tampered amounts and production environment fail before reservation or transport',async()=>{
 const {sql,rows}=ledger();
 assert.equal((await handlePagaditoCertificationRelay(request(quote('CERTIFICATION_1',2999)),sql,env))?.status,400);
 assert.equal((await handlePagaditoCertificationRelay(request(quote('CERTIFICATION_1',1844)),sql,{...env,AD507_PAGADITO_ENVIRONMENT:'production'}))?.status,404);
 assert.equal(rows.size,0);
});
test('uncertain certification attempt cannot be retried, even with reconciliation override',async()=>{
 const {sql,rows}=ledger(),value=quote('CERTIFICATION_1',1844);
 rows.set(value.operation,{order_id:crypto.randomUUID(),state:'UNCERTAIN'});
 assert.equal((await handlePagaditoCertificationRelay(request(value),sql,{...env,AD507_PAGADITO_RECONCILED_ORDER_ID:rows.get(value.operation).order_id}))?.status,409);
});
test('certification restricted to the authorized request; commercial prices and history preserved',async()=>{
 await assert.rejects(createPagaditoSandboxOrderBridge({} as any).quote(crypto.randomUUID(),crypto.randomUUID(),'CERTIFICATION_1'),/PAYMENT_NOT_FOUND/);
 assert.equal(PAYMENT_PRICES.RESIDENTIAL,1499);assert.equal(PAYMENT_PRICES.BUSINESS_PREMIUM,2999);assert.equal(PAYMENT_PRICES.BUSINESS_PREMIUM_PRO,4999);
 assert.deepEqual(acceptedOrderAmounts('BUSINESS_PREMIUM'),[2999,1999]);
 const html=pagaditoSandboxPage('bcd3213d-1b3a-4072-9570-e83c97480fa4');
 for(const [mode,amount] of Object.entries(CERTIFICATION_AMOUNTS)){assert.ok(html.includes('value="'+mode+'"'));assert.ok(html.includes((amount/100).toFixed(2)));}
 for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(script[1]);
});
