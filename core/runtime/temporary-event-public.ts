import {temporaryEventShareMeta,type TemporaryEventShare} from './temporary-event-share';

export type PublicTemporaryEvent=TemporaryEventShare & {
 slug:string; eventType:string; region:string; municipality:string; locality?:string;
 reference:string; startDate:string; endDate:string; latitude:number; longitude:number;
 publicContactName:string; publicContactPhone:string|null; photos:string[];
};
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const safeImage=(s:string)=>{const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password)throw Error('INVALID_EVENT_IMAGE');return esc(u.href);};
export function temporaryEventPublicHtml(event:PublicTemporaryEvent):string {
 if(!event.photos.length||event.photos.length>3)throw Error('INVALID_EVENT_PHOTOS');
 if(!Number.isFinite(event.latitude)||!Number.isFinite(event.longitude)||Math.abs(event.latitude)>90||Math.abs(event.longitude)>180)throw Error('INVALID_COORDINATES');
 const maps='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(event.latitude+','+event.longitude);
 const phone=event.publicContactPhone?.replace(/[^0-9+]/g,'')??'';
 const contact=phone?'<a href="tel:'+esc(phone)+'">Llamar</a> <a href="https://wa.me/'+encodeURIComponent(phone.replace(/\D/g,''))+'">WhatsApp</a>':'';
 const gallery=event.photos.map((src,i)=>'<img src="'+safeImage(src)+'" alt="Fotografía '+(i+1)+' del evento" loading="'+(i===0?'eager':'lazy')+'">').join('');
 return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(event.name)+'</title>'+temporaryEventShareMeta(event)+'<style>body{margin:0;background:#f5f7fb;color:#15253c;font:16px system-ui,sans-serif}.card{max-width:680px;margin:32px auto;padding:24px;background:white;border-radius:20px;box-shadow:0 10px 32px #142c461a}h1{overflow-wrap:anywhere}.photos{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory}.photos img{width:100%;flex:0 0 100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;scroll-snap-align:center}a{display:inline-block;padding:12px;margin:6px 6px 6px 0;border-radius:10px;background:#103b78;color:white;text-decoration:none}@media(max-width:720px){.card{margin:0;padding:16px;border-radius:0}}</style></head><body><main class="card"><small>Dirección Temporal · '+esc(event.eventType)+'</small><h1>'+esc(event.name)+'</h1><div class="photos">'+gallery+'</div><p>'+esc(event.description)+'</p><p><strong>Fechas:</strong> '+esc(event.startDate)+' al '+esc(event.endDate)+'</p><p><strong>Ubicación:</strong> '+esc([event.region,event.municipality,event.locality,event.reference].filter(Boolean).join(', '))+'</p><p><strong>Contacto:</strong> '+esc(event.publicContactName)+'</p><a href="'+esc(maps)+'" rel="noopener noreferrer">Cómo llegar</a>'+contact+'<button type="button" onclick="navigator.share?navigator.share({title:document.title,url:location.href}):navigator.clipboard.writeText(location.href)">Compartir</button></main></body></html>';
}
