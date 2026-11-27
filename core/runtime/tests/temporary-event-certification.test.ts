import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleTemporaryEventRoutes} from '../temporary-event-routes';
import {handleAdminBillingGuard} from '../admin-billing-policy';
import {handlePagaditoSandboxPage} from '../pagadito-sandbox-page-route';
import {handlePagaditoSandboxQuote} from '../pagadito-sandbox-routes';
import {handleSandboxCheckout} from '../pagadito-sandbox-checkout-route';
import {createPagaditoCertificationRelay} from '../pagadito-certification-relay';
import {CERTIFICATION_REQUEST_ID,createPagaditoSandboxOrderBridge} from '../pagadito-sandbox-order-bridge';
import {paymentPage} from '../payment-ui';
import {temporaryCertificationLink,pagaditoTestButtonVisible} from '../temporary-event-certification';

const env={AD507_PAGADITO_TEST_BUTTON_VISIBLE:'true',AD507_PAGADITO_RELAY_ENABLED:'true',AD507_PAGADITO_RELAY_SECRET:'fixture-only-'.repeat(5),AD507_PAGADITO_QUOTE_PREVIEW_ENABLED:'true',AD507_PAGADITO_TEST_EMAIL:'reviewer@example.test'};
const user={id:'11111111-1111-4111-8111-111111111111',email:env.AD507_PAGADITO_TEST_EMAIL,roles:['CLIENT']};
const auth={currentUser:async()=>user} as any;
const pagePath='/panel/pagadito/sandbox/'+CERTIFICATION_REQUEST_ID;
const api='/v1/user/pagadito/sandbox/requests/'+CERTIFICATION_REQUEST_ID;
const request=(path:string,options?:RequestInit)=>new Request('https://direcciones.lat'+path,options);
function database(){
 const statements:string[]=[];
 const sql:any={begin:async(fn:any)=>fn(sql),unsafe:async(q:string,args:any[])=>{
  statements.push(q);assert.match(q,/^SELECT /); // Certification entry cannot mutate any record.
  if(q.includes('FROM ad507.addresses')){
   assert.equal(args[0],CERTIFICATION_REQUEST_ID);if(args.length>1)assert.equal(args[1],user.id);
   return [{id:CERTIFICATION_REQUEST_ID,source:'USER_REQUEST',address_type:'BUSINESS',status:'ACTIVE',request_data:{plan:'BUSINESS_PREMIUM',workflow:'PUBLISHED'}}];
  }
  if(q.includes('user_roles'))return [{exists:1}];
  return [];
 }};return {sql,statements};
}

test('Temporal after-save link opens Sandbox and four quotes even when the certification fixture is already ACTIVE',async()=>{
 const {sql,statements}=database();
 const response=await handleTemporaryEventRoutes(request('/panel/evento/nuevo'),{enabled:true,sql,auth,certificationEnv:env,payment:{} as any});
 assert.equal(response?.status,200);const html=await response!.text();
 assert.match(html,/<section id="event-after-save" hidden>/);
 assert.match(html,/<btn-yappy theme="blue"><\/btn-yappy>/);
 assert.ok(html.includes('id="event-pagadito-test" class="event-link" href="'+pagePath+'"'));
 assert.ok(html.indexOf('id="event-pagadito-test"')>html.indexOf('id="event-pay-container"'));
 const destination=await handlePagaditoSandboxPage(request(pagePath),{sql,auth,env});
 assert.equal(destination?.status,200);
 assert.match(await destination!.text(),/Solo certificación/);
 for(const [mode,amount] of [['CERTIFICATION_1',1844],['CERTIFICATION_2',2379],['CERTIFICATION_3',9991],['CERTIFICATION_4',10412]]){
  const quote=await handlePagaditoSandboxQuote(request(api+'/quote?mode='+mode),{enabled:true,auth,bridge:createPagaditoSandboxOrderBridge(sql)});
  assert.equal(quote?.status,200);assert.equal((await quote!.json()).quote.amountCents,amount);
 }
 assert.ok(statements.length>0);
});

test('certification fixture exception retains ownership, migration and ordinary request restrictions',async()=>{
 const row={source:'USER_REQUEST',address_type:'BUSINESS',status:'ACTIVE',request_data:{plan:'BUSINESS_PREMIUM',workflow:'PUBLISHED'}};
 const fixtureSql=(address:any)=>{const sql:any={begin:async(fn:any)=>fn(sql),unsafe:async(q:string)=>{assert.match(q,/^SELECT /);return q.includes('FROM ad507.addresses')?(address?[address]:[]):[];}};return sql;};
 await assert.rejects(createPagaditoSandboxOrderBridge(fixtureSql(null)).quote(user.id,CERTIFICATION_REQUEST_ID),/PAYMENT_NOT_FOUND/);
 await assert.rejects(createPagaditoSandboxOrderBridge(fixtureSql({...row,request_data:{...row.request_data,migration:true}})).quote(user.id,CERTIFICATION_REQUEST_ID),/INVALID_PAYMENT_REQUEST/);
 const ordinary='22222222-2222-4222-8222-222222222222';
 await assert.rejects(createPagaditoSandboxOrderBridge(fixtureSql(row)).quote(user.id,ordinary),/INVALID_PAYMENT_REQUEST/);
 await assert.rejects(createPagaditoSandboxOrderBridge(fixtureSql(row)).quote(user.id,ordinary,'CERTIFICATION_1'),/PAYMENT_NOT_FOUND/);
});

test('Pagadito button defaults to hidden on both flows and can be restored without touching Yappy',async()=>{
 const {sql,statements}=database();
 for(const flag of [undefined,'false']){
  const settings={...env,AD507_PAGADITO_TEST_BUTTON_VISIBLE:flag};
  assert.equal(pagaditoTestButtonVisible(settings),false);
  const response=await handleTemporaryEventRoutes(request('/panel/evento/nuevo'),{enabled:true,sql,auth,certificationEnv:settings,payment:{} as any});
  const html=await response!.text();assert.doesNotMatch(html,/event-pagadito-test/);assert.match(html,/<btn-yappy/);
  const payment=paymentPage(CERTIFICATION_REQUEST_ID,'production',pagaditoTestButtonVisible(settings));
  assert.doesNotMatch(payment,/Pagadito \(Prueba\)/);assert.match(payment,/<btn-yappy/);
 }
 assert.equal(statements.length,0);
 assert.equal(pagaditoTestButtonVisible(env),true);
 assert.match(paymentPage(CERTIFICATION_REQUEST_ID,'production',pagaditoTestButtonVisible(env)),/Pagadito \(Prueba\)/);
});

test('missing flags, wrong account/host or role never expose the certification link or query the database',async()=>{
 for(const [req,who,settings] of [
  [request('/panel/evento/nuevo'),user,{}],
  [request('/panel/evento/nuevo'),user,{...env,AD507_PAGADITO_QUOTE_PREVIEW_ENABLED:'false'}],
  [request('/panel/evento/nuevo'),user,{...env,AD507_PAGADITO_RELAY_ENABLED:'false'}],
  [request('/panel/evento/nuevo'),user,{...env,AD507_PAGADITO_RELAY_SECRET:'short'}],
  [request('/panel/evento/nuevo'),{...user,email:'other@example.test'},env],
  [request('/panel/evento/nuevo'),{...user,roles:[]},env],
  [new Request('https://other.example/panel/evento/nuevo'),user,env],
 ] as const){assert.deepEqual(await temporaryCertificationLink(req,who,settings,{} as any),{});}
});

test('missing/unpayable certification request is reported instead of exposing a broken link',async()=>{
 const sql={begin:async(fn:any)=>fn({unsafe:async()=>[]})} as any;
 assert.deepEqual(await temporaryCertificationLink(request('/panel/evento/nuevo'),user,env,sql),{unavailable:true});
 assert.equal((await handlePagaditoSandboxPage(request(pagePath),{sql,auth,env}))?.status,404);
});

test('ADMIN certification exception is limited to authorized test purchase; Yappy and other billing remain exempt',async()=>{
 const {sql}=database(),admin={...user,roles:['ADMIN']},adminAuth={currentUser:async()=>admin};
 for(const path of [pagePath,api+'/quote',api+'/status'])assert.equal(await handleAdminBillingGuard(request(path),sql,adminAuth,env),null);
 assert.equal(await handleAdminBillingGuard(request(api+'/checkout',{method:'POST'}),sql,adminAuth,env),null);
 for(const path of ['/panel/payments/'+CERTIFICATION_REQUEST_ID,'/panel/pagadito/sandbox/22222222-2222-4222-8222-222222222222'])assert.equal((await handleAdminBillingGuard(request(path),sql,adminAuth,env))?.status,302);
 assert.equal((await handleAdminBillingGuard(request(pagePath),sql,adminAuth,{}))?.status,302);
 assert.equal((await handleAdminBillingGuard(request(pagePath),sql,{currentUser:async()=>({...admin,email:'other@example.test'})},env))?.status,302);
 const form=await handleTemporaryEventRoutes(request('/panel/evento/nuevo'),{enabled:true,sql,auth:adminAuth,certificationEnv:env});
 const html=await form!.text();assert.match(html,/event-pagadito-test/);assert.match(html,/Publicar gratuitamente/);assert.doesNotMatch(html,/<btn-yappy/);
});

test('authorized checkout reaches only isolated certification relay; real cards and cross-origin requests are rejected',async()=>{
 const {sql}=database(),original=globalThis.fetch;let transports=0;
 globalThis.fetch=(async(url:any,options:any)=>{
  const sentStatus=JSON.parse(options.body);
  if(url==='https://direcciones507-pagadito-sandbox.up.railway.app/v1/internal/pagadito/certification/status'){assert.match(sentStatus.operation,/^[a-f0-9]{64}$/);assert.match(sentStatus.scope,/^[a-f0-9]{64}$/);return Response.json({state:'NOT_FOUND',repeatSupported:true});}
  transports++;assert.equal(url,'https://direcciones507-pagadito-sandbox.up.railway.app/v1/internal/pagadito/certification');
  const sent=JSON.parse(options.body);assert.equal(sent.mode,'CERTIFICATION_1');assert.equal(sent.amountCents,1844);assert.equal(sent.card,undefined);
  return Response.json({result:{orderId:crypto.randomUUID(),state:'VERIFIED',amountCents:1844,currency:'USD',authorization:'FIXTURE_ONLY'}});
 }) as typeof fetch;
 const context={enabled:true,auth,checkout:createPagaditoCertificationRelay(sql,env),origin:'https://direcciones.lat',testCards:['4111111111111111'],customerIp:'192.0.2.1'};
 const input={mode:'CERTIFICATION_1',key:crypto.randomUUID(),legalAcceptance:{accepted:true},deviceFingerprintID:'123456',card:{number:'4111111111111111',expirationDate:'01/2030',cvv:'123'}};
 const post=(value:unknown,origin='https://direcciones.lat')=>request(api+'/checkout',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(value)});
 try{
  const result=await handleSandboxCheckout(post(input),context);assert.equal(result?.status,200);assert.equal((await result!.json()).result.state,'VERIFIED');
  assert.equal((await handleSandboxCheckout(post({...input,card:{...input.card,number:'5555555555554444'}}),context))?.status,400);
  assert.equal((await handleSandboxCheckout(post(input,'https://evil.example'),context))?.status,403);
  assert.equal(transports,1);
 }finally{globalThis.fetch=original;}
});


test('Outlook certification reviewer can access fixed Sandbox fixture without commercial ownership',async()=>{
 const statements:string[]=[];
 const sql:any={begin:async(fn:any)=>fn(sql),unsafe:async(q:string,args:any[])=>{
  statements.push(q);assert.match(q,/^SELECT /);
  if(q.includes('FROM ad507.addresses')){
   if(q.includes('address_ownership'))return []; // Fixture belongs to prior Gmail account.
   assert.deepEqual(args,[CERTIFICATION_REQUEST_ID]);
   return [{id:CERTIFICATION_REQUEST_ID,source:'USER_REQUEST',address_type:'BUSINESS',status:'ACTIVE',request_data:{plan:'BUSINESS_PREMIUM',workflow:'PUBLISHED'}}];
  }
  return [];
 }};
 const reviewer={...user,email:'jacinto3180@outlook.cl'};
 const settings={...env,AD507_PAGADITO_TEST_EMAIL:reviewer.email};
 assert.equal((await temporaryCertificationLink(request('/panel/evento/nuevo'),reviewer,settings,sql)).href,pagePath);
 const page=await handlePagaditoSandboxPage(request(pagePath),{sql,auth:{currentUser:async()=>reviewer} as any,env:settings});
 assert.equal(page?.status,200);
 const quote=await handlePagaditoSandboxQuote(request(api+'/quote?mode=CERTIFICATION_1'),{enabled:true,auth:{currentUser:async()=>reviewer} as any,bridge:createPagaditoSandboxOrderBridge(sql),certificationEmail:reviewer.email,certificationRelayEnabled:true});
 assert.equal(quote?.status,200);
 assert.equal((await quote!.json()).quote.amountCents,1844);
 await assert.rejects(createPagaditoSandboxOrderBridge(sql).quote(reviewer.id,CERTIFICATION_REQUEST_ID),/PAYMENT_NOT_FOUND/);
 await assert.rejects(createPagaditoSandboxOrderBridge(sql).quote(reviewer.id,'22222222-2222-4222-8222-222222222222','ANNUAL',true),/PAYMENT_NOT_FOUND/);
 assert.ok(statements.every(q=>q.startsWith('SELECT ')));
});
