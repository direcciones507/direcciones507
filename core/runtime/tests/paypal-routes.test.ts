import {test,expect} from 'bun:test';
import {handlePayPalRoutes} from '../payment-routes';
import {paypalPaymentPage} from '../payment-ui';
import {paypalSandboxRuntimeEnabled} from '../paypal-provider';
const id='11111111-1111-4111-8111-111111111111',origin='https://direcciones.lat';
function fixture(){let calls:string[]=[];const c:any={enabled:true,origin,auth:{currentUser:async()=>({id,roles:['CLIENT']})},provider:{},repository:{quotePayPal:async()=>({amountCents:1999}),preparePayPal:async()=>({required:true,order:{id}}),initializePayPal:async()=>({orderId:id,providerOrderId:'SYNTHETIC123'}),readPayPal:async()=>({id,status:'PENDING',provider_reference:'SYNTHETIC123'}),confirmPayPal:async()=>{calls.push('capture');},receivePayPalWebhook:async()=>{calls.push('webhook');}}};return {c,calls};}
const request=(path:string,method='GET',body:any={},headers:any={})=>new Request(origin+path,{method,headers:{origin,'content-type':'application/json',...headers},...(method==='POST'?{body:JSON.stringify(body)}:{})});
test('Sandbox gate requires explicit isolation HTTPS and test; refuses live Yappy coexistence',()=>{
 const e={AD507_PAYPAL_SANDBOX_ENABLED:'true',AD507_PAYPAL_ENVIRONMENT:'test',AD507_PAYPAL_CLIENT_ID:'synthetic',AD507_PAYPAL_CLIENT_SECRET:'synthetic',AD507_PAYPAL_MERCHANT_ID:'synthetic',AD507_PAYPAL_WEBHOOK_ID:'synthetic',AD507_PAYPAL_ORIGIN:origin,AD507_PAYPAL_SANDBOX_ISOLATED:'true'};
 expect(paypalSandboxRuntimeEnabled(e)).toBe(true);
 for(const change of [{AD507_PAYPAL_SANDBOX_ISOLATED:'false'},{AD507_PAYPAL_ENVIRONMENT:'production'},{AD507_PAYPAL_ORIGIN:'http://direcciones.lat'},{AD507_YAPPY_PAYMENTS_ENABLED:'true'}])expect(paypalSandboxRuntimeEnabled({...e,...change})).toBe(false);
});
test('disabled routes never touch DB auth or provider; unrelated Yappy path remains separate',async()=>{
 const c:any={enabled:false};expect((await handlePayPalRoutes(request('/v1/payments/paypal/webhook','POST'),c))?.status).toBe(503);expect(await handlePayPalRoutes(request('/v1/payments/yappy/ipn'),c)).toBeNull();
});
test('create capture and query require own session exact origin and strict body; no browser proof',async()=>{
 const {c,calls}=fixture();const path='/v1/user/requests/'+id+'/paypal';
 expect((await handlePayPalRoutes(request(path,'POST',{}, {origin:'https://evil.test'}),c))?.status).toBe(403);
 expect((await handlePayPalRoutes(request(path,'POST',{amount:1}),c))?.status).toBe(400);
 const ok=await handlePayPalRoutes(request(path,'POST'),c);expect(ok?.status).toBe(200);expect((await ok!.json()).approvalUrl).toBe('https://www.sandbox.paypal.com/checkoutnow?token=SYNTHETIC123');
 expect((await handlePayPalRoutes(request('/v1/user/paypal/orders/'+id+'/capture'),c))?.status).toBe(405);expect(calls).toHaveLength(0);
 expect((await handlePayPalRoutes(request('/v1/user/paypal/orders/'+id+'/capture','POST'),c))?.status).toBe(200);expect(calls).toHaveLength(1);
 c.auth.currentUser=async()=>null;expect((await handlePayPalRoutes(request(path),c))?.status).toBe(401);
});
test('webhook verifies via repository without a user session and preserves retry on transient errors',async()=>{
 const {c,calls}=fixture();c.auth.currentUser=async()=>{throw Error('must not use session');};
 const path='/v1/payments/paypal/webhook';expect((await handlePayPalRoutes(request(path,'POST',{id:'synthetic'}),c))?.status).toBe(200);expect(calls).toEqual(['webhook']);
 c.repository.receivePayPalWebhook=async()=>{throw Error('INVALID_PAYMENT_SIGNATURE');};expect((await handlePayPalRoutes(request(path,'POST'),c))?.status).toBe(401);
 c.repository.receivePayPalWebhook=async()=>{throw Error('PAYPAL_PROVIDER_UNCONFIRMED');};expect((await handlePayPalRoutes(request(path,'POST'),c))?.status).toBe(502);
});
test('approval cancellation and denied capture do not fabricate paid status; scripts parse on both entry pages',async()=>{
 const {c}=fixture();c.repository.confirmPayPal=async()=>{throw Error('PAYMENT_CONFIRMATION_REQUIRED');};
 expect((await handlePayPalRoutes(request('/v1/user/paypal/orders/'+id+'/capture','POST'),c))?.status).toBe(409);
 const r=await handlePayPalRoutes(request('/v1/user/paypal/orders/'+id),c);expect((await r!.json()).payment.status).toBe('PENDING');
 for(const mode of ['address','order'] as const){const html=paypalPaymentPage(id,mode);for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))expect(()=>new Function(m[1])).not.toThrow();expect(html).not.toContain('api-m.paypal.com');expect(html).toContain('Residencial no está disponible');}
});
