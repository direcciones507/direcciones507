import {readRadarJson} from "./request-body";
import type {CoreAuth} from './auth';
import {createBusinessRoutes,createBusinessStore} from './business';
import {createModerationRoutes} from './moderation';
import {createModerationStore} from './moderation-repository';
import {createCategoryStore} from './category-catalog';
import {createCommercialManagement} from './commercial-management';
type Database=Parameters<typeof createBusinessStore>[0];
const origin='https://direcciones.lat';
export function coreRadarAdminEnabled(env:Record<string,string|undefined>){
 return ['RADAR_ENABLED','RADAR_OWNERSHIP_ENABLED','RADAR_BUSINESS_DETAILS_ENABLED','RADAR_CORE_ADMIN_ENABLED'].every(key=>env[key]==='true');
}
// Adapt existing stores and CORE identity. No second administration or session.
export function createCoreRadarAdmin(db:Database,auth:CoreAuth,env:Record<string,string|undefined>){
 const enabled=coreRadarAdminEnabled(env),origins=new Set([origin]);
 const moderation=createModerationRoutes(createModerationStore(db,true),auth,origins,enabled);
 const business=createBusinessRoutes(createBusinessStore(db),auth,origins,enabled);
 const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
 return async(req:Request):Promise<Response|null>=>{
  const url=new URL(req.url),admin=url.pathname==='/v1/admin/radar',verification=url.pathname==='/v1/user/radar/verification',management=url.pathname==='/v1/user/radar/business';
  if(!admin&&!verification&&!management)return null;
  if(url.hostname!=='direcciones.lat'||url.username||url.password||
   !(url.protocol==='https:'&&(!url.port||url.port==='443')||url.protocol==='http:'&&(!url.port||url.port==='8080')&&req.headers.get('x-forwarded-proto')==='https'))return json(403,{error:'FORBIDDEN'});
  if(!enabled)return json(503,{error:'RADAR_ADMIN_DISABLED'});
  if(req.method!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
  if(req.headers.get('origin')!==origin)return json(403,{error:'FORBIDDEN'});
  const user=await auth.currentUser(req);
  if(!user||admin&&!user.roles.includes('ADMIN'))return json(403,{error:'FORBIDDEN'});
  const parsed=await readRadarJson(req,(management?8192:2048));if(!parsed.ok)return json(parsed.status,{error:parsed.error});
  const body=parsed.body as any;
  try{
   if(admin&&['categories_list','categories_save'].includes(body?.action)){
    if(env.RADAR_CATEGORY_CATALOG_ENABLED!=='true')return json(503,{error:'CATEGORY_CATALOG_DISABLED'});
    const store=createCategoryStore(db);
    if(body.action==='categories_list')return json(200,await store.list());
    return await store.save(user.id,body.entry)?json(200,{ok:true}):json(400,{error:'INVALID_CATEGORY'});
   }
   if(management){
    if(env.RADAR_REGISTRATION_PROFILES_ENABLED!=='true')return json(503,{error:'PROFILE_MANAGEMENT_DISABLED'});
    if(!body||!['inspect','update'].includes(body.action)||typeof body.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id))return json(400,{error:'INVALID_ACTION'});
    const store=createCommercialManagement(db,env.RADAR_CATEGORY_CATALOG_ENABLED==="true"?createCategoryStore(db):undefined);
    if(body.action==='inspect'){const item=await store.inspect(body.id,user.id);return item?json(200,{item}):json(403,{error:'OWNER_REQUIRED'});}
    const result=await store.update(body.id,user.id,body.profile,body.availability);
    return result==='UPDATED'?json(200,{ok:true}):json(result==='INVALID_PROFILE'?400:403,{error:result});
   }
   if(admin&&body?.action==='overview'){
    const offset=body.offset??0,q=body.q??'';
    if(!Number.isInteger(offset)||offset<0||offset>100000||typeof q!=='string'||q.length>100)return json(400,{error:'INVALID_QUERY'});
    const filter=" AND strpos(lower(e.name),lower($1::text))>0";
    const requests=await db.unsafe(`SELECT r.establishment_id AS id,r.account_ref::text AS "accountRef",r.reason,
     e.name,e.country,COALESCE(NULLIF(u.display_name,''),'Cuenta sin nombre') AS "accountName"
     FROM radar.ownership_requests r JOIN radar.establishments e ON e.id=r.establishment_id
     JOIN ad507.users u ON u.id=r.account_ref WHERE e.published
     AND NOT EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id)
     ${filter} ORDER BY r.created_at,r.establishment_id,r.account_ref LIMIT 100 OFFSET $2`,[q,offset]);
    const owners=await db.unsafe(`SELECT o.establishment_id AS id,o.account_ref::text AS "accountRef",e.name,e.country,
     COALESCE(NULLIF(u.display_name,''),'Cuenta sin nombre') AS "accountName"
     FROM radar.verified_owners o JOIN radar.establishments e ON e.id=o.establishment_id
     JOIN ad507.users u ON u.id=o.account_ref WHERE true ${filter} ORDER BY o.verified_at DESC,o.establishment_id LIMIT 100 OFFSET $2`,[q,offset]);
    const pending=await db.unsafe(`SELECT e.id,e.name,e.category,e.country FROM radar.establishments e WHERE NOT e.published ${filter} ORDER BY e.created_at,e.id LIMIT 100 OFFSET $2`,[q,offset]);
    const establishments=await db.unsafe(`SELECT e.id,e.name,e.country FROM radar.establishments e WHERE e.published ${filter} ORDER BY e.created_at,e.id LIMIT 100 OFFSET $2`,[q,offset]);
    return json(200,{requests,owners,pending,establishments,offset,hasMore:[requests,owners,pending,establishments].some(rows=>rows.length===100)});
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
 let offset=0,query='';
 const load=async()=>{
  view.classList.remove('hidden');out.replaceChildren(text('p','Cargando Radar…'));
  try{
   const response=await send({action:'overview',offset,q:query});if(!response.ok)throw Error();const data=await response.json();out.replaceChildren();
   for(const [key,title] of [['requests','Verificación voluntaria pendiente'],['owners','Titularidad autorizada'],['pending','Publicaciones pendientes anteriores'],['establishments','Establecimientos publicados']]){
    out.append(text('h3',title));const items=Array.isArray(data[key])?data[key]:[];
    if(!items.length)out.append(text('p','Sin registros en esta lista.'));
    for(const item of items){
     const row=doc.createElement('article');row.className='tile';
     row.append(text('h4',String(item.name||'Establecimiento')),text('p',String(item.country||'')+(item.accountName?' · '+String(item.accountName):'')));
     if(item.reason)row.append(text('p',String(item.reason)));
     if(key==='establishments'){out.append(row);continue;}
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
   const previous=doc.createElement('button');previous.type='button';previous.className='btn';previous.textContent='Anterior';previous.disabled=offset===0;previous.onclick=()=>{offset=Math.max(0,offset-100);load();};
   const next=doc.createElement('button');next.type='button';next.className='btn';next.textContent='Siguiente';next.disabled=!data.hasMore;next.onclick=()=>{offset+=100;load();};out.append(previous,next);
  }catch{out.replaceChildren(text('p','No pudimos cargar Radar. Pulsa Radar para reintentar.'));}
 };
 const categoryButton=doc.getElementById('radarCategoryButton'),categoryRows=doc.getElementById('radarCategoryRows');
 if(categoryButton&&categoryRows){
  const loadCategories=async()=>{
   categoryRows.replaceChildren(text('p','Cargando categorías…'));
   try{
    const response=await send({action:'categories_list'});if(!response.ok)throw Error();const data=await response.json();
    if(!Array.isArray(data.groups)||!Array.isArray(data.categories))throw Error();
    categoryRows.replaceChildren(text('h3','Categorías Radar'));
    const editor=(kind:string,item:any={})=>{
     const form=doc.createElement('form');form.className='tile';
     const fields:Record<string,any>={};
     const field=(key:string,label:string,val:any,choices?:any[])=>{
      const l=text('label',label),n=doc.createElement(choices?'select':'input');n.name=key;
      if(choices)for(const [id,title] of choices){const o=text('option',title);o.value=id;n.append(o);}
      n.value=String(val??'');l.append(n);form.append(l);fields[key]=n;return n;
     };
     const id=field('id','Código estable',item.id);id.required=true;id.maxLength=64;id.pattern='[a-z][a-z0-9-]{0,63}';id.readOnly=Boolean(item.id);
     const label=field('label','Nombre',item.label);label.required=true;label.maxLength=100;
     const order=field('sortOrder','Orden',item.sortOrder??0);order.type='number';order.min='0';order.max='10000';order.step='1';order.required=true;
     field('active','Estado',String(item.active??true),[['true','Activa'],['false','Inactiva']]);
     if(kind==='group'){const icon=field('icon','Icono',item.icon??'layers');icon.required=true;icon.maxLength=64;icon.pattern='[a-z][a-z0-9-]{0,63}';}
     else{field('groupId','Grupo',item.groupId??data.groups[0]?.id??'',data.groups.map((g:any)=>[g.id,g.label]));field('capacityUnit','Capacidad',item.capacityUnit??'units',[['tables','Mesas'],['rooms','Habitaciones'],['places','Cupos'],['units','Unidades']]);}
     const save=text('button','Guardar');save.type='submit';save.className='btn';const status=text('p','');status.setAttribute('role','status');form.append(save,status);
     form.onsubmit=async(e:any)=>{e.preventDefault();if(!form.reportValidity())return;save.disabled=true;
      try{const entry:any={kind,id:id.value.trim(),label:label.value.trim(),sortOrder:Number(order.value),active:fields.active.value==='true'};
       if(kind==='group')entry.icon=fields.icon.value.trim();else{entry.groupId=fields.groupId.value;entry.capacityUnit=fields.capacityUnit.value;}
       const result=await send({action:'categories_save',entry});if(!result.ok)throw Error();await loadCategories();
      }catch{status.textContent='No se guardó. Revisa los datos y vuelve a consultar.';save.disabled=false;}
     };return form;
    };
    const addGroup=text('button','Nueva categoría principal');addGroup.type='button';addGroup.onclick=()=>{addGroup.disabled=true;categoryRows.append(editor('group'));};categoryRows.append(addGroup);
    if(data.groups.length){const addCategory=text('button','Nueva subcategoría');addCategory.type='button';addCategory.onclick=()=>{addCategory.disabled=true;categoryRows.append(editor('category'));};categoryRows.append(addCategory);}
    for(const group of data.groups){const section=doc.createElement('details');section.append(text('summary',group.label+(group.active?'':' · Inactiva')),editor('group',group));for(const item of data.categories.filter((c:any)=>c.groupId===group.id)){const detail=doc.createElement('details');detail.append(text('summary',item.label+(item.active?'':' · Inactiva')),editor('category',item));section.append(detail);}categoryRows.append(section);}
   }catch{categoryRows.replaceChildren(text('p','El catálogo no está disponible. No se modificaron datos.'));}
  };
  categoryButton.onclick=()=>{categoryRows.hidden=!categoryRows.hidden;if(!categoryRows.hidden)return loadCategories();};
 }
 const search=doc.getElementById('radarAdminSearch'),filter=doc.getElementById('radarAdminFilter');
 if(filter)filter.onclick=()=>{query=search.value.trim();offset=0;load();};
 tile.onclick=()=>{offset=0;return load();};doc.getElementById('radarClose').onclick=()=>view.classList.add('hidden');
}
export function withCoreRadarAdmin(html:string,env:Record<string,string|undefined>){
 if(!coreRadarAdminEnabled(env))return html;
 const categoryMarkup=env.RADAR_CATEGORY_CATALOG_ENABLED==='true'?'<button type="button" id="radarCategoryButton" class="btn">Categorías Radar</button><div id="radarCategoryRows" hidden aria-live="polite"></div>':'';
 return html.replace('<button id="statsTile"','<button id="radarTile" class="tile action"><b>Radar</b><span class="muted">Establecimientos y verificación voluntaria</span></button><button id="statsTile"')
  .replace('</main>','<section id="radarView" class="card list hidden"><div class="listhead"><h2>Radar</h2><button type="button" id="radarClose" class="btn">Cerrar</button></div><p>La verificación es manual e independiente de pagos. No publicar videos ni documentos de comprobación. Listas limitadas a 100 registros por sección.</p>'+categoryMarkup+'<label>Buscar establecimiento<input id="radarAdminSearch" type="search" maxlength="100"></label><button type="button" id="radarAdminFilter" class="btn">Buscar</button><div id="radarAdminRows" class="rows" aria-live="polite"></div></section></main>')
  .replace('</body>','<script>('+installCoreRadarAdmin.toString()+')();</script></body>');
}
