/** Authenticated draft and public event endpoints. Disabled until migration is applied. */
import type {Sql} from 'postgres';
import type {createGeneralAuth} from './general-auth';
import {createTemporaryEventRepository} from './temporary-event-repository';
import {renderTemporaryEventDraftForm,temporaryEventDraftClientScript} from './temporary-event-form';
import {renderTemporaryEventPage} from './temporary-event-page';
import type {TemporaryEventDraft} from './temporary-event-draft';
const json=(status:number,error:string)=>Response.json({ok:false,error},{status,headers:{'cache-control':'no-store'}});
export async function handleTemporaryEventRoutes(req:Request,ctx:{enabled:boolean;sql:Sql;auth:Pick<ReturnType<typeof createGeneralAuth>,'currentUser'>}):Promise<Response|null>{
 const url=new URL(req.url);
 const form=url.pathname==='/panel/evento/nuevo';
 const draft=url.pathname==='/v1/user/temporary-events';
 const match=url.pathname.match(/^\/evento\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
 if(!form&&!draft&&!match)return null;
 if(!ctx.enabled)return json(404,'EVENTS_NOT_ENABLED');
 const repository=createTemporaryEventRepository(ctx.sql);
 if(match){
  if(req.method!=='GET'&&req.method!=='HEAD')return json(405,'METHOD_NOT_ALLOWED');
  try{
   const event=await repository.getPublic(match[1]);
   if(!event)return json(404,'EVENT_NOT_FOUND');
   // Render only public fields; do not manufacture or load private responsible data.
   const data={...event,responsibleName:'',responsibleEmail:'',responsiblePhone:'',publicContactConsent:!!(event.publicContactName||event.publicContactPhone)} as TemporaryEventDraft;
   const html=renderTemporaryEventPage({draft:data,slug:event.slug,status:event.status,paymentConfirmedAt:'VERIFIED',photos:[]});
   return new Response(req.method==='HEAD'?null:html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
  }catch{return json(503,'EVENT_UNAVAILABLE')}
 }
 if(form&&req.method!=='GET'||draft&&req.method!=='POST')return json(405,'METHOD_NOT_ALLOWED');
 const origin=url.protocol==='http:'&&req.headers.get('x-forwarded-proto')==='https'?'https://'+url.host:url.origin;
 if(req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.has('origin')&&req.headers.get('origin')!==origin))return json(403,'ORIGIN_DENIED');
 if(draft&&(req.headers.get('origin')!==origin||req.headers.get('content-type')?.split(';')[0]!=='application/json'||req.headers.get('x-requested-with')!=='XMLHttpRequest'))return json(403,'REQUEST_DENIED');
 try{
  const user=await ctx.auth.currentUser(req);
  if(!user)return json(401,'UNAUTHENTICATED');
  if(!user.roles.some(r=>r==='CLIENT'||r==='ADMIN'))return json(403,'FORBIDDEN');
  if(form){
   const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"></head><body>'+renderTemporaryEventDraftForm()+'<script>'+temporaryEventDraftClientScript+'</script></body></html>';
   return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex','content-security-policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"}});
  }
  const body=await req.text();if(body.length>24000)return json(413,'PAYLOAD_TOO_LARGE');
  let input:unknown;try{input=JSON.parse(body)}catch{return json(400,'INVALID_JSON')}
  try{return Response.json({ok:true,...await repository.createDraft(user.id,input)},{status:201,headers:{'cache-control':'no-store'}})}
  catch(e){if(e instanceof Error&&/^(INVALID_|EVENT_DURATION_|PUBLIC_CONTACT_)/.test(e.message))return json(400,e.message);throw e}
 }catch{return json(503,'EVENT_UNAVAILABLE')}
}
