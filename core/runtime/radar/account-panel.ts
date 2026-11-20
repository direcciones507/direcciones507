import {createBusinessStore} from './business';
type Database=Parameters<typeof createBusinessStore>[0];
export async function radarAccountData(db:Database,account:string,env:Record<string,string|undefined>){
 if(!['RADAR_ENABLED','RADAR_OWNERSHIP_ENABLED','RADAR_BUSINESS_DETAILS_ENABLED'].every(key=>env[key]==='true'))return null;
 try{return {available:true,items:await createBusinessStore(db,env.RADAR_REGISTRATION_PROFILES_ENABLED==='true').mine(account),...(env.RADAR_CORE_ADMIN_ENABLED==='true'?{verificationAvailable:true}:{})};}
 catch{return {available:false,items:[]};} // Radar must not take the existing account panel offline.
}
export const radarAccountSection='<section id="radarAccountSection" class="card hidden"><h2>Mis establecimientos en Radar</h2><p>Registrar un establecimiento no concede titularidad. Las solicitudes pendientes no permiten administrarlo.</p><div id="radarAccountItems" aria-live="polite"></div></section>';
export function renderRadarAccount(data:any,doc:any=document,send:any=(body:unknown)=>fetch('/v1/user/radar/verification',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)})){
 const section=doc.getElementById('radarAccountSection'),out=doc.getElementById('radarAccountItems');if(!section||!out)return;
 out.replaceChildren();section.classList.toggle('hidden',!data);if(!data)return;
 const text=(tag:string,value:string)=>{const node=doc.createElement(tag);node.textContent=value;return node;};
 if(data.available!==true){out.append(text('p','No pudimos cargar tus establecimientos de Radar. Recarga la página para reintentar.'));return;}
 const items=Array.isArray(data.items)?data.items:[];
 if(!items.length){out.append(text('p','Todavía no tienes establecimientos vinculados ni solicitudes pendientes en Radar.'));return;}
 for(const item of items){
  const row=doc.createElement('article');row.className='row';
  row.append(text('h3',String(item.name||'Establecimiento')),text('p',String(item.category||'')+' · '+String(item.country||'')),text('p',item.authorized===true?'Administración autorizada':item.requested===true?'Solicitud pendiente · Sin permisos de administración':'Comercio declarado · Sin permisos de administración'));
  if(data.verificationAvailable===true&&item.declared===true&&item.authorized!==true&&item.requested!==true){
   row.append(text('p','Verificación voluntaria gratuita e independiente de pagos. Contacta soporte por los canales oficiales para aportar un video continuo de fachada, letrero, aviso de operaciones e interior. No muestres tu cédula. La evidencia es privada; revisión manual de 48–72 horas.'));
   const button=doc.createElement('button');button.type='button';button.textContent='Solicitar verificación';
   const status=text('p','');status.setAttribute('role','status');
   button.onclick=async()=>{
    button.disabled=true;
    try{const result=await send({action:'claim',id:item.id,reason:'Solicito verificación voluntaria; aportaré evidencia privada por los canales oficiales de soporte.'});if(!result.ok)throw Error();status.textContent='Solicitud registrada. Coordina el envío privado de evidencia con soporte. Todavía no concede titularidad.';}
    catch{button.disabled=false;status.textContent='No se pudo registrar la solicitud. Actualiza tu panel antes de reintentar.';}
   };
   row.append(button,status);
  }
  out.append(row);
 }
}
export const radarAccountScript=renderRadarAccount.toString();
