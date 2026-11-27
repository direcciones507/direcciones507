import {test,expect} from 'bun:test';
import {createHmac} from 'node:crypto';
import {handlePaymentRoutes} from '../payment-routes';
import {handlePagaditoCertificationRelay} from '../pagadito-certification-relay';
import {reconcilePagaditoPayment} from '../pagadito-order-reconciliation';
import {LEGAL_VERSION} from '../legal';

test('payment API rejects browser-supplied prices and throttles authenticated requests without sending payments',async()=>{
 const userId=crypto.randomUUID(),addressId=crypto.randomUUID();
 let calls=0;
 const repo={quote:async(owner:string,id:string)=>{expect(owner).toBe(userId);expect(id).toBe(addressId);calls++;return {amountCents:2999};}};
 const provider=new Proxy({}, {get(){throw Error('provider must not be called');}});
 const ctx={enabled:true,auth:{currentUser:async()=>({id:userId,roles:['CLIENT']})} as any,repository:repo as any,provider:provider as any};
 const url='https://direcciones.lat/v1/user/requests/'+addressId+'/payment';
 const response=await handlePaymentRoutes(new Request(url,{method:'POST',headers:{origin:'https://direcciones.lat','sec-fetch-site':'same-origin','content-type':'application/json'},body:JSON.stringify({alias:'60000000',amountCents:1,legalAcceptance:{accepted:true,version:LEGAL_VERSION}})}),ctx);
 expect(response?.status).toBe(400);expect(calls).toBe(0);
 for(let i=0;i<19;i++)expect((await handlePaymentRoutes(new Request(url),ctx))?.status).toBe(200);
 expect((await handlePaymentRoutes(new Request(url),ctx))?.status).toBe(429);
 expect(calls).toBe(19);
});
test('payment API binds order access to authenticated owner and hides foreign order',async()=>{
 const userId=crypto.randomUUID(),foreign=crypto.randomUUID();let reads=0;
 const repository={read:async(owner:string,id:string)=>{expect(owner).toBe(userId);expect(id).toBe(foreign);reads++;throw Error('PAYMENT_NOT_FOUND');}};
 const res=await handlePaymentRoutes(new Request('https://direcciones.lat/v1/user/payments/'+foreign),{enabled:true,auth:{currentUser:async()=>({id:userId,roles:['CLIENT']})} as any,repository:repository as any,provider:{} as any});
 expect(res?.status).toBe(404);expect(reads).toBe(1);expect(await res!.json()).toEqual({ok:false,error:'PAYMENT_NOT_FOUND'});
});
test('certification relay rejects oversized, malformed and unauthenticated bodies before SQL or provider calls',async()=>{
 const secret='fixture'.repeat(8),env={AD507_PAGADITO_RELAY_SECRET:secret,AD507_PAGADITO_ISOLATED_DB:'true',AD507_PAGADITO_CERTIFICATION_ENABLED:'true',AD507_PAGADITO_ENVIRONMENT:'sandbox'};
 const sql=new Proxy({}, {get(){throw Error('database must not be called');}});
 const url='https://example.test/v1/internal/pagadito/certification/status';
 const request=(body:string,valid=true)=>new Request(url,{method:'POST',headers:{'x-certification-signature':valid?createHmac('sha256',secret).update(body).digest('hex'):'0'.repeat(64)},body});
 for(const [body,valid,status] of [['x'.repeat(8193),true,413],['{',true,400],['null',true,400],['[]',true,400],['{}',false,403]] as const){
  const res=await handlePagaditoCertificationRelay(request(body,valid),sql as any,env);
  expect(res?.status).toBe(status);
 }
});
test('Pagadito reconciliation rejects altered amount, order, currency and environment; replay is no-op',()=>{
 const id=crypto.randomUUID(),order={id,ownerId:crypto.randomUUID(),provider:'PAGADITO',environment:'sandbox',amountCents:2999,currency:'USD',status:'PENDING'} as const;
 const proof={merchantTransactionId:id,environment:'sandbox',amountCents:2999,currency:'USD',authorization:'fixture',approved:true} as const;
 expect(reconcilePagaditoPayment(order,proof).action).toBe('MARK_PAID');
 for(const altered of [{amountCents:1},{merchantTransactionId:crypto.randomUUID()},{currency:'EUR'},{environment:'production'}])expect(reconcilePagaditoPayment(order,{...proof,...altered} as any).action).toBe('REJECT');
 expect(reconcilePagaditoPayment(order,{...proof,approved:false}).action).toBe('PENDING');
 expect(reconcilePagaditoPayment({...order,status:'PAID'},proof).action).toBe('NOOP');
});
