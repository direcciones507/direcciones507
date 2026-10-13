import {money} from './payment-policy';
// No runtime wiring or production host. This release cannot enable real payments.
export const PAYPAL_PAYMENTS_ENABLED=false;
export type PayPalSandboxConfiguration={environment:'test';clientId:string;clientSecret:string;merchantId:string;webhookId:string};
export function paypalSandboxConfiguration(env:Record<string,string|undefined>):PayPalSandboxConfiguration|null {
 if(env.AD507_PAYPAL_SANDBOX_ENABLED!=='true'||env.AD507_PAYPAL_ENVIRONMENT!=='test')return null;
 const c={environment:'test' as const,clientId:env.AD507_PAYPAL_CLIENT_ID??'',clientSecret:env.AD507_PAYPAL_CLIENT_SECRET??'',merchantId:env.AD507_PAYPAL_MERCHANT_ID??'',webhookId:env.AD507_PAYPAL_WEBHOOK_ID??''};
 return Object.values(c).every(value=>typeof value==='string'&&value.trim()&&value.length<=4096)?c:null;
}
export type PayPalIntent={id:string;amountCents:number;currency:'USD';provider_reference:string|null};
const idPattern=/^[A-Z0-9]{1,36}$/;
export function createPayPalSandboxProvider(config:PayPalSandboxConfiguration,http:typeof fetch=fetch){
 if(config.environment!=='test'||![config.clientId,config.clientSecret,config.merchantId,config.webhookId].every(value=>typeof value==='string'&&value.trim()))throw Error('INVALID_PAYPAL_CONFIGURATION');
 const base='https://api-m.sandbox.paypal.com';
 async function responseJson(response:Response){
  if(!response.ok)throw Error('PAYPAL_PROVIDER_UNCONFIRMED');
  const reader=response.body?.getReader();if(!reader)throw Error('PAYPAL_PROVIDER_UNCONFIRMED');
  const chunks:Uint8Array[]=[];let length=0;try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>256000){await reader.cancel();throw Error('PAYPAL_PROVIDER_UNCONFIRMED');}chunks.push(value);}}finally{reader.releaseLock();}
  const text=Buffer.concat(chunks).toString('utf8');
  try{return JSON.parse(text);}catch{throw Error('PAYPAL_PROVIDER_UNCONFIRMED');}
 }
 async function call(path:string,method='GET',body?:unknown,key?:string){
  try{
   const token=await responseJson(await http(base+'/v1/oauth2/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{authorization:'Basic '+Buffer.from(config.clientId+':'+config.clientSecret).toString('base64'),'content-type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'}));
   if(typeof token.access_token!=='string'||!token.access_token)throw Error();
   return await responseJson(await http(base+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{authorization:'Bearer '+token.access_token,'content-type':'application/json',Prefer:'return=representation',...(key?{'PayPal-Request-Id':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}));
  }catch{throw Error('PAYPAL_PROVIDER_UNCONFIRMED');}
 }
 const validateIntent=(intent:PayPalIntent)=>{
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(intent.id)||!Number.isSafeInteger(intent.amountCents)||intent.amountCents<=0||intent.currency!=='USD')throw Error('INVALID_PAYMENT_REQUEST');
 };
 const validateOrder=(order:any,intent:PayPalIntent)=>{
  validateIntent(intent);
  const u=order.purchase_units?.[0];
  if(!idPattern.test(order.id)||order.purchase_units?.length!==1||u.custom_id!==intent.id||u.payee?.merchant_id!==config.merchantId||u.amount?.currency_code!=='USD'||u.amount?.value!==money(intent.amountCents))throw Error('PAYPAL_ORDER_MISMATCH');
  if(intent.provider_reference&&order.id!==intent.provider_reference)throw Error('PAYPAL_ORDER_MISMATCH');
  return order;
 };
 return {
  async createOrder(intent:PayPalIntent){
   validateIntent(intent);if(intent.provider_reference)throw Error('PAYMENT_ALREADY_INITIALIZED');
   const key='C'+intent.id.replaceAll('-','');
   const order=await call('/v2/checkout/orders','POST',{intent:'CAPTURE',purchase_units:[{custom_id:intent.id,payee:{merchant_id:config.merchantId},amount:{currency_code:'USD',value:money(intent.amountCents)}}]},key);
   validateOrder(order,intent);if(!['CREATED','APPROVED','PAYER_ACTION_REQUIRED'].includes(order.status))throw Error('PAYPAL_PROVIDER_UNCONFIRMED');
   return {providerOrderId:order.id};
  },
  async confirmedCapture(intent:PayPalIntent,capture=false){
   validateIntent(intent);if(!intent.provider_reference||!idPattern.test(intent.provider_reference))throw Error('PAYMENT_PROVIDER_REFERENCE_REQUIRED');
   const path='/v2/checkout/orders/'+intent.provider_reference;
   const before=validateOrder(await call(path),intent);
   if(capture&&before.status==='APPROVED')await call(path+'/capture','POST',{},'P'+intent.id.replaceAll('-',''));
   // Always re-read from PayPal. Browser success and order approval are not proof of payment.
   const order=validateOrder(await call(path),intent),captures=order.purchase_units[0].payments?.captures;
   if(order.status!=='COMPLETED'||!Array.isArray(captures)||captures.length!==1)throw Error('PAYMENT_CONFIRMATION_REQUIRED');
   const proof=captures[0];
   if(!idPattern.test(proof.id)||proof.amount?.currency_code!=='USD'||proof.amount?.value!==money(intent.amountCents)||proof.final_capture!==true)throw Error('PAYPAL_CAPTURE_MISMATCH');
   if(!['COMPLETED','REFUNDED'].includes(proof.status))throw Error('PAYMENT_CONFIRMATION_REQUIRED');
   return {status:proof.status==='REFUNDED'?'REFUNDED' as const:'PAID' as const,captureId:proof.id};
  },
  async verifyWebhook(headers:Headers,event:unknown){
   if(!event||typeof event!=='object'||typeof (event as any).id!=='string'||JSON.stringify(event).length>128000)throw Error('INVALID_PAYMENT_NOTIFICATION');
   const fields:Record<string,string>={};
   for(const name of ['auth-algo','cert-url','transmission-id','transmission-sig','transmission-time']){
    const value=headers.get('paypal-'+name);if(!value||value.length>4096)throw Error('INVALID_PAYMENT_SIGNATURE');fields[name.replaceAll('-','_')]=value;
   }
   // No downloading certificate URLs from untrusted headers.
   const verified=await call('/v1/notifications/verify-webhook-signature','POST',{...fields,webhook_id:config.webhookId,webhook_event:event});
   if(verified.verification_status!=='SUCCESS')throw Error('INVALID_PAYMENT_SIGNATURE');
   return {eventId:(event as any).id,eventType:(event as any).event_type};
  }
 };
}
