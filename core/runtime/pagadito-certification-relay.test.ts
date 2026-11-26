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
  if(query.startsWith('SELECT pg_advisory'))return [];
  if(query.startsWith('SELECT operation FROM'))return [...rows.entries()].filter(([op,row])=>(query.includes('operation=$1 OR')?(op===p[0]||row.attempt_scope===p[0])&&op!==p[1]:row.attempt_scope===p[0])&&!['VERIFIED','REJECTED'].includes(row.state)).map(([operation])=>({operation}));
  if(query.startsWith('SELECT operation,order_id'))return [...rows.entries()].filter(([op,row])=>op===p[0]||(p[1]&&(op===p[1]||row.attempt_scope===p[1])&&!['VERIFIED','REJECTED'].includes(row.state))).sort(([a],[b])=>Number(a===p[0])-Number(b===p[0])).slice(0,1).map(([operation,row])=>({operation,...row}));
  if(query.startsWith('SELECT'))return rows.has(p[0])?[{...rows.get(p[0])}]:[];
  if(query.startsWith('INSERT INTO ad507.pagadito_certification_relay')){
   if(rows.has(p[0]))return [];
   rows.set(p[0],{order_id:p[1],state:'SUBMITTING',attempt_scope:p[2],amount_cents:p[3]});return [{order_id:p[1]}];
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

test('new certification attempts keep historical evidence and deduplicate by attempt',async()=>{
 const {sql,rows}=ledger(),original=globalThis.fetch;let calls=0;
 globalThis.fetch=(async(url:any,options:any)=>{
  calls++;
  const data=JSON.parse(options.body);
  return Response.json({response_code:'PG200-00',customer_reply:{merchantTransactionId:data.transaction.merchantTransactionId,totalAmount:data.transaction.transactionDetails[0].amount,authorization:'TEST-'+calls}});
 }) as typeof fetch;
 try{
  for(const [mode,amount] of Object.entries(CERTIFICATION_AMOUNTS)){
   const legacy=quote(mode,amount);
   const historical={order_id:crypto.randomUUID(),state:'VERIFIED',authorization:'HISTORICAL',amount_cents:amount,recorded_at:'2026-11-18T12:00:00Z'};
   rows.set(legacy.operation,{...historical});
   const attempt=()=>({...legacy,scope:legacy.operation,operation:createHmac('sha256',secret).update(crypto.randomUUID()).digest('hex')});
   const a=attempt(),b=attempt();
   const first=await handlePagaditoCertificationRelay(request(a),sql,env);
   assert.equal(first?.status,200);
   const {result}=await first!.json();
   const duplicate=await handlePagaditoCertificationRelay(request(a),sql,env);
   assert.equal((await duplicate!.json()).result.orderId,result.orderId);
   const second=await handlePagaditoCertificationRelay(request(b),sql,env);
   assert.equal(second?.status,200);
   assert.notEqual((await second!.json()).result.orderId,result.orderId);
   assert.deepEqual(rows.get(legacy.operation),historical);
   const status=await handlePagaditoCertificationRelay(request({operation:b.operation,scope:b.scope},'/status'),sql,env);
   assert.equal((await status!.json()).state,'VERIFIED');
  }
  assert.equal(calls,8);assert.equal(rows.size,12);
 }finally{globalThis.fetch=original;}
});
test('an uncertain legacy or scoped attempt blocks a fresh reference',async()=>{
 const {sql,rows}=ledger(),legacy=quote('CERTIFICATION_1',1844);
 const a={...legacy,scope:legacy.operation,operation:'a'.repeat(64)},b={...a,operation:'b'.repeat(64)};
 const historical={order_id:crypto.randomUUID(),state:'UNCERTAIN'};
 rows.set(legacy.operation,historical);
 assert.equal((await handlePagaditoCertificationRelay(request(a),sql,env))?.status,409);
 assert.equal(rows.size,1);
 const status=await handlePagaditoCertificationRelay(request({operation:a.operation,scope:a.scope},'/status'),sql,env);
 assert.equal((await status!.json()).blockedByPrior,true);
 rows.set(legacy.operation,{...historical,state:'VERIFIED'});
 rows.set(a.operation,{order_id:crypto.randomUUID(),state:'SUBMITTING',attempt_scope:a.scope});
 assert.equal((await handlePagaditoCertificationRelay(request(b),sql,env))?.status,409);
 assert.equal(rows.size,2);
});

test('Sandbox confirmation replaces form only on verified result and repeat requires explicit action',async()=>{
 const html=pagaditoSandboxPage('bcd3213d-1b3a-4072-9570-e83c97480fa4');
 assert.match(html,/id="confirmation" hidden/);
 assert.match(html,/¡Pago Sandbox exitoso!/);
 const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)![1];
 const ids=['mode','form','pay','status','quote','entry','confirmation','confirmationTitle','again','confirmedAmount','confirmedAuthorization','confirmedDate','confirmedErn','accept','expiry'];
 const elements:any=Object.fromEntries(ids.map(id=>[id,{hidden:id==='confirmation',disabled:false,value:id==='mode'?'CERTIFICATION_1':id==='expiry'?'01/2030':'',textContent:'',dataset:{},checked:true,focus(){}}]));
 const map=new Map<string,string>(),posted:string[]=[];
 const verified={state:'VERIFIED',amountCents:1844,authorization:'TEST-AUTH',ern:'test-ern',recordedAt:'2026-11-25T23:13:39Z'};
 let state:any={state:'NOT_FOUND',repeatSupported:true},checkoutResponse:any=verified;
 const document={getElementById:(id:string)=>elements[id],scripts:[{src:'https://h.online-metrix.net/fp/check.js?id=123',addEventListener(event:string,fn:()=>void){if(event==='load')queueMicrotask(fn);}}]};
 const storage={getItem:(k:string)=>map.get(k),setItem:(k:string,v:string)=>map.set(k,v)};
 const transport=async(url:string,options:any)=>{
  if(url.includes('/quote?'))return Response.json({quote:{amountCents:1844,available:true}});
  if(url.includes('/status?'))return Response.json(state);
  if(url.endsWith('/checkout')){posted.push(JSON.parse(options.body).key);return Response.json({result:checkoutResponse});}
  throw Error('unexpected request');
 };
 const run=new Function('document','sessionStorage','fetch','cybs_dfprofiler',script);
 run(document,storage,transport,()=>123);
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(elements.pay.disabled,false);assert.equal(elements.confirmation.hidden,true);
 await elements.form.onsubmit({preventDefault(){}});
 assert.equal(elements.entry.hidden,true);assert.equal(elements.confirmation.hidden,false);
 assert.equal(elements.confirmedAmount.textContent,'USD 18.44');assert.equal(elements.confirmedAuthorization.textContent,'TEST-AUTH');assert.equal(elements.confirmedErn.textContent,'test-ern');
 assert.equal(elements.again.disabled,false);assert.equal(posted.length,1);
 elements.again.onclick();
 assert.equal(elements.entry.hidden,false);assert.equal(elements.confirmation.hidden,true);assert.equal(elements.accept.checked,false);assert.equal(posted.length,1);
 elements.accept.checked=true;
 await elements.form.onsubmit({preventDefault(){}});
 assert.equal(posted.length,2);assert.notEqual(posted[0],posted[1]);
 elements.again.onclick();
 state={state:'UNCERTAIN',repeatSupported:true,amountCents:1844};checkoutResponse={state:'UNCERTAIN'};
 await elements.form.onsubmit({preventDefault(){}});
 assert.equal(elements.confirmation.hidden,true);assert.equal(elements.pay.disabled,true);assert.equal(elements.again.disabled,true);
});
