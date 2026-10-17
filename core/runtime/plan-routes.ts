import type {createGeneralAuth} from './general-auth';
import type {createPlanLifecycle} from './plan-lifecycle';
import type {createPaymentRepository} from './payment-repository';
import type {createYappyProvider} from './yappy-provider';
import {readRequestBody} from './request-routes';
import {paymentAmount} from './payment-policy';
import {PLAN_POLICY_VERSION} from './plan-policy';

const rates=new Map<string,{at:number;count:number}>();
export async function handlePlanRoutes(req:Request,context:{enabled:boolean;auth:Pick<ReturnType<typeof createGeneralAuth>,'currentUser'>;lifecycle:ReturnType<typeof createPlanLifecycle>|null;payments:ReturnType<typeof createPaymentRepository>|null;provider:ReturnType<typeof createYappyProvider>|null;sql:any;periods:Record<string,number>}) {
 const url=new URL(req.url),admin=url.pathname==='/v1/admin/plan-lifecycle';
 const renewal=url.pathname.match(/^\/v1\/user\/requests\/([a-f0-9-]{36})\/renewal$/);
 if(!admin&&!renewal)return null;
 const respond=(status:number,data:any)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 if(!context.enabled||!context.lifecycle)return respond(503,{ok:false,error:'PLAN_AUTOMATION_NOT_ENABLED'});
 if(admin&&req.method!=='GET'||renewal&&!['GET','POST'].includes(req.method))return respond(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
 const origin=url.protocol==='http:'&&req.headers.get('x-forwarded-proto')==='https'?'https://'+url.host:url.origin;
 if(req.headers.get('sec-fetch-site')==='cross-site'||req.headers.has('origin')&&req.headers.get('origin')!==origin||req.method==='POST'&&req.headers.get('origin')!==origin)return respond(403,{ok:false,error:'ORIGIN_DENIED'});
 try{
  const user=await context.auth.currentUser(req);if(!user)return respond(401,{ok:false,error:'UNAUTHENTICATED'});
  // Recheck DB role instead of trusting caller-supplied plan/country/price.
  if(admin){if(!user.roles.includes('ADMIN'))return respond(403,{ok:false,error:'FORBIDDEN'});const roles=await context.sql.unsafe("SELECT 1 FROM ad507.users u JOIN ad507.user_roles r ON r.user_id=u.id WHERE u.id=$1::uuid AND u.status='ACTIVE' AND r.role='ADMIN'",[user.id]);if(!roles.length)return respond(403,{ok:false,error:'FORBIDDEN'});return respond(200,{ok:true,...await context.lifecycle.summary(url.searchParams)});}
  const [row]=await context.sql.unsafe("SELECT a.id,a.country_code,a.request_data FROM ad507.addresses a JOIN ad507.address_ownership o ON o.address_id=a.id JOIN ad507.users u ON u.id=o.user_id WHERE a.id=$1::uuid AND o.user_id=$2::uuid AND o.ownership_role='OWNER' AND u.status='ACTIVE' AND a.status='ACTIVE' AND a.source='USER_REQUEST' AND a.address_type='BUSINESS' AND a.review_decision='APPROVED' AND a.publication_receipt IS NOT NULL AND NOT a.request_data ? 'migration'",[renewal![1],user.id]);
  if(!row)return respond(404,{ok:false,error:'PLAN_ADDRESS_NOT_FOUND'});
  const plan=row.request_data.plan,days=context.periods[row.country_code+':'+plan];
  if(!['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(plan)||!days||!row.request_data.planLifecycle)return respond(409,{ok:false,error:'PLAN_PERIOD_NOT_CONFIGURED'});
  const enabled=!!context.payments&&!!context.provider&&row.country_code==='PA';
  if(req.method==='GET'){const [pending]=await context.sql.unsafe("SELECT o.id FROM ad507.plan_renewals r JOIN ad507.orders o ON o.id=r.order_id WHERE r.address_id=$1::uuid AND r.user_id=$2::uuid AND o.status='PENDING' ORDER BY r.accepted_at DESC LIMIT 1",[row.id,user.id]);return respond(200,{ok:true,quote:{plan,periodDays:days,amountCents:paymentAmount(plan),currency:'USD',policyVersion:PLAN_POLICY_VERSION,available:enabled,automaticCharge:false,orderId:pending?.id??null}});}
  if(!enabled)return respond(503,{ok:false,error:'PAYMENT_PROVIDER_NOT_ENABLED'});
  const at=Date.now();for(const [id,value]of rates)if(at-value.at>60000)rates.delete(id);
  const entry=rates.get(user.id);if(entry&&++entry.count>10||!entry&&rates.size>=1024)return respond(429,{ok:false,error:'RATE_LIMITED'});if(!entry)rates.set(user.id,{at,count:1});
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw Error('INVALID_RENEWAL');
  const body=JSON.parse((await readRequestBody(req,2048)).toString('utf8'));
  if(!body||body.accepted!==true||body.policyVersion!==PLAN_POLICY_VERSION||body.periodDays!==days||body.amountCents!==paymentAmount(plan)||body.currency!=='USD'||typeof body.alias!=='string'||!/^6[0-9]{7}$/.test(body.alias)||Object.keys(body).some(k=>!['accepted','policyVersion','periodDays','amountCents','currency','alias'].includes(k)))throw Error('INVALID_RENEWAL');
  const order=await context.lifecycle.prepareRenewal(user.id,row.id,req.headers.get('idempotency-key')??'',true);
  if(order.provider_reference||order.status!=='PENDING')return respond(200,{ok:true,orderId:order.id,status:order.status,alreadyInitialized:true});
  await context.payments!.claimProviderOrder(order.id);
  const button=await context.provider!.createOrder({providerOrderId:order.provider_order_id,amountCents:order.amount_cents},body.alias);
  await context.payments!.completeProviderOrder(order.id,button.transactionId);
  return respond(200,{ok:true,orderId:order.id,button});
 }catch(error){const message=error instanceof Error?error.message:'';const safe=/^(INVALID_RENEWAL|INVALID_PLAN_FILTER|PLAN_ADDRESS_NOT_FOUND|PLAN_PERIOD_NOT_CONFIGURED|PAYMENT_[A-Z_]+|YAPPY_PROVIDER_UNCONFIRMED)$/.test(message)?message:'PLAN_OPERATION_UNAVAILABLE';return respond(safe==='PLAN_ADDRESS_NOT_FOUND'?404:safe==='PLAN_OPERATION_UNAVAILABLE'?503:409,{ok:false,error:safe});}
}
