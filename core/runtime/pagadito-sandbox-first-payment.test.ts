import {test} from 'node:test';
import assert from 'node:assert/strict';
import {executeSandboxFirstPayment,type SandboxCard} from './pagadito-sandbox-first-payment';
import type {createPagaditoRestClient} from './pagadito-rest-client';

const id='12345678-1234-1234-1234-123456789abc';
const order={id,provider:'PAGADITO',payment_environment:'test',status:'PENDING',amount_cents:2999,currency:'USD',payment_plan:'BUSINESS_PREMIUM'};
const card:SandboxCard={number:'TEST_ONLY',expirationDate:'12/2030',cvv:'000',cardHolderName:'Test User',firstName:'Test',lastName:'User',email:'test@example.invalid',billingAddress:{city:'Test',state:'Test',zip:'',countryId:'591',line1:'Test',phone:'00000000'}};
const browser={deviceFingerprintID:'test-fingerprint',customerIp:'192.0.2.1'};
function mock(amount='29.99',environment:'sandbox'|'production'='sandbox'){
 const calls:unknown[]=[];
 const client={environment,createCustomer:async(payload:unknown)=>{
 calls.push(payload);
 return {response_code:'PG200-00',customer_reply:{merchantTransactionId:id,authorization:'TEST-AUTH',totalAmount:amount}};
 }} as ReturnType<typeof createPagaditoRestClient>;
 return {client,calls};
}
test('first sandbox payment uses server-owned order amount',async()=>{
 const {client,calls}=mock();
 const result=await executeSandboxFirstPayment(client,order,card,browser);
 assert.equal(result.amountCents,2999);
 assert.deepEqual(calls,[{card,transaction:{merchantTransactionId:id,currencyId:'USD',transactionDetails:[{quantity:'1',description:'Direccion digital - BUSINESS_PREMIUM',amount:'29.99'}]},browserInfo:browser}]);
});
test('reject mismatched provider amount',async()=>{
 const {client}=mock('1.00');
 await assert.rejects(executeSandboxFirstPayment(client,order,card,browser),/PAGADITO_RESPONSE_ORDER_MISMATCH/);
});
test('production client cannot send a sandbox charge',async()=>{
 const {client,calls}=mock('29.99','production');
 await assert.rejects(executeSandboxFirstPayment(client,order,card,browser),/PAGADITO_SANDBOX_REQUIRED/);
 assert.equal(calls.length,0);
});
