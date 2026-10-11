import {test,expect} from 'bun:test';
import {createHmac} from 'node:crypto';
import {paymentAmount,money,verifyYappyIPN,YAPPY_PAYMENTS_ENABLED} from '../payment-policy';
const config={environment:'test' as const,merchantId:'isolated-merchant',domain:'https://example.test',ipnUrl:'https://example.test/ipn',secret:Buffer.from('isolated-signing-key.metadata').toString('base64')};
function notification(status:string='E'){
  const q=new URLSearchParams({orderId:'abcdef12345678',status,domain:config.domain});
  q.set('hash',createHmac('sha256','isolated-signing-key').update(q.get('orderId')!+status+config.domain).digest('hex'));return q;
}
test('server prices use integer cents and unknown or inherited keys fail closed',()=>{
  expect(['RESIDENTIAL','BUSINESS_FREE','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO','RENEWAL','CORPORATE_PRO'].map(paymentAmount)).toEqual([1299,0,1999,3999,1299,3999]);
  for(const plan of ['PLACE','toString','__proto__','premium'])expect(()=>paymentAmount(plan)).toThrow('INVALID_PAYMENT_PLAN');
  expect(money(1999)).toBe('19.99');expect(()=>money(1.99)).toThrow();expect(YAPPY_PAYMENTS_ENABLED).toBe(false);
});
test('official IPN states authenticate the exact merchant domain and reject browser success',()=>{
  for(const [status,expected]of [['E','PAID'],['R','FAILED'],['X','FAILED'],['C','CANCELLED']])expect(verifyYappyIPN(notification(status),config).status).toBe(expected);
  for(const key of ['orderId','status','domain','hash']){const q=notification();q.set(key,'forged');expect(()=>verifyYappyIPN(q,config)).toThrow();}
  expect(()=>verifyYappyIPN(notification('REFUNDED'),config)).toThrow();
  const q=notification();q.append('Hash',q.get('hash')!);expect(()=>verifyYappyIPN(q,config)).toThrow();
  const duplicate=notification();duplicate.append('domain',config.domain);expect(()=>verifyYappyIPN(duplicate,config)).toThrow();
  expect(()=>verifyYappyIPN(notification(),{...config,domain:'https://other.test'})).toThrow();
});


test('provider adapter isolates test traffic and calculates its amount on the server',async()=>{
  const {createYappyProvider}=await import('../yappy-provider');const calls:any[]=[];
  const http=(async(url:any,init:any)=>{calls.push({url:String(url),body:JSON.parse(init.body),headers:init.headers});return Response.json(calls.length===1?{body:{token:'private-fixture',epochTime:123}}:{body:{transactionId:'fixture-transaction',token:'button-fixture',documentName:'fixture-document'}});}) as typeof fetch;
  const provider=createYappyProvider(config,http);
  expect((await provider.createOrder({providerOrderId:'abcdef12345678',amountCents:1999},'60000000')).transactionId).toBe('fixture-transaction');
  expect(calls.every(c=>c.url.startsWith('https://api-comecom-uat.yappycloud.com/'))).toBe(true);
  expect(calls[1].body.total).toBe('19.99');expect(calls[1].headers.authorization).toBe('private-fixture');
  await expect(provider.createOrder({providerOrderId:'x',amountCents:0},'60000000')).rejects.toThrow('INVALID_YAPPY_ORDER');
  const failing=createYappyProvider(config,(async()=>{throw Error('secret upstream error');}) as typeof fetch);
  await expect(failing.createOrder({providerOrderId:'x',amountCents:1999},'60000000')).rejects.toThrow('YAPPY_PROVIDER_UNCONFIRMED');
});


test('payment routes are disabled without touching auth/DB/provider; scripts parse',async()=>{
  const {handlePaymentRoutes}=await import('../payment-routes');const {paymentPage}=await import('../payment-ui');const {userPanelHtml}=await import('../user-panel');
  const context={enabled:false,auth:{currentUser:async()=>{throw Error('must not run');}},repository:null,provider:null};
  for(const path of ['/v1/payments/yappy/ipn','/v1/user/requests/11111111-1111-4111-8111-111111111111/payment'])expect((await handlePaymentRoutes(new Request('https://example.test'+path),context))?.status).toBe(503);
  for(const html of [paymentPage('11111111-1111-4111-8111-111111111111','test'),userPanelHtml])for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
});
