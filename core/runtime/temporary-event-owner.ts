import QRCode from 'qrcode';
import type {Sql} from 'postgres';
import {createTemporaryEventRepository,dbDate} from './temporary-event-repository';
import {renderTemporaryEventPage} from './temporary-event-page';
import type {createTemporaryEventMedia} from './temporary-event-media';
import type {createTemporaryEventPayment} from './temporary-event-payment';
export type EventServices={media?:ReturnType<typeof createTemporaryEventMedia>|null;payment?:ReturnType<typeof createTemporaryEventPayment>|null};
export async function eventOwnerRoute(req:Request,sql:Sql,userId:string,services:EventServices):Promise<Response>{
 const url=new URL(req.url),match=url.pathname.match(/^\/v1\/user\/temporary-events\/([a-f0-9-]{36})(?:\/(preview|photos|payment))?$/)!;
 const [,id,action]=match,repository=createTemporaryEventRepository(sql);
 const fail=(status:number,error:string)=>Response.json({ok:false,error},{status,headers:{'cache-control':'no-store'}});
 const event=await repository.getOwned(userId,id);if(!event)return fail(404,'EVENT_NOT_FOUND');
 const readJson=async()=>{const text=await req.text();if(text.length>24000)throw Error('INVALID_PAYLOAD_SIZE');return JSON.parse(text)};
 if(!action&&req.method==='GET')return Response.json({ok:true,event},{headers:{'cache-control':'no-store'}});
 if(!action&&req.method==='PUT')return Response.json({ok:true,...await repository.updateDraft(userId,id,await readJson())});
 if(action==='photos'&&req.method==='POST'){
  if(event.status!=='DRAFT')return fail(409,'EVENT_NOT_EDITABLE');
  if(!services.media)return fail(503,'R2_NOT_CONFIGURED');
  const reader=req.body?.getReader();if(!reader)return fail(400,'INVALID_IMAGE');
  let size=0;const parts:Uint8Array[]=[];
  try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>8*1024*1024+65536){await reader.cancel();return fail(413,'IMAGE_TOO_LARGE')}parts.push(next.value)}}finally{reader.releaseLock()}
  const data=await new Response(Buffer.concat(parts),{headers:{'content-type':req.headers.get('content-type')??''}}).formData();
  const file=data.get('photo'),slot=Number(data.get('slot'));
  if(!(file instanceof File)||!Number.isInteger(slot)||slot<1||slot>3)return fail(400,'INVALID_IMAGE');
  const stored=await services.media.upload(id,new Uint8Array(await file.arrayBuffer()),file.type);
  await repository.savePhoto(userId,id,slot,stored.key,stored.size);return Response.json({ok:true,slot});
 }
 if(action==='preview'&&req.method==='GET'){
  const photos=await repository.photos(id);
  if(url.searchParams.has('photo')){
   const p=photos.find(x=>String(x.slot)===url.searchParams.get('photo'));if(!p||!services.media)return fail(404,'PHOTO_NOT_FOUND');
   return new Response(await services.media.read(p.object_key),{headers:{'content-type':'image/webp','cache-control':'no-store','x-content-type-options':'nosniff'}});
  }
  const draft={title:event.title,description:event.description,responsibleName:'',responsibleEmail:'',responsiblePhone:'',countryCode:event.country_code,province:event.region,district:event.municipality,corregimiento:event.locality,reference:event.reference,latitude:event.latitude==null?null:Number(event.latitude),longitude:event.longitude==null?null:Number(event.longitude),startsOn:dbDate(event.starts_on),endsOn:dbDate(event.ends_on),timezone:event.event_timezone,hours:event.hours_description,publicContactConsent:event.public_contact_consent,publicContactName:event.public_contact_name,publicContactPhone:event.public_contact_phone};
  return new Response(renderTemporaryEventPage({draft,slug:event.slug,status:'ACTIVE',paymentConfirmedAt:null,preview:true,qrPngDataUrl:await QRCode.toDataURL('https://direcciones.lat/evento/'+event.slug,{width:640,margin:4}),photos:photos.map(p=>url.origin+url.pathname+'?photo='+p.slot)}),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','content-security-policy':"default-src 'self'; img-src 'self' https: data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
 }
 if(action==='payment'&&req.method==='POST'){
  if(!services.payment)return fail(503,'EVENT_PAYMENTS_DISABLED');
  const input=await readJson();return Response.json({ok:true,...await services.payment.initialize(userId,id,input.alias)});
 }
 return fail(405,'METHOD_NOT_ALLOWED');
}
