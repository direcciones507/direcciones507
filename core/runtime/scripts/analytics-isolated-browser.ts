/** CI-only browser harness: real PostgreSQL, authentication, panel and event handlers.
 * Only the external Google exchange is simulated. Never accepts a remote database. */
import type {Sql} from 'postgres';
import {createGeneralAuth} from '../general-auth';
import {handleUserPanel} from '../user-panel';
import {handleAnalyticsRoutes,createAnalyticsRepository} from '../analytics-repository';
import {renderNewPublicAddress} from '../new-address-publication';
export async function runAnalyticsBrowser(sql:Sql){
 const origin='https://direcciones.lat';
 const auth=createGeneralAuth(sql,{AD507_GOOGLE_CLIENT_ID:'isolated-client',AD507_GOOGLE_CLIENT_SECRET:'isolated-secret',AD507_SESSION_SECRET:crypto.randomUUID()+crypto.randomUUID(),AD507_GOOGLE_REDIRECT_URI:origin+'/auth/google/callback',AD507_AUTH_SUCCESS_URL:'/panel',AD507_PUBLIC_BASE_URL:origin},(async(url:any)=>Response.json(String(url).includes('/token')?{access_token:'isolated-token'}:{sub:'statistics-browser-owner',email:'owner@example.test',email_verified:true})) as typeof fetch);
 const start=(await auth.handle(new Request(origin+'/auth/google/login')))!;
 const state=new URL(start.headers.get('location')!).searchParams.get('state');
 const result=(await auth.handle(new Request(origin+'/auth/google/callback?state='+state+'&code=isolated',{headers:{cookie:start.headers.getSetCookie().find(c=>c.startsWith('ad507_oauth_state='))!.split(';')[0]}})))!;
 const cookie=result.headers.getSetCookie().find(c=>c.startsWith('ad507_session='))?.split(';')[0];
 if(!cookie)throw Error('ISOLATED_AUTH_FAILED');
 const server=Bun.serve({hostname:'127.0.0.1',port:0,async fetch(incoming){
  const u=new URL(incoming.url);const headers=new Headers(incoming.headers);if(headers.get('origin')===u.origin)headers.set('origin',origin);
  // Local browser transport only; production handlers still receive the configured origin.
  const req=new Request(origin+u.pathname+u.search,{method:incoming.method,headers,...(incoming.method==='POST'?{body:await incoming.arrayBuffer()}:{} )});
  const analytics=await handleAnalyticsRoutes(req,{sql,auth});if(analytics)return analytics;
  const panel=await handleUserPanel(req,sql,auth);if(panel)return panel;
  const match=u.pathname.match(/^\/(AD507-STATS-BUSINESS_PREMIUM(?:_PRO)?)\/$/);
  if(match)return new Response(renderNewPublicAddress({type:'BUSINESS',name:'Premium · prueba aislada sin cobro',url:origin+u.pathname,code:match[1],socials:[],media:[],coordinates:{latitude:8,longitude:-80},phone:'50760000000',landlinePhone:'5072000000',plan:{name:'Premium Pro',code:match[1].endsWith('_PRO')?'BUSINESS_PREMIUM_PRO':'BUSINESS_PREMIUM'},extras:{countryCode:'PA',historical:false,postalCode:null}} as any),{headers:{'content-type':'text/html'}});
  return new Response('',{status:404});
 }});
 try{
 const child=Bun.spawn(['node','core/runtime/scripts/analytics-real-browser.cjs'],{cwd:new URL('../../../',import.meta.url).pathname,env:{...process.env,ANALYTICS_TEST_URL:'http://127.0.0.1:'+server.port,ANALYTICS_TEST_COOKIE:cookie},stdout:'inherit',stderr:'inherit'});
 if(await child.exited!==0)throw Error('REAL_ANALYTICS_BROWSER_FAILED');
 }finally{await server.stop(true);}
}
