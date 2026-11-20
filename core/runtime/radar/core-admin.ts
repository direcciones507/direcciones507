import type {CoreAuth} from './auth';
import {createBusinessRoutes,createBusinessStore} from './business';
import {createModerationRoutes} from './moderation';
import {createModerationStore} from './moderation-repository';
type Database=Parameters<typeof createBusinessStore>[0];
const origin='https://direcciones.lat';
export function coreRadarAdminEnabled(env:Record<string,string|undefined>){
 return ['RADAR_ENABLED','RADAR_OWNERSHIP_ENABLED','RADAR_BUSINESS_DETAILS_ENABLED','RADAR_CORE_ADMIN_ENABLED'].every(key=>env[key]==='true');
}
// Adapt existing stores and CORE identity. No second administration or session.
export function createCoreRadarAdmin(db:Database,auth:CoreAuth,env:Record<string,string|undefined>){
 const enabled=coreRadarAdminEnabled(env),origins=new Set([origin]);
 const moderation=createModerationRoutes(createModerationStore(db),auth,origins,enabled);
 const business=createBusinessRoutes(createBusinessStore(db),auth,origins,enabled);
 const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
 return async(req:Request):Promise<Response|null>=>{
  const url=new URL(req.url),admin=url.pathname==='/v1/admin/radar',verification=url.pathname==='/v1/user/radar/verification';
  if(!admin&&!verification)return null;
  if(url.hostname!=='direcciones.lat'||url.username||url.password||
   !(url.protocol==='https:'&&(!url.port||url.port==='443')||url.protocol==='http:'&&(!url.port||url.port==='8080')&&req.headers.get('x-forwarded-proto')==='https'))return json(403,{error:'FORBIDDEN'});
  if(!enabled)return json(503,{error:'RADAR_ADMIN_DISABLED'});
  if(req.method!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
  if(req.headers.get('origin')!==origin)return json(403,{error:'FORBIDDEN'});
  const user=await auth.currentUser(req);
  if(!user||admin&&!user.roles.includes('ADMIN'))return json(403,{error:'FORBIDDEN'});
  let body:any;
  try{const raw=await req.text();if(raw.length>2048)return json(413,{error:'BODY_TOO_LARGE'});body=JSON.parse(raw);}catch{return json(400,{error:'INVALID_BODY'});}
  try{
   if(admin&&body?.action==='overview'){
    const requests=await db.unsafe(`SELECT r.establishment_id AS id,r.account_ref::text AS "accountRef",r.reason,
     e.name,e.country,COALESCE(NULLIF(u.display_name,''),'Cuenta sin nombre') AS "accountName"
     FROM radar.ownership_requests r JOIN radar.establishments e ON e.id=r.establishment_id
     JOIN ad507.users u ON u.id=r.account_ref WHERE e.published
     AND NOT EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id)
     ORDER BY r.created_at,r.establishment_id,r.account_ref LIMIT 100`,[]);
    const owners=await db.unsafe(`SELECT o.establishment_id AS id,o.account_ref::text AS "accountRef",e.name,e.country,
     COALESCE(NULLIF(u.display_name,''),'Cuenta sin nombre') AS "accountName"
     FROM radar.verified_owners o JOIN radar.establishments e ON e.id=o.establishment_id
     JOIN ad507.users u ON u.id=o.account_ref ORDER BY o.verified_at DESC,o.establishment_id LIMIT 100`,[]);
    const pending=await createModerationStore(db).pending(100);
    return json(200,{requests,owners,pending});
   }
   // Limit actions here; the old protected endpoints remain until migration of UI is verified.
   if(verification&&body?.action!=='claim'||admin&&!['verify_owner','revoke_owner','publish'].includes(body?.action))return json(400,{error:'INVALID_ACTION'});
   const target=new URL(admin?'/v1/radar/admin/moderation':'/v1/radar/business',origin);
   // Internal fixed-path adapter retains authenticated request headers and body.
   const adapted=new Request(target,{method:'POST',headers:req.headers,body:JSON.stringify(body)});
   const result=admin?await moderation(adapted):await business(adapted);
   return result??json(404,{error:'NOT_FOUND'});
  }catch{return json(503,{error:'RADAR_ADMIN_UNAVAILABLE'});}
 };
}

export function installCoreRadarAdmin(doc:any=document,send:any=(body:unknown)=>fetch('/v1/admin/radar',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)})){
 const tile=doc.getElementById('radarTile'),view=doc.getElementById('radarView'),out=doc.getElementById('radarAdminRows');if(!tile||!view||!out)return;
 const text=(tag:string,value:string)=>{const n=doc.createElement(tag);n.textContent=value;return n;};
 const load=async()=>{
  view.classList.remove('hidden');out.replaceChildren(text('p','Cargando Radar…'));
  try{
   const response=await send({action:'overview'});if(!response.ok)throw Error();const data=await response.json();out.replaceChildren();
   for(const [key,title] of [['requests','Verificación voluntaria pendiente'],['owners','Titularidad autorizada'],['pending','Publicaciones pendientes anteriores']]){
    out.append(text('h3',title));const items=Array.isArray(data[key])?data[key]:[];
    if(!items.length)out.append(text('p','Sin registros en esta lista.'));
    for(const item of items){
     const row=doc.createElement('article');row.className='tile';
     row.append(text('h4',String(item.name||'Establecimiento')),text('p',String(item.country||'')+(item.accountName?' · '+String(item.accountName):'')));
     if(item.reason)row.append(text('p',String(item.reason)));
     let checked:any;
     if(key==='requests'){
      const label=doc.createElement('label');checked=doc.createElement('input');checked.type='checkbox';
      label.append(checked,text('span',' Revisé la evidencia privada y confirmé la titularidad.'));row.append(label);
     }
     const button=doc.createElement('button');button.type='button';button.className='btn';
     button.textContent=key==='requests'?'Aprobar titularidad':key==='owners'?'Revocar titularidad':'Publicar pendiente anterior';
     button.disabled=key==='requests';if(checked)checked.onchange=()=>{button.disabled=!checked.checked;};
     const status=text('p','');status.setAttribute('role','status');
     // Explicit second click confirms the specific named operation.
     let confirming=false;
     button.onclick=async()=>{
      if(checked&&!checked.checked)return;
      if(!confirming){confirming=true;button.textContent='Confirmar: '+String(item.name||'Establecimiento');return;}
      button.disabled=true;
      try{const result=await send({action:key==='requests'?'verify_owner':key==='owners'?'revoke_owner':'publish',id:item.id,accountRef:item.accountRef,...(checked?{evidenceReviewed:true}:{})});if(!result.ok)throw Error();await load();}
      catch{confirming=false;button.textContent='Reintentar';button.disabled=checked?!checked.checked:false;status.textContent='No se completó la operación. Recarga la lista antes de reintentar.';}
     };
     row.append(button,status);out.append(row);
    }
   }
  }catch{out.replaceChildren(text('p','No pudimos cargar Radar. Pulsa Radar para reintentar.'));}
 };
 tile.onclick=load;doc.getElementById('radarClose').onclick=()=>view.classList.add('hidden');
}
export function withCoreRadarAdmin(html:string,env:Record<string,string|undefined>){
 if(!coreRadarAdminEnabled(env))return html;
 return html.replace('<button id="statsTile"','<button id="radarTile" class="tile action"><b>Radar</b><span class="muted">Establecimientos y verificación voluntaria</span></button><button id="statsTile"')
  .replace('</main>','<section id="radarView" class="card list hidden"><div class="listhead"><h2>Radar</h2><button type="button" id="radarClose" class="btn">Cerrar</button></div><p>La verificación es manual e independiente de pagos. No publicar videos ni documentos de comprobación. Listas limitadas a 100 registros por sección.</p><div id="radarAdminRows" class="rows" aria-live="polite"></div></section></main>')
  .replace('</body>','<script>('+installCoreRadarAdmin.toString()+')();</script></body>');
}
