import type {createGeneralAuth} from './general-auth';
import type {createPaymentRepository} from './payment-repository';
import type {createYappyProvider} from './yappy-provider';
import {readRequestBody} from './request-routes';

type Context={enabled:boolean;auth:Pick<ReturnType<typeof createGeneralAuth>,'currentUser'>;repository:ReturnType<typeof createPaymentRepository>|null;provider:ReturnType<typeof createYappyProvider>|null};
const rates=new Map<string,{at:number;count:number}>();
export async function handlePaymentRoutes(req:Request,context:Context):Promise<Response|null> {
  const url=new URL(req.url),ipn=url.pathname==='/v1/payments/yappy/ipn';
  const quote=url.pathname.match(/^\/v1\/user\/requests\/([a-f0-9-]{36})\/payment$/);
  const status=url.pathname.match(/^\/v1\/user\/payments\/([a-f0-9-]{36})$/);
  if(!ipn&&!quote&&!status)return null;
  const respond=(code:number,value:unknown)=>Response.json(value,{status:code,headers:{'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'}});
  if(!context.enabled||!context.repository||!context.provider)return respond(503,{ok:false,error:'YAPPY_NOT_ENABLED'});
  if(ipn&&req.method!=='GET'||status&&req.method!=='GET'||quote&&!['GET','POST'].includes(req.method))return respond(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  let publicOrderId:string|undefined;
  try {
    if(ipn){await context.repository.confirm(url.searchParams);return respond(200,{success:true});}
    if(req.headers.get('sec-fetch-site')==='cross-site'||req.method==='POST'&&req.headers.get('origin')!==url.origin)return respond(403,{ok:false,error:'ORIGIN_DENIED'});
    const user=await context.auth.currentUser(req);if(!user)return respond(401,{ok:false,error:'UNAUTHENTICATED'});
    if(!user.roles.some(role=>['CLIENT','ADMIN'].includes(role)))return respond(403,{ok:false,error:'FORBIDDEN'});
    const now=Date.now();for(const [key,item]of rates)if(now-item.at>60000)rates.delete(key);
    const item=rates.get(user.id);if(item&&++item.count>20||!item&&rates.size>=1024)return respond(429,{ok:false,error:'RATE_LIMITED'});if(!item)rates.set(user.id,{at:now,count:1});
    if(status)return respond(200,{ok:true,payment:await context.repository.read(user.id,status[1])});
    if(req.method==='GET')return respond(200,{ok:true,quote:await context.repository.quote(user.id,quote![1])});
    if(!req.headers.get('content-type')?.startsWith('application/json'))throw Error('INVALID_PAYMENT_REQUEST');
    const body=JSON.parse((await readRequestBody(req,1024)).toString('utf8'));
    if(!body||typeof body.alias!=='string'||Object.keys(body).some(key=>key!=='alias')||!/^6[0-9]{7}$/.test(body.alias))throw Error('INVALID_PAYMENT_REQUEST');
    const intent=await context.repository.prepare(user.id,quote![1],req.headers.get('idempotency-key')??'');
    if(!intent.required)return respond(200,{ok:true,required:false,amountCents:0});
    publicOrderId=intent.order.id;
    if(intent.order.provider_reference||intent.order.status!=='PENDING')return respond(409,{ok:false,error:'PAYMENT_ALREADY_INITIALIZED',orderId:intent.order.id});
    // Claim before network I/O: a second POST must not send another provider order.
    // On an uncertain failure keep the intent for reconciliation, never replace it.
    await context.repository.claimProviderOrder(intent.order.id);
    const button=await context.provider.createOrder({providerOrderId:intent.order.provider_order_id,amountCents:intent.order.amount_cents},body.alias);
    // Replace the initialization marker through a backend-only method.
    await context.repository.completeProviderOrder(intent.order.id,button.transactionId);
    return respond(200,{ok:true,required:true,orderId:intent.order.id,amountCents:intent.order.amount_cents,button});
  }catch(error){
    const name=error instanceof Error?error.message:'';
    const safe=/^(PAYMENT_NOT_FOUND|INVALID_PAYMENT_[A-Z_]+|INVALID_IDEMPOTENCY_KEY|INVALID_YAPPY_ORDER|PAYMENT_[A-Z_]+|YAPPY_PROVIDER_UNCONFIRMED|PAYLOAD_TOO_LARGE)$/.test(name)?name:'PAYMENT_OPERATION_FAILED';
    const code=name==='PAYMENT_NOT_FOUND'?404:name==='INVALID_PAYMENT_SIGNATURE'?401:name==='YAPPY_PROVIDER_UNCONFIRMED'?502:name.startsWith('PAYMENT_')?409:400;
    return respond(code,ipn?{success:false}:{ok:false,error:safe,...(publicOrderId?{orderId:publicOrderId}:{})});
  }
}
