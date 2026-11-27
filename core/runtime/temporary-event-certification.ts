import type {Sql} from 'postgres';
import {pagaditoRelayEnabled} from './pagadito-certification-relay';
import {CERTIFICATION_REQUEST_ID,createPagaditoSandboxOrderBridge} from './pagadito-sandbox-order-bridge';

type Env=Record<string,string|undefined>;
/** Visibility only: does not change the existing certification authorization. */
export function pagaditoTestButtonVisible(env:Env){return env.AD507_PAGADITO_TEST_BUTTON_VISIBLE==='true';}
type User={id:string;email?:string;roles:readonly unknown[]};
const hosts=['direcciones.lat','direcciones507.com','www.direcciones.lat','www.direcciones507.com'];
/** Reuse the existing authorized certification purchase, never an event UUID.
 * The relay executes exclusively in the isolated Sandbox; no event is activated.
 */
export function temporaryCertificationAuthorized(req:Request,user:User,env:Env){
 return hosts.includes(new URL(req.url).hostname)&&pagaditoRelayEnabled(env)&&
  env.AD507_PAGADITO_QUOTE_PREVIEW_ENABLED==='true'&&!!env.AD507_PAGADITO_TEST_EMAIL&&
  user.email?.toLowerCase()===env.AD507_PAGADITO_TEST_EMAIL.toLowerCase()&&
  user.roles.some(role=>role==='CLIENT'||role==='ADMIN');
}

export function isAuthorizedCertificationRequest(req:Request,user:User,env:Env){
 if(!temporaryCertificationAuthorized(req,user,env))return false;
 const path=new URL(req.url).pathname;
 return req.method==='GET'&&path==='/panel/pagadito/sandbox/'+CERTIFICATION_REQUEST_ID||
  (req.method==='GET'&&['quote','status'].some(action=>path==='/v1/user/pagadito/sandbox/requests/'+CERTIFICATION_REQUEST_ID+'/'+action))||
  req.method==='POST'&&path==='/v1/user/pagadito/sandbox/requests/'+CERTIFICATION_REQUEST_ID+'/checkout';
}

export async function temporaryCertificationLink(req:Request,user:User,env:Env,sql:Sql):Promise<{href?:string;unavailable?:boolean}>{
 if(!pagaditoTestButtonVisible(env)||!temporaryCertificationAuthorized(req,user,env))return {};
 try{
  // Same ownership/payability check as the destination. No writes or provider calls.
  await createPagaditoSandboxOrderBridge(sql).quote(user.id,CERTIFICATION_REQUEST_ID,'ANNUAL',true);
  return {href:'/panel/pagadito/sandbox/'+CERTIFICATION_REQUEST_ID};
 }catch(error){
  console.warn('TEMPORARY_CERTIFICATION_UNAVAILABLE',error instanceof Error?error.message:'QUOTE_UNAVAILABLE');
  return {unavailable:true};
 }
}
