import {createBusinessStore} from './business';
type Database=Parameters<typeof createBusinessStore>[0];
export async function radarAccountData(db:Database,account:string,env:Record<string,string|undefined>){
 if(!['RADAR_ENABLED','RADAR_OWNERSHIP_ENABLED','RADAR_BUSINESS_DETAILS_ENABLED'].every(key=>env[key]==='true'))return null;
 try{return {available:true,items:await createBusinessStore(db,env.RADAR_REGISTRATION_PROFILES_ENABLED==='true').mine(account)};}
 catch{return {available:false,items:[]};} // Radar must not take the existing account panel offline.
}
export const radarAccountSection='<section id="radarAccountSection" class="card hidden"><h2>Mis establecimientos en Radar</h2><p>Registrar un establecimiento no concede titularidad. Las solicitudes pendientes no permiten administrarlo.</p><div id="radarAccountItems" aria-live="polite"></div></section>';
export function renderRadarAccount(data:any,doc:any=document){
 const section=doc.getElementById('radarAccountSection'),out=doc.getElementById('radarAccountItems');if(!section||!out)return;
 out.replaceChildren();section.classList.toggle('hidden',!data);if(!data)return;
 const text=(tag:string,value:string)=>{const node=doc.createElement(tag);node.textContent=value;return node;};
 if(data.available!==true){out.append(text('p','No pudimos cargar tus establecimientos de Radar. Recarga la página para reintentar.'));return;}
 const items=Array.isArray(data.items)?data.items:[];
 if(!items.length){out.append(text('p','Todavía no tienes establecimientos vinculados ni solicitudes pendientes en Radar.'));return;}
 for(const item of items){
  const row=doc.createElement('article');row.className='row';
  row.append(text('h3',String(item.name||'Establecimiento')),text('p',String(item.category||'')+' · '+String(item.country||'')),text('p',item.authorized===true?'Administración autorizada':item.requested===true?'Solicitud pendiente · Sin permisos de administración':'Comercio declarado · Sin permisos de administración'));
  out.append(row);
 }
}
export const radarAccountScript=renderRadarAccount.toString();
