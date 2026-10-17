import type {Sql} from 'postgres';
import {requireLegalAcceptance} from './legal';
import {readRequestBody} from './request-routes';
import type {createGeneralAuth} from './general-auth';
/** Legal boundary only. The existing auth handler still owns credentials, CSRF and OAuth. */
export async function handleAccountLegal(req:Request,sql:Sql,auth:Pick<ReturnType<typeof createGeneralAuth>,'handle'|'currentUser'>){
 const path=new URL(req.url).pathname;
 if(!['/v1/auth/email/register','/v1/legal/account-acceptance'].includes(path))return null;
 const response=(status:number,data:unknown)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
 if(req.method!=='POST')return response(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
 const url=new URL(req.url);const origin=url.protocol==='http:'&&req.headers.get('x-forwarded-proto')==='https'?'https://'+url.host:url.origin;
 if(req.headers.get('origin')!==origin||req.headers.get('sec-fetch-site')==='cross-site')return response(403,{ok:false,error:'ORIGIN_DENIED'});
 try{
  const bytes=await readRequestBody(req.clone(),4096),raw=JSON.parse(bytes.toString('utf8'));
  const evidence=requireLegalAcceptance(raw);
  if(path==='/v1/auth/email/register')return await auth.handle(req);
  const user=await auth.currentUser(req);if(!user)return response(401,{ok:false,error:'UNAUTHENTICATED'});
  await sql.begin(async tx=>{
   await tx.unsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['legal-account:'+user.id]);
   const exists=await tx.unsafe("SELECT 1 FROM ad507.audit_log WHERE actor_user_id=$1::uuid AND action='ACCOUNT_LEGAL_ACCEPTED' AND metadata->>'version'=$2 AND metadata->>'contentHash'=$3 LIMIT 1",[user.id,evidence.version,evidence.contentHash]);
   if(!exists.length)await tx.unsafe("INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,metadata) VALUES($1::uuid,'USER','ACCOUNT_LEGAL_ACCEPTED','USER',$1::text,$2::jsonb)",[user.id,tx.json({...evidence,userId:user.id})]);
  });
  return response(200,{ok:true,version:evidence.version});
 }catch(error){const name=error instanceof Error?error.message:'';return response(name==='PAYLOAD_TOO_LARGE'?413:400,{ok:false,error:name==='INVALID_LEGAL_ACCEPTANCE'?name:'INVALID_INPUT'});}
}
