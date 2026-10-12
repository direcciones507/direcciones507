import {test,expect} from 'bun:test';
import {createPayPalSandboxProvider,paypalSandboxConfiguration,PAYPAL_PAYMENTS_ENABLED} from '../paypal-provider';
const config={environment:'test' as const,clientId:'fixture-client',clientSecret:'fixture-secret',merchantId:'FIXTUREMERCHANT',webhookId:'fixture-webhook'};
const intent={id:'11111111-1111-4111-8111-111111111111',amountCents:1999,currency:'USD' as const,provider_reference:null as string|null};
const order=(status='COMPLETED',captureStatus='COMPLETED')=>({id:'FIXTUREORDER123',status,purchase_units:[{custom_id:intent.id,payee:{merchant_id:config.merchantId},amount:{currency_code:'USD',value:'19.99'},payments:{captures:[{id:'FIXTURECAPTURE123',status:captureStatus,amount:{currency_code:'USD',value:'19.99'},final_capture:true}]}}]});
test('sandbox configuration stays disabled by default; production config refused',()=>{
 expect(PAYPAL_PAYMENTS_ENABLED).toBe(false);expect(paypalSandboxConfiguration({})).toBeNull();
 const env={AD507_PAYPAL_SANDBOX_ENABLED:'true',AD507_PAYPAL_ENVIRONMENT:'test',AD507_PAYPAL_CLIENT_ID:config.clientId,AD507_PAYPAL_CLIENT_SECRET:config.clientSecret,AD507_PAYPAL_MERCHANT_ID:config.merchantId,AD507_PAYPAL_WEBHOOK_ID:config.webhookId};
 expect(paypalSandboxConfiguration(env)?.environment).toBe('test');expect(paypalSandboxConfiguration({...env,AD507_PAYPAL_ENVIRONMENT:'production'})).toBeNull();
 expect(()=>createPayPalSandboxProvider({...config,environment:'production'} as any)).toThrow('INVALID_PAYPAL_CONFIGURATION');
});
test('server create/capture verifies identity, merchant, USD total; durable idempotency keys',async()=>{
 const calls:any[]=[];let captured=false;
 const http=(async(url:any,init:any)=>{calls.push({url:String(url),...init});if(String(url).endsWith('/token'))return Response.json({access_token:'fixture-token'});
 if(String(url).endsWith('/capture')){captured=true;return Response.json(order());}
 if(String(url).endsWith('/v2/checkout/orders'))return Response.json(order('CREATED'));
 return Response.json(order(captured?'COMPLETED':'APPROVED'));}) as typeof fetch;
 const provider=createPayPalSandboxProvider(config,http);
 expect((await provider.createOrder(intent)).providerOrderId).toBe('FIXTUREORDER123');
 expect((await provider.confirmedCapture({...intent,provider_reference:'FIXTUREORDER123'},true)).status).toBe('PAID');
 await provider.confirmedCapture({...intent,provider_reference:'FIXTUREORDER123'},true);
 expect(calls.filter(c=>c.url.endsWith('/capture'))).toHaveLength(1);
 expect(calls.every(c=>c.url.startsWith('https://api-m.sandbox.paypal.com/'))).toBe(true);
 const create=calls.find(c=>c.url.endsWith('/v2/checkout/orders'));expect(JSON.parse(create.body).purchase_units[0].amount.value).toBe('19.99');
 expect(create.headers['PayPal-Request-Id']).toBe('C'+intent.id.replaceAll('-',''));
 expect(calls.find(c=>c.url.endsWith('/capture')).headers['PayPal-Request-Id']).toBe('P'+intent.id.replaceAll('-',''));
});
test('approval, forged browser success, wrong totals/currency/merchant and timeouts never confirm',async()=>{
 for(const change of [(o:any)=>{o.status='APPROVED'},(o:any)=>{o.purchase_units[0].amount.value='0.01'},(o:any)=>{o.purchase_units[0].amount.currency_code='COP'},(o:any)=>{o.purchase_units[0].payee.merchant_id='OTHER'},(o:any)=>{o.purchase_units[0].payments.captures[0].amount.value='1.99'},(o:any)=>{o.purchase_units[0].custom_id='OTHER'},(o:any)=>{o.purchase_units[0].payments.captures[0].status='PENDING'}]){
  const http=(async(url:any)=>{if(String(url).endsWith('/token'))return Response.json({access_token:'fixture'});const o=order();change(o);return Response.json(o);}) as typeof fetch;
  await expect(createPayPalSandboxProvider(config,http).confirmedCapture({...intent,provider_reference:'FIXTUREORDER123'})).rejects.toThrow();
 }
 await expect(createPayPalSandboxProvider(config,(async()=>{throw Error('private-secret');}) as typeof fetch).createOrder(intent)).rejects.toThrow('PAYPAL_PROVIDER_UNCONFIRMED');
});
test('signed webhook verification posts to fixed PayPal host; unverified events rejected',async()=>{
 let valid=false;const requests:any[]=[];
 const http=(async(url:any,init:any)=>{if(String(url).endsWith('/token'))return Response.json({access_token:'fixture'});requests.push({url:String(url),body:JSON.parse(init.body)});return Response.json({verification_status:valid?'SUCCESS':'FAILURE'});}) as typeof fetch;
 const provider=createPayPalSandboxProvider(config,http),headers=new Headers();
 for(const name of ['auth-algo','cert-url','transmission-id','transmission-sig','transmission-time'])headers.set('paypal-'+name,'fixture-'+name);
 const event={id:'FIXTUREEVENT',event_type:'PAYMENT.CAPTURE.COMPLETED'};
 await expect(provider.verifyWebhook(headers,event)).rejects.toThrow('INVALID_PAYMENT_SIGNATURE');valid=true;
 expect((await provider.verifyWebhook(headers,event)).eventId).toBe(event.id);
 expect(requests[0].url).toBe('https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature');
 expect(requests[0].body.webhook_id).toBe(config.webhookId);
 await expect(provider.verifyWebhook(new Headers(),event)).rejects.toThrow('INVALID_PAYMENT_SIGNATURE');
});
test('full refund is a server-read status, not a browser cancellation',async()=>{
 const http=(async(url:any)=>Response.json(String(url).endsWith('/token')?{access_token:'fixture'}:order('COMPLETED','REFUNDED'))) as typeof fetch;
 expect((await createPayPalSandboxProvider(config,http).confirmedCapture({...intent,provider_reference:'FIXTUREORDER123'})).status).toBe('REFUNDED');
});
