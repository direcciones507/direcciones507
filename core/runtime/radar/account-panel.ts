import {createBusinessStore} from './business';
import {commercialFieldsScript,openCommercialEditor} from './commercial-editor';
import {categoryRegistrationFields} from './ui/registration-form.js';
type Database=Parameters<typeof createBusinessStore>[0];
export async function radarAccountData(db:Database,account:string,env:Record<string,string|undefined>){
 if(!['RADAR_ENABLED','RADAR_OWNERSHIP_ENABLED','RADAR_BUSINESS_DETAILS_ENABLED'].every(key=>env[key]==='true'))return null;
 try{return {available:true,items:await createBusinessStore(db,env.RADAR_REGISTRATION_PROFILES_ENABLED==='true').mine(account),...(env.RADAR_CORE_ADMIN_ENABLED==='true'?{verificationAvailable:true,...(env.RADAR_REGISTRATION_PROFILES_ENABLED==='true'?{managementAvailable:true}:{})}:{})};}
 catch{return {available:false,items:[]};} // Radar must not take the existing account panel offline.
}
export const radarAccountSection='<style>#radarAccountSection{box-sizing:border-box;width:100%;max-width:none}#radarAccountSection.radar-owner-flat{background:transparent;border:0;box-shadow:none;padding:0}#radarAccountItems{min-width:0}#radarAccountItems .row{box-sizing:border-box;max-width:100%;padding:clamp(12px,3vw,20px);margin:12px 0}#radarAccountItems .row h3{margin:0 0 8px}#radarAccountItems .row p{margin:7px 0;line-height:1.4}#radarAccountItems button{display:block;width:100%;box-sizing:border-box;min-height:48px;margin:8px 0;padding:12px 14px;text-align:center;white-space:normal}#radarAccountItems .radar-owner-summary p{margin:5px 0}#radarAccountItems .radar-owner-summary{margin:10px 0}#radarAccountItems .radar-owner-editor,#radarAccountItems form{width:100%;box-sizing:border-box}#radarAccountItems form label{min-width:0;max-width:100%}#radarAccountItems form input[type=number]{width:100%!important;max-width:100%!important}#radarAccountItems a{overflow-wrap:anywhere}@media(max-width:600px){#radarAccountSection.radar-owner-flat{margin-inline:0}#radarAccountItems .row{padding:12px;margin:10px 0}}#radarAccountItems button{max-width:100%;min-height:44px;white-space:normal;margin:4px 6px 4px 0}#radarAccountItems form{min-width:0;max-width:100%}#radarAccountItems .radar-owner-editor label{display:block;margin-top:8px}#radarAccountItems .radar-owner-editor input,#radarAccountItems .radar-owner-editor textarea,#radarAccountItems .radar-owner-editor select{display:block;width:100%;min-width:0;min-height:44px;box-sizing:border-box}#radarAccountItems .radar-owner-schedule>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,135px),1fr));gap:0 10px}</style><section id="radarAccountSection" class="card radar-owner-flat hidden"><h2>Mis establecimientos en Radar</h2><p><a href="https://radar.direcciones.lat/">Volver a Radar</a></p><p>Si registraste tu comercio, puedes editar su ficha y disponibilidad. La verificación voluntaria solo concede el distintivo de negocio verificado.</p><div id="radarAccountItems" aria-live="polite"></div></section>';
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
  const row=doc.createElement('article');row.className='row';row.style.cssText='display:block;min-width:0;overflow-wrap:anywhere';
  row.append(text('h3',String(item.name||'Establecimiento')),text('p',String(item.category||'')+' · '+String(item.country||'')),text('p',item.authorized===true?'Administración autorizada':item.requested===true?'Verificación pendiente':item.declared===true?'Comercio registrado · Verificación opcional':item.submitted===true?'Agregado como usuario · Sin permisos de administración':'Vinculado a tu cuenta · Sin permisos de administración'));
  if(data.managementAvailable===true&&item.canManage===true){
   const summary=doc.createElement('div');summary.className='radar-owner-summary';
   const names:any={tables:'mesas',rooms:'habitaciones',places:'cupos',units:'unidades'};
   const display=()=>{
    const profile=item.profile||{},entries=[
     ['WhatsApp',profile.whatsapp],['Teléfono',profile.phone],
     ['Ubicación',[profile.locality,profile.province].filter(Boolean).join(', ')],
     ['Descripción',profile.description],['Redes y sitio web',profile.socials?.join(' · ')],
     ['Capacidad total',Number.isInteger(profile.capacity?.total)?profile.capacity.total+' '+names[profile.capacity.unit]:''],
     ['Disponibilidad ahora',Number.isInteger(item.quantity)?item.quantity+' '+names[item.unit]:'']
    ];
    const dayNames:any={monday:'Lunes',tuesday:'Martes',wednesday:'Miércoles',thursday:'Jueves',friday:'Viernes',saturday:'Sábado',sunday:'Domingo'};
    const hours=item.hours??profile.hours;
    if(hours)for(const [day,label] of Object.entries(dayNames))if(hours[day])entries.push([label,hours[day]==='closed'?'Cerrado':hours[day]]);
    const definitions=Object.hasOwn(categoryRegistrationFields,item.category)?categoryRegistrationFields[item.category]:categoryRegistrationFields.other;
    for(const [key,label] of definitions)entries.push([label,profile.extras?.[key]]);
    summary.replaceChildren();
    for(const [label,value] of entries)if(value)summary.append(text('p',label+': '+value));
   };
   display();row.append(summary);
   const edit=doc.createElement('button');edit.type='button';edit.textContent='Editar mi negocio';
   edit.onclick=async()=>{
    row.querySelector('[data-radar-editor-status]')?.remove();panel.hidden=true;edit.disabled=quick.disabled=true;
    await openCommercialEditor(row,item.id,doc,undefined,()=>{edit.disabled=quick.disabled=false;edit.focus();},(profile:any,availability:any)=>{
     Object.assign(item,availability,{profile,hours:profile.hours});display();
    });
   };row.append(edit);
   // Declared business submitters may manage their availability without a verified badge.
   const quick=doc.createElement('button');quick.type='button';quick.textContent='Actualizar disponibilidad ahora';
   const panel=doc.createElement('div'),status=text('p','');status.setAttribute('role','status');panel.hidden=true;
   const sendAvailability=async(body:any)=>fetch('/v1/user/radar/business',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
   quick.onclick=async()=>{
    if(!panel.hidden){panel.hidden=true;return;}
    quick.disabled=edit.disabled=true;status.textContent='Cargando disponibilidad…';panel.replaceChildren(status);panel.hidden=false;
    try{
     const response=await sendAvailability({action:'inspect',id:item.id});if(!response.ok)throw Error();
     const data=(await response.json()).item;if(!data||typeof data!=='object')throw Error();
     const type=names[data.configuredUnit]||names[data.profile?.capacity?.unit]||names[data.unit]||names.units;
     const capacity=data.profile?.capacity?.total;
     const form=doc.createElement('form');form.style.cssText='display:flex;flex-wrap:wrap;align-items:end;gap:10px;width:100%';
     const label=text('label','Cantidad disponible ahora ('+type+')');const number=doc.createElement('input');number.type='number';number.inputMode='numeric';number.min='0';number.max=String(Number.isInteger(capacity)?Math.min(capacity,100000):100000);number.step='1';number.required=true;number.style.cssText='display:block;width:min(240px,100%);max-width:100%';
     if(data.unit===data.configuredUnit&&Number.isInteger(data.quantity))number.value=String(data.quantity);label.append(number);
     const save=text('button','Guardar disponibilidad');save.type='submit';
     const clear=text('button','Ocultar cantidad');clear.type='button';
     form.append(label,save,clear);panel.replaceChildren(form,status);panel.hidden=false;status.textContent=Number.isInteger(capacity)?'Capacidad habitual: '+capacity+' '+type+'.':'Indica la cantidad disponible en este momento.';
     const submit=async(quantity:number|null)=>{
      save.disabled=clear.disabled=edit.disabled=quick.disabled=true;status.textContent='Actualizando…';
      try{const result=await sendAvailability({action:'availability',id:item.id,quantity});if(!result.ok){status.textContent=result.status===400?'La cantidad debe estar entre cero y la capacidad total registrada.':result.status===403?'Tu cuenta ya no tiene permiso para actualizar este comercio.':'No se pudo actualizar. Inténtalo de nuevo.';return;}number.value=quantity===null?'':String(quantity);Object.assign(item,{quantity,unit:data.configuredUnit});display();status.textContent=quantity===null?'Disponibilidad oculta.':'Disponibilidad actualizada en Radar.';}
      catch{status.textContent='No se pudo actualizar. Comprueba tus permisos y vuelve a intentar.';}
      finally{save.disabled=clear.disabled=edit.disabled=quick.disabled=false;}
     };
     form.onsubmit=e=>{e.preventDefault();if(form.reportValidity())void submit(Number(number.value));};clear.onclick=()=>void submit(null);
    }catch{status.textContent='No se pudo consultar la ficha. Actualiza la página e inténtalo nuevamente.';panel.hidden=false;}
    finally{quick.disabled=edit.disabled=false;}
   };
   row.append(quick,panel);
  }
  if(item.authorized!==true&&item.canManage===true)row.append(text('p','Puedes editar tus datos comerciales, horarios y disponibilidad desde esta cuenta. La verificación voluntaria solo agrega el distintivo de negocio verificado.'));
  if(data.verificationAvailable===true&&item.declared===true){
   row.append(text('p','Verificación voluntaria gratuita e independiente de pagos. Tras solicitarla, contacta a Direcciones por WhatsApp para coordinar un video continuo de fachada, letrero, aviso de operaciones e interior. No muestres cédulas ni datos tributarios en el video. La revisión es manual y puede tardar 48–72 horas.'));
   const contact=doc.createElement('a');contact.href='https://wa.me/50765996532?text='+encodeURIComponent('Hola, Direcciones. Solicité la verificación de mi establecimiento en Radar: '+String(item.name||'Establecimiento')+'. Quisiera coordinar el envío del video de evidencia.');contact.target='_blank';contact.rel='noopener noreferrer';contact.textContent='Contactar a Direcciones por WhatsApp (+507 6599-6532)';contact.hidden=false;row.append(contact);
   if(item.requested!==true&&item.authorized!==true){
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
  if(typeof item.id==='string'&&(item.submitted===true||item.declared===true||item.authorized===true)){
   const retire=doc.createElement('button');retire.type='button';retire.textContent='Retirar mi PIN';retire.setAttribute('aria-label','Retirar mi PIN: '+String(item.name||'Establecimiento'));
   const confirmation=doc.createElement('div');confirmation.hidden=true;confirmation.setAttribute('role','group');
   const message=text('p','¿Retirar «'+String(item.name||'Establecimiento')+'» del mapa? Dejará de ser público. Esta acción no elimina tu cuenta ni otros PIN.');
   const confirm=text('button','Sí, retirar este PIN');confirm.type='button';
   const cancel=text('button','Cancelar');cancel.type='button';
   const result=text('p','');result.setAttribute('role','status');
   confirmation.append(message,confirm,cancel,result);
   retire.onclick=()=>{confirmation.hidden=false;retire.disabled=true;};
   cancel.onclick=()=>{confirmation.hidden=true;retire.disabled=false;result.textContent='';};
   confirm.onclick=async()=>{
    confirm.disabled=cancel.disabled=true;result.textContent='Retirando PIN…';
    try{
     const response=await fetch('/v1/user/radar/business',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'retire',id:item.id,confirmName:String(item.name||'')})});
     if(!response.ok){result.textContent='No se puede retirar este PIN desde tu cuenta. Si tiene una dirección o campaña vinculada, contacta a ADMIN.';return;}
     row.replaceChildren(text('p','PIN retirado: '+String(item.name||'Establecimiento')+'. Ya no aparecerá en el mapa.'));
    }catch{result.textContent='No se pudo completar el retiro. Revisa tu conexión y vuelve a intentar.';}
    finally{confirm.disabled=cancel.disabled=false;}
   };
   row.append(retire,confirmation);
  }
  out.append(row);
 }
}
export const radarAccountScript=commercialFieldsScript+openCommercialEditor.toString()+';'+renderRadarAccount.toString();
