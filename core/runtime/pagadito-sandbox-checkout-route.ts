import type {createGeneralAuth} from './general-auth';
import type {createSandboxCheckout} from './pagadito-sandbox-checkout';
type Checkout=ReturnType<typeof createSandboxCheckout>;
const json=(status:number,body:unknown)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
export async function handleSandboxCheckout(req:Request,context:{enabled:boolean;auth:Pick<ReturnType<typeof createGeneralAuth>,'currentUser'>;checkout:Checkout|null;origin:string;testCards:string[];customerIp:string|null}):Promise<Response|null>{
 const url=new URL(req.url);
 const match=url.pathname.match(/^\/v1\/user\/pagadito\/sandbox\/requests\/([a-f0-9-]{36})\/checkout$/);
 if(!match)return null;
 if(!context.enabled||!context.checkout)return json(503,{error:'SANDBOX_DISABLED'});
 if(req.method!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
 if(req.headers.get('origin')!==context.origin||req.headers.get('sec-fetch-site')==='cross-site')return json(403,{error:'ORIGIN_DENIED'});
 const user=await context.auth.currentUser(req);
 if(!user?.roles.some(role=>role==='CLIENT'||role==='ADMIN'))return json(403,{error:'FORBIDDEN'});
 if(!context.customerIp)return json(400,{error:'CUSTOMER_IP_UNAVAILABLE'});
 if(!req.headers.get('content-type')?.startsWith('application/json'))return json(415,{error:'INVALID_CONTENT_TYPE'});
 try{
  const reader=req.body?.getReader();if(!reader)return json(400,{error:'INVALID_BODY'});
  const decoder=new TextDecoder();let raw='',size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();return json(413,{error:'BODY_TOO_LARGE'});}raw+=decoder.decode(value,{stream:true});}
  raw+=decoder.decode();
  const data=JSON.parse(raw);
  if(data.legalAcceptance?.accepted!==true)return json(400,{error:'LEGAL_ACCEPTANCE_REQUIRED'});
  const c=data.card;
  if(!c||typeof c.number!=='string'||!context.testCards.includes(c.number)||!/^\d{3,4}$/.test(c.cvv))return json(400,{error:'SANDBOX_TEST_CARD_REQUIRED'});
  const result=await context.checkout({userId:user.id,addressId:match[1],key:data.key,mode:data.mode,card:c,browserInfo:{deviceFingerprintID:data.deviceFingerprintID,customerIp:context.customerIp}});
  return json(200,{ok:true,result});
 }catch{return json(400,{error:'SANDBOX_CHECKOUT_UNCONFIRMED'});}
}
