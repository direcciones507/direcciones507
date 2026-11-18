import type {createGeneralAuth} from './general-auth';
import type {createPagaditoSandboxOrderBridge} from './pagadito-sandbox-order-bridge';

type Context={
  enabled:boolean;
  auth:Pick<ReturnType<typeof createGeneralAuth>,'currentUser'>;
  bridge:ReturnType<typeof createPagaditoSandboxOrderBridge>;
};
const json=(status:number,value:unknown)=>Response.json(value,{status,headers:{
  'cache-control':'no-store','referrer-policy':'no-referrer',
  'x-content-type-options':'nosniff'
}});
/**
 * Read-only Sandbox quote endpoint, deliberately separate from Yappy routes.
 * The caller must explicitly register this handler in server.ts. No card
 * information, tokens or provider credentials are accepted by this route.
 */
export async function handlePagaditoSandboxQuote(req:Request,context:Context):Promise<Response|null>{
  const url=new URL(req.url);
  const match=url.pathname.match(/^\/v1\/user\/pagadito\/sandbox\/requests\/([a-f0-9-]{36})\/quote$/);
  if(!match)return null;
  if(req.method!=='GET')return json(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  if(!context.enabled)return json(503,{ok:false,error:'PAGADITO_SANDBOX_DISABLED'});
  if(req.headers.get('sec-fetch-site')==='cross-site')return json(403,{ok:false,error:'ORIGIN_DENIED'});
  const user=await context.auth.currentUser(req);
  if(!user)return json(401,{ok:false,error:'UNAUTHENTICATED'});
  if(!user.roles.some(role=>role==='CLIENT'||role==='ADMIN'))
    return json(403,{ok:false,error:'FORBIDDEN'});
  const mode=url.searchParams.get('mode')||'ANNUAL';
  if(!['ANNUAL','INSTALLMENTS'].includes(mode))
    return json(400,{ok:false,error:'INVALID_PAYMENT_MODE'});
  try{
    const quote=await context.bridge.quote(user.id,match[1],mode);
    return json(200,{ok:true,quote});
  }catch(error){
    const name=error instanceof Error?error.message:'';
    const notFound=name==='PAYMENT_NOT_FOUND'||name==='INVALID_PAYMENT_REQUEST';
    return json(notFound?404:400,{ok:false,error:notFound?'PAYMENT_NOT_FOUND':'PAGADITO_QUOTE_UNAVAILABLE'});
  }
}
