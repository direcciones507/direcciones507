import type {createGeneralAuth} from './general-auth';
import type {createPaymentRepository} from './payment-repository';
import type {createPayPalSandboxProvider} from './paypal-provider';
import {readRequestBody} from './request-routes';
type Context={enabled:boolean;origin:string;auth:Pick<ReturnType<typeof createGeneralAuth>,'currentUser'>;repository:ReturnType<typeof createPaymentRepository>|null;provider:ReturnType<typeof createPayPalSandboxProvider>|null};
const rates=new Map<string,{at:number;count:number}>();
export async function handlePayPalRoutes(req:Request,c:Context):Promise<Response|null>{
 const u=new URL(req.url),webhook=u.pathname==='/v1/payments/paypal/webhook';
 const create=u.pathname.match(/^\/v1\/user\/requests\/([a-f0-9-]{36})\/paypal$/);
 const order=u.pathname.match(/^\/v1\/user\/paypal\/orders\/([a-f0-9-]{36})(\/capture)?$/);
 if(!webhook&&!create&&!order)return null;
 const respond=(status:number,body:unknown)=>Response.json(body,{status,headers:{'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'}});
 if(!c.enabled||!c.repository||!c.provider)return respond(503,{ok:false,error:'PAYPAL_SANDBOX_NOT_ENABLED'});
 if(webhook&&req.method!=='POST'||create&&!['GET','POST'].includes(req.method)||order&&req.method!==(order[2]?'POST':'GET'))return respond(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
 try{
  if(webhook){
   if(req.headers.get('content-type')?.split(';')[0]!=='application/json')throw Error('INVALID_PAYMENT_NOTIFICATION');
   const event=JSON.parse((await readRequestBody(req,128000)).toString('utf8'));
   await c.repository.receivePayPalWebhook(req.headers,event,c.provider);return respond(200,{ok:true});
  }
  const origin=req.headers.get('origin');
  if(req.headers.get('sec-fetch-site')==='cross-site'||origin&&origin!==c.origin||req.method==='POST'&&origin!==c.origin)return respond(403,{ok:false,error:'ORIGIN_DENIED'});
  const user=await c.auth.currentUser(req);if(!user)return respond(401,{ok:false,error:'UNAUTHENTICATED'});
  if(!user.roles.some(r=>['CLIENT','ADMIN'].includes(r)))return respond(403,{ok:false,error:'FORBIDDEN'});
  const now=Date.now();for(const[k,v]of rates)if(now-v.at>60000)rates.delete(k);
  const r=rates.get(user.id);if(r&&++r.count>20||!r&&rates.size>=1024)return respond(429,{ok:false,error:'RATE_LIMITED'});if(!r)rates.set(user.id,{at:now,count:1});
  if(create&&req.method==='GET')return respond(200,{ok:true,quote:await c.repository.quotePayPal(user.id,create[1])});
  if(req.method==='POST'){
   if(req.headers.get('content-type')?.split(';')[0]!=='application/json')throw Error('INVALID_PAYMENT_REQUEST');
   const body=JSON.parse((await readRequestBody(req,1024)).toString('utf8'));if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length)throw Error('INVALID_PAYMENT_REQUEST');
  }
  if(create){
   const intent=await c.repository.preparePayPal(user.id,create[1],req.headers.get('idempotency-key')??'');
   if(!intent.required)return respond(200,{ok:true,required:false});
   const initialized=await c.repository.initializePayPal(user.id,intent.order.id,c.provider);
   return respond(200,{ok:true,orderId:initialized.orderId,approvalUrl:'https://www.sandbox.paypal.com/checkoutnow?token='+initialized.providerOrderId});
  }
  const current=await c.repository.readPayPal(user.id,order![1]);
  if(order![2]||current.provider_reference&&!current.provider_reference.startsWith('INITIALIZING:')){
   try{await c.repository.confirmPayPal(user.id,order![1],c.provider,!!order![2]);}
   catch(error){if(order![2]||!(error instanceof Error)||error.message!=='PAYMENT_CONFIRMATION_REQUIRED')throw error;}
  }
  const {provider_reference,...payment}=await c.repository.readPayPal(user.id,order![1]);return respond(200,{ok:true,payment});
 }catch(error){
  const name=error instanceof Error?error.message:'';
  const safe=/^(PAYPAL_[A-Z_]+|PAYMENT_[A-Z_]+|INVALID_PAYMENT_[A-Z_]+|INVALID_IDEMPOTENCY_KEY|PAYLOAD_TOO_LARGE)$/.test(name)?name:'PAYMENT_OPERATION_FAILED';
  const status=name==='PAYMENT_NOT_FOUND'?404:name==='INVALID_PAYMENT_SIGNATURE'?401:name==='PAYPAL_PROVIDER_UNCONFIRMED'?502:name==='PAYLOAD_TOO_LARGE'?413:name==='PAYMENT_PUBLICATION_PENDING'?503:name.startsWith('PAYMENT_')?409:400;
  return respond(status,{ok:false,error:safe});
 }
}
