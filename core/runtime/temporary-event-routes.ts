import QRCode from 'qrcode';
import {eventOwnerRoute,type EventServices} from './temporary-event-owner';
/** Authenticated draft and public event endpoints. Disabled until migration is applied. */
import type {Sql} from 'postgres';
import {createTemporaryEventRepository} from './temporary-event-repository';
import {renderTemporaryEventDraftForm,temporaryEventDraftClientScript} from './temporary-event-form';
import {renderTemporaryEventPage} from './temporary-event-page';
import type {TemporaryEventDraft} from './temporary-event-draft';
const json=(status:number,error:string)=>Response.json({ok:false,error},{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
export async function handleTemporaryEventRoutes(req:Request,ctx:EventServices&{enabled:boolean;sql:Sql;auth:{currentUser:(req:Request)=>Promise<{id:string;roles:unknown[]}|null>}}):Promise<Response|null>{
 const url=new URL(req.url);
 const form=url.pathname==='/panel/evento/nuevo';
 const draft=url.pathname==='/v1/user/temporary-events';
 const owned=/^\/v1\/user\/temporary-events\/[a-f0-9-]{36}(?:\/(preview|photos|payment))?$/.test(url.pathname);
 const ipn=url.pathname==='/v1/payments/temporary-events/yappy/ipn';
 const match=url.pathname.match(/^\/evento\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/(qr\.png|foto\/[123]))?$/);
 if(!form&&!draft&&!match&&!owned&&!ipn)return null;
 if(!ctx.enabled)return json(404,'EVENTS_NOT_ENABLED');
 const repository=createTemporaryEventRepository(ctx.sql);
 if(ipn){
  if(req.method!=='GET')return json(405,'METHOD_NOT_ALLOWED');
  if(!ctx.payment)return json(503,'EVENT_PAYMENTS_DISABLED');
  try{await ctx.payment.confirm(url.searchParams);return Response.json({success:true},{headers:{'cache-control':'no-store'}})}catch{return json(400,'INVALID_PAYMENT_NOTIFICATION')}
 }
 if(match){
  if(req.method!=='GET'&&req.method!=='HEAD')return json(405,'METHOD_NOT_ALLOWED');
  try{
   const event=await repository.getPublic(match[1]);
   if(!event)return json(404,'EVENT_NOT_FOUND');
   // Render only public fields; do not manufacture or load private responsible data.
   const data={...event,responsibleName:'',responsibleEmail:'',responsiblePhone:'',publicContactConsent:!!(event.publicContactName||event.publicContactPhone)} as TemporaryEventDraft;
   const base='https://direcciones.lat/evento/'+event.slug;
   const photos=await repository.photos(event.id);
   if(match[2]){
    if(event.status!=='ACTIVE')return json(410,'EVENT_FINISHED');
    if(match[2]==='qr.png')return new Response(req.method==='HEAD'?null:new Uint8Array(await QRCode.toBuffer(base,{width:640,margin:4})),{headers:{'content-type':'image/png','cache-control':'no-store','x-robots-tag':'noindex, nofollow','content-disposition':'attachment; filename="evento-qr.png"'}});
    const photo=photos.find(x=>Number(x.slot)===Number(match[2].split('/')[1]));
    if(!photo||!ctx.media)return json(404,'PHOTO_NOT_FOUND');
    return new Response(req.method==='HEAD'?null:await ctx.media.read(photo.object_key),{headers:{'content-type':'image/webp','cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'}});
   }
   const html=renderTemporaryEventPage({draft:data,slug:event.slug,status:event.status,paymentConfirmedAt:'VERIFIED',photos:photos.map(x=>base+'/foto/'+x.slot),qrPngDataUrl:await QRCode.toDataURL(base,{width:640,margin:4})});
   return new Response(req.method==='HEAD'?null:html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; img-src 'self' https: data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
  }catch{return json(503,'EVENT_UNAVAILABLE')}
 }
 if(form&&req.method!=='GET'||draft&&!['GET','POST'].includes(req.method))return json(405,'METHOD_NOT_ALLOWED');
 const origin=url.protocol==='http:'&&req.headers.get('x-forwarded-proto')==='https'?'https://'+url.host:url.origin;
 if(req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.has('origin')&&req.headers.get('origin')!==origin))return json(403,'ORIGIN_DENIED');
 if(((draft||owned)&&!['GET','HEAD'].includes(req.method))&&(req.headers.get('origin')!==origin||(!url.pathname.endsWith('/photos')&&req.headers.get('content-type')?.split(';')[0]!=='application/json')||req.headers.get('x-requested-with')!=='XMLHttpRequest'))return json(403,'REQUEST_DENIED');
 try{
  const user=await ctx.auth.currentUser(req);
  if(!user){if(form)return new Response(null,{status:302,headers:{location:'/panel','cache-control':'no-store'}});return json(401,'UNAUTHENTICATED');}
  if(!user.roles.some(r=>r==='CLIENT'||r==='ADMIN'))return json(403,'FORBIDDEN');
  if(draft&&req.method==='GET'){const events=await ctx.sql.unsafe('SELECT id,slug,title,status,created_at FROM ad507.temporary_events WHERE owner_user_id=$1 ORDER BY created_at DESC LIMIT 100',[user.id]);return Response.json({ok:true,events},{headers:{'cache-control':'no-store'}})}
  if(owned)return await eventOwnerRoute(req,ctx.sql,user.id,ctx);
  if(form){
   const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'+(ctx.payment?'<script type="module" src="https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js"></script>':'')+'</head><body>'+renderTemporaryEventDraftForm('/v1/user/temporary-events',!!ctx.payment)+'<script>'+temporaryEventDraftClientScript+'</script></body></html>';
   return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex','content-security-policy':"default-src 'self'; script-src 'unsafe-inline' https://bt-cdn.yappy.cloud https://unpkg.com; connect-src 'self' https://*.yappy.cloud https://*.bgeneral.cloud; img-src 'self' data: https:; style-src 'unsafe-inline' https://unpkg.com; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"}});
  }
  const body=await req.text();if(body.length>24000)return json(413,'PAYLOAD_TOO_LARGE');
  let input:unknown;try{input=JSON.parse(body)}catch{return json(400,'INVALID_JSON')}
  try{return Response.json({ok:true,...await repository.createDraft(user.id,input)},{status:201,headers:{'cache-control':'no-store'}})}
  catch(e){if(e instanceof Error&&/^(INVALID_|EVENT_DURATION_|PUBLIC_CONTACT_)/.test(e.message))return json(400,e.message);throw e}
 }catch(e){const m=e instanceof Error?e.message:'';if(/^(INVALID_|EVENT_DURATION_|PUBLIC_CONTACT_|PRIMARY_PHOTO_)/.test(m))return json(400,m);if(['EVENT_NOT_EDITABLE','EVENT_NOT_PAYABLE'].includes(m))return json(409,m);return json(503,'EVENT_UNAVAILABLE')}
}
