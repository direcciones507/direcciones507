import type { Sql } from 'postgres';
import type { createGeneralAuth } from './general-auth';
import type { createRequestRepository } from './request-repository';
import { createRequestMediaStorage } from './request-media';
import type { R2Settings } from './r2-storage';
import { renderCommercialBridge } from './commercial-migration';
import type { RequestFile } from './request-validation';
import { YAPPY_PAYMENTS_ENABLED } from './payment-policy';

// Commercial workflow stays off unless production explicitly enables it.
export const REQUEST_WORKFLOW_ENABLED=process.env.AD507_COMMERCIAL_WORKFLOW_ENABLED === 'true';
const maxBody=49*1024*1024;
const limits=new Map<string,{at:number;count:number}>();
export async function readRequestBody(req:Request,limit:number) {
  const reader=req.body?.getReader();if(!reader)throw Error('INVALID_REQUEST');
  const chunks:Uint8Array[]=[];let length=0;
  let expired=false;
  const timer=setTimeout(()=>{expired=true;reader.cancel().catch(()=>{});},20_000);
  try {while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Error('PAYLOAD_TOO_LARGE');}chunks.push(value);}}finally{clearTimeout(timer);reader.releaseLock();}
  if(expired)throw Error('INVALID_REQUEST');
  return Buffer.concat(chunks);
}
export async function parseRequestForm(req:Request) {
  if(!req.headers.get('content-type')?.startsWith('multipart/form-data;'))throw Error('INVALID_REQUEST');
  const declared=req.headers.get('content-length');if(declared&&(!/^\d+$/.test(declared)||Number(declared)>maxBody))throw Error('PAYLOAD_TOO_LARGE');
  const bytes=await readRequestBody(req,maxBody);
  const data=await new Request(req.url,{method:'POST',headers:{'content-type':req.headers.get('content-type')!},body:bytes}).formData();
  if([...data.keys()].some(k=>!['payload','logo','photos'].includes(k))||data.getAll('payload').length!==1)throw Error('INVALID_REQUEST');
  const payload=data.get('payload');if(typeof payload!=='string'||payload.length>64000)throw Error('INVALID_REQUEST');
  let raw:unknown;try{raw=JSON.parse(payload);}catch{throw Error('INVALID_REQUEST');}
  const files:RequestFile[]=[];
  for(const name of ['logo','photos'])for(const file of data.getAll(name)){if(!(file instanceof File)||!file.size||file.size>8*1024*1024||files.length>=6)throw Error('INVALID_IMAGE');files.push({role:name==='logo'?'logo':'photo',mime:file.type,bytes:new Uint8Array(await file.arrayBuffer())});}
  return {raw,files};
}
export async function handleRequestRoutes(req:Request,context:{enabled:boolean;sql:Sql;auth:Pick<ReturnType<typeof createGeneralAuth>,'currentUser'>;repository:ReturnType<typeof createRequestRepository>;r2:R2Settings|null;fetch?:typeof fetch}):Promise<Response|null> {
  const url=new URL(req.url),adminCreate=url.pathname==='/v1/admin/requests'&&req.method==='POST',submit=url.pathname==='/v1/user/requests'||adminCreate;
  const action=url.pathname.match(/^\/v1\/admin\/requests\/([a-f0-9-]{36})\/(approve|reject|publish|transfer|rollback)$/);
  const bridge=url.pathname.match(/^\/v1\/admin\/requests\/([a-f0-9-]{36})\/bridge$/);
  const detail=url.pathname.match(/^\/v1\/admin\/requests\/([a-f0-9-]{36})$/);
  const media=url.pathname.match(/^\/v1\/admin\/requests\/([a-f0-9-]{36})\/media\/([a-f0-9-]{36})$/);
  if(!submit&&!action&&!detail&&!media&&!bridge)return null;
  const respond=(status:number,value:unknown)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
  if(!context.enabled)return respond(503,{ok:false,error:'USER_PANEL_SUBMISSION_NOT_ENABLED'});
  if(req.method!==(submit||action?'POST':'GET'))return respond(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try {
    if(req.headers.get('sec-fetch-site')==='cross-site'||(req.method==='POST'&&req.headers.get('origin')!==url.origin)||(req.headers.has('origin')&&req.headers.get('origin')!==url.origin))return respond(403,{ok:false,error:'ORIGIN_DENIED'});
    const user=await context.auth.currentUser(req);if(!user)return respond(401,{ok:false,error:'UNAUTHENTICATED'});
    const canCreateCommercial=adminCreate&&user.roles.includes('COMMERCIAL');
    if(!(submit&&!adminCreate?(user.roles.includes('CLIENT')||user.roles.includes('ADMIN')):user.roles.includes('ADMIN'))&&!canCreateCommercial)return respond(403,{ok:false,error:'FORBIDDEN'});
    const now=Date.now();for(const [id,item]of limits)if(now-item.at>60000)limits.delete(id);
    const item=limits.get(user.id);if(item&&++item.count>20||!item&&limits.size>=1024)return respond(429,{ok:false,error:'RATE_LIMITED'});if(!item)limits.set(user.id,{at:now,count:1});
    if(adminCreate&&req.headers.get('content-type')?.startsWith('application/json')){const body=JSON.parse((await readRequestBody(req,64000)).toString('utf8'));if(!body||Object.keys(body).length!==1||!body.historicalSnapshot)throw Error('INVALID_REQUEST');return respond(200,{ok:true,request:await context.repository.stageHistorical(user.id,req.headers.get('idempotency-key')??'',body.historicalSnapshot)});}
    if(submit){const {raw,files}=await parseRequestForm(req);const result=await context.repository[adminCreate?'createAdmin':'submit'](user.id,req.headers.get('idempotency-key')??'',raw,files);return respond(200,{ok:true,request:result,...(YAPPY_PAYMENTS_ENABLED&&!adminCreate&&result.status==='PENDING_REVIEW'?{paymentUrl:'/panel/payments/'+result.id}:{})});}
    if(bridge){await context.repository.read(user.id,bridge[1]);const rows=await context.sql.unsafe("SELECT legacy_payload FROM ad507.addresses WHERE id=$1::uuid AND source='USER_REQUEST' AND request_data->>'origin'='HISTORICAL_IMPORT'",[bridge[1]]);if(!rows.length)throw Error('REQUEST_NOT_FOUND');return new Response(renderCommercialBridge(rows[0].legacy_payload,bridge[1],url.origin),{headers:{'content-type':'text/html; charset=utf-8','content-disposition':'attachment; filename="'+rows[0].legacy_payload.code+'.html"','cache-control':'no-store','x-content-type-options':'nosniff'}});}
    if(detail)return respond(200,{ok:true,request:await context.repository.read(user.id,detail[1])});
    if(media){
      if(!context.r2)throw Error('R2_NOT_READY');
      // Revalidate actual association and actor in the storage authorizer before GET.
      await context.repository.read(user.id,media[1]);
      const rows=await context.sql.unsafe("SELECT storage_key,media_type FROM ad507.address_media WHERE id=$1::uuid AND address_id=$2::uuid AND upload_status='READY'",[media[2],media[1]]);if(!rows.length)throw Error('REQUEST_NOT_FOUND');
      const file=await createRequestMediaStorage(context.sql,user.id,context.r2,context.fetch).readPrivate({ownerId:user.id,addressId:media[1],role:rows[0].media_type==='LOGO'?'logo':'photo',storageKey:rows[0].storage_key});
      return new Response(file.bytes,{headers:{'content-type':'image/webp','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"}});
    }
    if(action![2]==='transfer'){
      if(Number(req.headers.get('content-length')??0)>4096)throw Error('PAYLOAD_TOO_LARGE');
      const text=(await readRequestBody(req,4096)).toString('utf8');if(text.length>4096)throw Error('PAYLOAD_TOO_LARGE');
      const body=JSON.parse(text);if(!body||typeof body.expectedOwner!=='string'||typeof body.targetId!=='string'||Object.keys(body).some(k=>!['expectedOwner','targetId'].includes(k)))throw Error('INVALID_REQUEST');
      return respond(200,{ok:true,request:await context.repository.transfer(user.id,action[1],body.expectedOwner,body.targetId)});
    }
    const result=action![2]==='rollback'?await context.repository.rollbackHistorical(user.id,action![1]):action![2]==='publish'?await context.repository.publish(user.id,action![1]):await context.repository.review(user.id,action![1],action![2]==='approve'?'APPROVED':'REJECTED');
    return respond(200,{ok:true,request:result});
  } catch(error){
    const name=error instanceof Error?error.message:'';
    const status=name==='FORBIDDEN'?403:name==='REQUEST_NOT_FOUND'?404:['PAYMENT_CONFIRMATION_REQUIRED','IDEMPOTENCY_CONFLICT','INVALID_STATE_TRANSITION','APPROVAL_REQUIRED','MEDIA_INCOMPLETE','CANONICAL_CODE_COLLISION','OWNERSHIP_CONFLICT','PUBLICATION_STATE_CONFLICT'].includes(name)?409:['R2_NOT_READY','CANONICAL_PUBLICATION_NOT_READY','HISTORICAL_NAMESPACE_NOT_VERIFIED','HISTORICAL_REGISTRY_UNAVAILABLE','RESIDENTIAL_PUBLICATION_NOT_READY','PUBLICATION_UNCONFIRMED'].includes(name)?503:400;
    const safe=/^(INVALID_[A-Z_]+|CAPABILITY_VIOLATION|IDEMPOTENCY_CONFLICT|DUPLICATE_MEDIA|PLAN_NOT_FOUND|REQUEST_NOT_FOUND|FORBIDDEN|PAYLOAD_TOO_LARGE|R2_NOT_READY|CANONICAL_PUBLICATION_NOT_READY|INVALID_STATE_TRANSITION|APPROVAL_REQUIRED|MEDIA_INCOMPLETE|CANONICAL_CODE_COLLISION|HISTORICAL_NAMESPACE_NOT_VERIFIED|HISTORICAL_REGISTRY_UNAVAILABLE|RESIDENTIAL_PUBLICATION_NOT_READY|OWNERSHIP_CONFLICT|ADMIN_CREATION_REQUIRED|HISTORICAL_DATA_CHANGED|HISTORICAL_MEDIA_UNVERIFIED|HISTORICAL_RESOURCE_UNAVAILABLE|MIGRATION_BRIDGE_NOT_VERIFIED|HISTORICAL_RESTORE_REQUIRED|PUBLICATION_STATE_CONFLICT|PUBLICATION_UNCONFIRMED|CANONICAL_CODE_INVALID)$/.test(name)?name:'REQUEST_OPERATION_FAILED';
    return respond(status,{ok:false,error:name==='PAYMENT_CONFIRMATION_REQUIRED'?name:safe});
  }
}
