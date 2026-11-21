import {createBusinessStore} from './business';
import {openCommercialEditor} from './commercial-editor';
type Database=Parameters<typeof createBusinessStore>[0];
export async function radarAccountData(db:Database,account:string,env:Record<string,string|undefined>){
 if(!['RADAR_ENABLED','RADAR_OWNERSHIP_ENABLED','RADAR_BUSINESS_DETAILS_ENABLED'].every(key=>env[key]==='true'))return null;
 try{return {available:true,items:await createBusinessStore(db,env.RADAR_REGISTRATION_PROFILES_ENABLED==='true').mine(account),...(env.RADAR_CORE_ADMIN_ENABLED==='true'?{verificationAvailable:true,...(env.RADAR_REGISTRATION_PROFILES_ENABLED==='true'?{managementAvailable:true}:{})}:{})};}
 catch{return {available:false,items:[]};} // Radar must not take the existing account panel offline.
}
export const radarAccountSection='<section id="radarAccountSection" class="card hidden"><h2>Mis establecimientos en Radar</h2><p><a href="https://radar.direcciones.lat/">Volver a Radar</a></p><p>Registrar un establecimiento no concede titularidad. Las solicitudes pendientes no permiten administrarlo.</p><div id="radarAccountItems" aria-live="polite"></div></section>';
export function renderRadarAccount(data:any,doc:any=document,send:any=(body:unknown)=>fetch('/v1/user/radar/verification',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)})){
 const section=doc.getElementById('radarAccountSection'),out=doc.getElementById('radarAccountItems');if(!section||!out)return;
 out.replaceChildren();section.classList.toggle('hidden',!data);if(!data)return;
 // The panel section is initially hidden; scroll after the asynchronous account load.
 if(doc.defaultView?.location.hash==='#radarAccountSection'&&typeof doc.defaultView.requestAnimationFrame==='function')doc.defaultView.requestAnimationFrame(()=>section.scrollIntoView({block:'start'}));
 const text=(tag:string,value:string)=>{const node=doc.createElement(tag);node.textContent=value;return node;};
 if(data.available!==true){out.append(text('p','No pudimos cargar tus establecimientos de Radar. Recarga la página para reintentar.'));return;}
 const items=Array.isArray(data.items)?data.items:[];
 if(!items.length){out.append(text('p','Todavía no tienes establecimientos vinculados ni solicitudes pendientes en Radar.'));return;}
 for(const item of items){
  const row=doc.createElement('article');row.className='row';
  row.append(text('h3',String(item.name||'Establecimiento')),text('p',String(item.category||'')+' · '+String(item.country||'')),text('p',item.authorized===true?'Administración autorizada':item.requested===true?'Solicitud pendiente · Sin permisos de administración':item.declared===true?'Comercio declarado · Sin permisos de administración':item.submitted===true?'Agregado como usuario · Sin permisos de administración':'Vinculado a tu cuenta · Sin permisos de administración'));
  if(data.managementAvailable===true&&item.authorized===true){
   const edit=doc.createElement('button');edit.type='button';edit.textContent='Editar ficha comercial';
   edit.onclick=async()=>{edit.disabled=true;await openCommercialEditor(row,item.id,doc,undefined,()=>{edit.disabled=false;});};row.append(edit);
   // A verified owner may update availability without opening the full profile editor.
   const quick=doc.createElement('button');quick.type='button';quick.textContent='Actualizar disponibilidad ahora';
   const panel=doc.createElement('div'),status=text('p','');status.setAttribute('role','status');panel.hidden=true;
   const sendAvailability=async(body:any)=>fetch('/v1/user/radar/business',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
   quick.onclick=async()=>{
    if(!panel.hidden){panel.hidden=true;return;}
    quick.disabled=true;status.textContent='Cargando disponibilidad…';panel.replaceChildren();
    try{
     const response=await sendAvailability({action:'inspect',id:item.id});if(!response.ok)throw Error();
     const data=(await response.json()).item;if(!data||typeof data!=='object')throw Error();
     const names:any={tables:'mesas',rooms:'habitaciones',places:'cupos',units:'unidades'};
     const type=names[data.unit]||names[data.configuredUnit]||names.units;
     const capacity=data.profile?.capacity?.total;
     const form=doc.createElement('form');form.style.cssText='display:flex;flex-wrap:wrap;align-items:end;gap:10px;width:100%';
     const label=text('label','Cantidad disponible ahora ('+type+')');const number=doc.createElement('input');number.type='number';number.inputMode='numeric';number.min='0';number.max=String(Number.isInteger(capacity)?Math.min(capacity,100000):100000);number.step='1';number.required=true;number.style.cssText='display:block;width:min(240px,100%);max-width:100%';
     if(Number.isInteger(data.quantity))number.value=String(data.quantity);label.append(number);
     const save=text('button','Guardar disponibilidad');save.type='submit';
     const clear=text('button','Ocultar cantidad');clear.type='button';
     form.append(label,save,clear);panel.replaceChildren(form,status);panel.hidden=false;status.textContent=Number.isInteger(capacity)?'Capacidad habitual: '+capacity+' '+type+'.':'Indica la cantidad disponible en este momento.';
     const submit=async(quantity:number|null)=>{
      save.disabled=clear.disabled=true;status.textContent='Actualizando…';
      try{const result=await sendAvailability({action:'availability',id:item.id,quantity});if(!result.ok)throw Error();number.value=quantity===null?'':String(quantity);status.textContent=quantity===null?'Disponibilidad oculta.':'Disponibilidad actualizada en Radar.';}
      catch{status.textContent='No se pudo actualizar. Comprueba tus permisos y vuelve a intentar.';}
      finally{save.disabled=clear.disabled=false;}
     };
     form.onsubmit=e=>{e.preventDefault();if(form.reportValidity())void submit(Number(number.value));};clear.onclick=()=>void submit(null);
    }catch{status.textContent='No se pudo consultar la ficha. Actualiza la página y comprueba tu titularidad.';panel.hidden=false;}
    finally{quick.disabled=false;}
   };
   row.append(quick,panel);
  }
  if(item.authorized!==true&&item.declared===true)row.append(text('p','Puedes consultar tu comercio aquí. La edición de la ficha, horarios y capacidad (mesas, habitaciones o cupos) está reservada actualmente a propietarios autorizados.'));
  if(data.verificationAvailable===true&&item.declared===true&&item.authorized!==true){
   row.append(text('p','Verificación voluntaria gratuita e independiente de pagos. Tras solicitarla, contacta a Direcciones por WhatsApp para coordinar un video continuo de fachada, letrero, aviso de operaciones e interior. No muestres cédulas ni datos tributarios en el video. La revisión es manual y puede tardar 48–72 horas.'));
   const contact=doc.createElement('a');contact.href='https://wa.me/50765996532?text='+encodeURIComponent('Hola, Direcciones. Solicité la verificación de mi establecimiento en Radar: '+String(item.name||'Establecimiento')+'. Quisiera coordinar el envío del video de evidencia.');contact.target='_blank';contact.rel='noopener noreferrer';contact.textContent='Contactar a Direcciones por WhatsApp (+507 6599-6532)';contact.hidden=item.requested!==true;row.append(contact);
   if(item.requested!==true){
    const button=doc.createElement('button');button.type='button';button.textContent='Solicitar verificación';
    const status=text('p','');status.setAttribute('role','status');
    button.onclick=async()=>{
     button.disabled=true;
     try{const result=await send({action:'claim',id:item.id,reason:'Solicito verificación voluntaria; aportaré evidencia privada por los canales oficiales de soporte.'});if(!result.ok)throw Error();status.textContent='Solicitud registrada. Contacta a Direcciones por WhatsApp para coordinar la evidencia. Todavía no concede titularidad.';contact.hidden=false;button.hidden=true;}
     catch{button.disabled=false;status.textContent='No se pudo registrar la solicitud. Actualiza tu panel antes de reintentar.';}
    };
    row.append(button,status);
   }
  }
  out.append(row);
 }
}
export const radarAccountScript=openCommercialEditor.toString()+';'+renderRadarAccount.toString();
