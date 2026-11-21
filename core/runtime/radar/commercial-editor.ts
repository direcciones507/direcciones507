import {categoryRegistrationFields} from './ui/registration-form.js';
export const commercialFieldsScript='const categoryRegistrationFields='+JSON.stringify(categoryRegistrationFields)+';';
// Serialized into the existing CORE account panel; no separate page/session.
export async function openCommercialEditor(row:any,id:string,doc:any=document,send:any=(body:unknown)=>fetch('/v1/user/radar/business',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),finished:any=()=>{},saved:any=()=>{}){
 const text=(tag:string,value:string)=>{const n=doc.createElement(tag);n.textContent=value;return n;};
 const form=doc.createElement('form'),status=text('p','Consultando tu autorización…');status.setAttribute('role','status');status.setAttribute('data-radar-editor-status','');form.className='radar-owner-editor';row.append(form,status);
 try{
  const response=await send({action:'inspect',id});if(!response.ok)throw Error();const {item}=await response.json();const profile=item.profile||{},verified=item.verified===true;
  form.append(text('h4','Editar información de '+item.name));
  const fields:Record<string,any>={};
  const field=(key:string,label:string,value:string,tag='input',max=250,required=false)=>{
   const l=text('label',label),input=doc.createElement(tag);input.setAttribute('style','display:block;width:100%;max-width:100%');input.name=key;input.setAttribute('aria-label',label);input.value=value||'';input.maxLength=max;input.required=required;if(tag==='input')input.type='text';l.append(input);form.append(l);fields[key]=input;return input;
  };
  field('province','Provincia o división territorial',profile.province,'input',100,true);
  field('locality','Localidad',profile.locality,'input',160,true);
  field('description','Descripción pública',profile.description,'textarea',1200,true);
  field('phone','Teléfono comercial público',profile.phone,'input',32).type='tel';
  const whatsapp=field('whatsapp','WhatsApp comercial público (opcional)',profile.whatsapp,'input',16);whatsapp.type='tel';whatsapp.placeholder='+50760000000';whatsapp.pattern='\\+[1-9][0-9]{6,14}';
  field('socials','Redes o sitio web · Un enlace HTTPS por línea',(profile.socials||[]).join('\n'),'textarea',1000);
  const effectiveUnit=item.configuredUnit;
  const labels:Record<string,string[]>={tables:['Mesas totales','Mesas disponibles ahora'],rooms:['Habitaciones totales','Habitaciones disponibles ahora'],places:['Cupos totales','Cupos disponibles ahora'],units:['Unidades totales','Unidades disponibles ahora']};
  const [totalLabel,quantityLabel]=labels[effectiveUnit]||labels.units;
  const total=field('totalCapacity',totalLabel,profile.capacity?.unit===effectiveUnit?String(profile.capacity.total):'','input',6);
  total.type='number';total.min='0';total.max='100000';total.step='1';total.inputMode='numeric';
  const quantity=field('quantity',quantityLabel,item.quantity!=null&&item.unit===effectiveUnit?String(item.quantity):'','input',6);
  quantity.type='number';quantity.min='0';quantity.step='1';quantity.inputMode='numeric';
  const limit=()=>{quantity.max=total.value===''?'100000':total.value;};total.oninput=limit;limit();
  form.append(text('p','Deja vacía la disponibilidad para ocultarla en Radar. Puedes registrar cero cuando no haya disponibilidad.'));
  if(item.quantity!=null&&item.unit!==effectiveUnit)form.append(text('p','La disponibilidad anterior usa otra unidad. Indica la cantidad en la unidad actual para publicarla.'));
  if(!verified)form.append(text('p','La verificación voluntaria solo agrega el distintivo de negocio verificado.'));
  const extraFields=Object.hasOwn(categoryRegistrationFields,item.category)?categoryRegistrationFields[item.category]:categoryRegistrationFields.other;
  for(const [key,label] of extraFields)field('extra_'+key,label,profile.extras?.[key]);
  const days=[['monday','Lunes'],['tuesday','Martes'],['wednesday','Miércoles'],['thursday','Jueves'],['friday','Viernes'],['saturday','Sábado'],['sunday','Domingo']];
  form.append(text('h4','Horario público'));
  const schedule=doc.createElement('div');schedule.className='radar-owner-schedule';
  for(const [key,label] of days){
   const mode=doc.createElement('select');mode.name=key+'Mode';
   for(const [value,title] of [['','Sin configurar'],['closed','Cerrado'],['open','Horario']]){const option=text('option',title);option.value=value;mode.append(option);}
   const l=text('label',label);l.append(mode);form.append(l);fields[key+'Mode']=mode;
   const start=field(key+'Start',label+' apertura','','input',5),end=field(key+'End',label+' cierre','','input',5);start.type=end.type='time';
   const dayRow=doc.createElement('div');dayRow.append(l,start.parentNode,end.parentNode);schedule.append(dayRow);
   const value=(item.hours??profile.hours)?.[key];mode.value=value==='closed'?'closed':value?'open':'';if(value&&value!=='closed')[start.value,end.value]=value.split('-');
   const toggle=()=>{start.disabled=end.disabled=mode.value!=='open';start.required=end.required=mode.value==='open';};mode.onchange=toggle;toggle();
  }
  form.append(schedule);
  form.append(text('p','Esta información será pública. No incluyas cédula, RUC ni documentos privados.'));
  const save=text('button','Guardar cambios');save.type='submit';const close=text('button','Cerrar edición');close.type='button';close.onclick=()=>{form.remove();status.remove();finished();};form.append(save,close);status.textContent='';fields.province.focus();
  form.onsubmit=async(e:any)=>{
   e.preventDefault();if(!form.reportValidity())return;save.disabled=true;close.disabled=true;status.textContent='Guardando…';
   try{
    const hours:Record<string,string>={},extras:Record<string,string>={};
    for(const [key] of days){if(fields[key+'Mode'].value==='closed')hours[key]='closed';else if(fields[key+'Mode'].value==='open')hours[key]=fields[key+'Start'].value+'-'+fields[key+'End'].value;}
    for(const [key] of extraFields)if(fields['extra_'+key].value.trim())extras[key]=fields['extra_'+key].value.trim();
    const profile={...(total.value===''?{}:{capacity:{total:Number(total.value),unit:effectiveUnit}}),province:fields.province.value.trim(),locality:fields.locality.value.trim(),description:fields.description.value.trim(),phone:fields.phone.value.trim(),whatsapp:whatsapp.value.trim(),socials:fields.socials.value.split(/\r?\n/).map((v:string)=>v.trim()).filter(Boolean),hours,extras};
    const availability={quantity:quantity.value===''?null:Number(quantity.value),unit:effectiveUnit};
    const result=await send({action:'update',id,profile,availability});
    if(!result.ok){status.textContent=result.status===400?'Revisa los horarios, los enlaces HTTPS y los límites de capacidad.':result.status===403?'Tu cuenta ya no tiene permiso para editar este comercio.':'No se pudo guardar. Inténtalo de nuevo.';return;}
    saved({...profile},availability);status.textContent=verified?'Cambios guardados en tu ficha comercial.':'Datos y disponibilidad guardados. El distintivo verificado sigue pendiente.';
   }catch{status.textContent='No se guardaron los cambios. Revisa los datos y tu autorización antes de reintentar.';}
   finally{save.disabled=false;close.disabled=false;}
  };
 }catch{form.remove();status.textContent='No se pudo abrir esta ficha. Comprueba tu autorización o vuelve a intentar.';finished();}
}
