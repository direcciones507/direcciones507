import {createHash} from 'node:crypto';
const reads=new Map<string,{at:number;count:number}>();
import {requestedIdentity,nameAvailable,publicIdentityUrl} from './custom-names';
export async function handleNameAvailability(req:Request,context:{enabled:boolean;sql:any;auth:{currentUser:(req:Request)=>Promise<any>}}):Promise<Response|null>{
 const url=new URL(req.url);if(url.pathname!=='/v1/user/names/availability')return null;
 const reply=(status:number,body:any)=>Response.json(body,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 if(!context.enabled)return reply(503,{ok:false,error:'CUSTOM_NAMES_NOT_READY'});
 if(req.method!=='GET')return reply(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
 if(req.headers.get('sec-fetch-site')==='cross-site')return reply(403,{ok:false,error:'ORIGIN_DENIED'});
 const user=await context.auth.currentUser(req);if(!user)return reply(401,{ok:false,error:'UNAUTHENTICATED'});
 if(!user.roles?.some((r:string)=>['CLIENT','ADMIN'].includes(r)))return reply(403,{ok:false,error:'FORBIDDEN'});
 const now=Date.now();for(const [key,value]of reads)if(now-value.at>60000)reads.delete(key);const rate=reads.get(user.id);if(rate&&++rate.count>60||!rate&&reads.size>=2048)return reply(429,{ok:false,error:'RATE_LIMITED'});if(!rate)reads.set(user.id,{at:now,count:1});
 try{
  const identity=requestedIdentity({type:'BUSINESS',countryCode:url.searchParams.get('country')??'PA',plan:url.searchParams.get('plan')??'',name:url.searchParams.get('name')??'',namedCode:url.searchParams.get('name')??''});
  if(!identity)throw Error('INVALID_PLAN');
  let addressId:string|undefined;
  const key=url.searchParams.get('key');
  if(key){if(!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw Error('INVALID_REQUEST_KEY');const [own]=await context.sql.unsafe("SELECT a.id::text FROM ad507.addresses a JOIN ad507.address_ownership o ON o.address_id=a.id WHERE a.request_key_hash=$1 AND o.user_id=$2::uuid AND o.ownership_role='OWNER' AND a.source='USER_REQUEST'",[createHash('sha256').update(user.id+':'+key).digest('hex'),user.id]);addressId=own?.id;}
  if(!addressId){const [ownPending]=await context.sql.unsafe("SELECT n.address_id::text AS id FROM ad507.public_name_reservations n JOIN ad507.address_ownership o ON o.address_id=n.address_id JOIN ad507.addresses a ON a.id=n.address_id WHERE n.public_name=$1 AND o.user_id=$2::uuid AND o.ownership_role='OWNER' AND a.source='USER_REQUEST' AND a.status='DRAFT' AND a.publication_receipt IS NULL",[identity.name,user.id]);addressId=ownPending?.id;}
  return reply(200,{ok:true,available:await nameAvailable(context.sql,identity,addressId),publicName:identity.name,publicUrl:publicIdentityUrl(identity,identity.kind==='PRO'?'BUSINESS_PREMIUM_PRO':'BUSINESS_PREMIUM','https://direcciones.lat/'+identity.name+'/')});
 }catch(error){const name=(error as Error).message;return reply(['NAME_RESERVED','INVALID_CODE_NAME','INVALID_COUNTRY','COUNTRY_NOT_ENABLED','INVALID_PLAN','INVALID_REQUEST_KEY'].includes(name)?400:503,{ok:false,error:['NAME_RESERVED','INVALID_CODE_NAME','INVALID_COUNTRY','COUNTRY_NOT_ENABLED','INVALID_PLAN','INVALID_REQUEST_KEY'].includes(name)?name:'CUSTOM_NAMES_NOT_READY'});}
}
