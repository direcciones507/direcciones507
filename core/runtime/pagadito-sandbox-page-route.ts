import type {Sql} from 'postgres';
import {pagaditoRelayEnabled} from './pagadito-certification-relay';
import {createPagaditoSandboxOrderBridge} from './pagadito-sandbox-order-bridge';
import {pagaditoSandboxPage} from './pagadito-sandbox-ui';

/** Existing certification page, shared by the payment and Temporal entry points. */
export async function handlePagaditoSandboxPage(req:Request,ctx:{sql:Sql;env:Record<string,string|undefined>;auth:{currentUser:(req:Request)=>Promise<{id:string;email?:string;roles:unknown[]}|null>}}):Promise<Response|null>{
 const url=new URL(req.url),match=url.pathname.match(/^\/panel\/pagadito\/sandbox\/([a-f0-9-]{36})$/);
 if(!match||req.method!=='GET')return null;
 const env=ctx.env;
 const relay=pagaditoRelayEnabled(env)&&['direcciones.lat','direcciones507.com','www.direcciones.lat','www.direcciones507.com'].includes(url.hostname);
 const headers={'cache-control':'no-store','referrer-policy':'no-referrer','x-robots-tag':'noindex','x-content-type-options':'nosniff'};
 if(!relay&&(env.AD507_PAGADITO_CERTIFICATION_ENABLED!=='true'||env.AD507_PAGADITO_ISOLATED_DB!=='true'||env.AD507_PAGADITO_ENVIRONMENT!=='sandbox'||env.AD507_PAGADITO_ENABLED!=='true'))return new Response('Sandbox no disponible',{status:404,headers});
 const user=await ctx.auth.currentUser(req);
 if(!user?.roles.some(role=>role==='CLIENT'||role==='ADMIN')||(relay&&(!env.AD507_PAGADITO_TEST_EMAIL||user.email?.toLowerCase()!==env.AD507_PAGADITO_TEST_EMAIL.toLowerCase())))return new Response('Acceso requerido',{status:403,headers});
 try{await createPagaditoSandboxOrderBridge(ctx.sql).quote(user.id,match[1]);}catch{return new Response('Solicitud no disponible',{status:404,headers});}
 return new Response(pagaditoSandboxPage(match[1]),{headers:{...headers,'content-type':'text/html; charset=utf-8'}});
}
