// Serialized into the existing CORE account panel; no separate page/session.
export async function openCommercialEditor(row:any,id:string,doc:any=document,send:any=(body:unknown)=>fetch('/v1/user/radar/business',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),finished:any=()=>{}){
 const text=(tag:string,value:string)=>{const n=doc.createElement(tag);n.textContent=value;return n;};
 const form=doc.createElement('form'),status=text('p','Consultando tu autorización…');status.setAttribute('role','status');form.setAttribute('style','grid-column:1/-1;flex:1 0 100%;width:100%;min-width:0');row.append(form,status);
 try{
  const response=await send({action:'inspect',id});if(!response.ok)throw Error();const {item}=await response.json();const profile=item.profile||{};
  form.append(text('h4','Editar información de '+item.name));
  const fields:Record<string,any>={};
  const field=(key:string,label:string,value:string,tag='input',max=250,required=false)=>{
   const l=text('label',label),input=doc.createElement(tag);input.setAttribute('style','display:block;width:100%;max-width:100%');input.name=key;input.setAttribute('aria-label',label);input.value=value||'';input.maxLength=max;input.required=required;if(tag==='input')input.type='text';l.append(input);form.append(l);fields[key]=input;return input;
  };
  field('province','Provincia o división territorial',profile.province,'input',100,true);
  field('locality','Localidad',profile.locality,'input',160,true);
  field('description','Descripción pública',profile.description,'textarea',1200,true);
  field('phone','Teléfono comercial público',profile.phone,'input',32).type='tel';
  field('socials','Redes o sitio web · Un enlace HTTPS por línea',(profile.socials||[]).join('\n'),'textarea',1000);
  const capacityUnit=['restaurant','cafe','bar'].includes(item.category)?'tables':item.category==='hotel'?'rooms':['tourism','health','services','entertainment','education','sports'].includes(item.category)?'places':'units';
  const total=field('totalCapacity','Capacidad total · '+({tables:'Mesas',rooms:'Habitaciones',places:'Cupos',units:'Unidades'}[capacityUnit])+' (opcional)',profile.capacity?.unit===capacityUnit?String(profile.capacity.total):'','input',6);total.type='number';total.min='0';total.max='100000';total.step='1';
  form.append(text('p','La capacidad total es independiente de la cantidad disponible.'));
  const quantity=field('quantity','Cantidad disponible (opcional)',item.quantity===null||item.quantity===undefined?'':String(item.quantity),'input',6);
  quantity.type='number';quantity.min='0';quantity.max='100000';quantity.step='1';
  const unitLabel=text('label','Unidad'),unit=doc.createElement('select');unit.name='unit';unit.setAttribute('aria-label','Unidad');
  for(const [value,label] of [['tables','Mesas'],['rooms','Habitaciones'],['places','Cupos'],['units','Unidades']]){const option=text('option',label);option.value=value;unit.append(option);}
  unit.value=item.unit||'units';unitLabel.append(unit);form.append(unitLabel);
  const definitions:any={restaurant:[['cuisine','Tipo de cocina'],['services','Servicios']],hotel:[['accommodation','Alojamiento'],['services','Servicios']],shop:[['products','Productos']],services:[['services','Servicios']],tourism:[['experiences','Experiencias'],['access','Acceso']]};
  const extraFields=definitions[item.category]||[['services','Servicios']];
  for(const [key,label] of extraFields)field('extra_'+key,label,profile.extras?.[key]);
  const days=[['monday','Lunes'],['tuesday','Martes'],['wednesday','Miércoles'],['thursday','Jueves'],['friday','Viernes'],['saturday','Sábado'],['sunday','Domingo']];
  form.append(text('h4','Horario público'));
  for(const [key,label] of days){
   const mode=doc.createElement('select');mode.name=key+'Mode';
   for(const [value,title] of [['','Sin configurar'],['closed','Cerrado'],['open','Horario']]){const option=text('option',title);option.value=value;mode.append(option);}
   const l=text('label',label);l.append(mode);form.append(l);fields[key+'Mode']=mode;
   const start=field(key+'Start',label+' apertura','','input',5),end=field(key+'End',label+' cierre','','input',5);start.type=end.type='time';
   const value=profile.hours?.[key];mode.value=value==='closed'?'closed':value?'open':'';if(value&&value!=='closed')[start.value,end.value]=value.split('-');
   const toggle=()=>{start.disabled=end.disabled=mode.value!=='open';start.required=end.required=mode.value==='open';};mode.onchange=toggle;toggle();
  }
  form.append(text('p','Esta información será pública. No incluyas cédula, RUC ni documentos privados.'));
  const save=text('button','Guardar cambios');save.type='submit';const close=text('button','Cerrar edición');close.type='button';close.onclick=()=>{form.remove();status.remove();finished();};form.append(save,close);status.textContent='';
  form.onsubmit=async(e:any)=>{
   e.preventDefault();if(!form.reportValidity())return;save.disabled=true;close.disabled=true;status.textContent='Guardando…';
   try{
    const hours:Record<string,string>={},extras:Record<string,string>={};
    for(const [key] of days){if(fields[key+'Mode'].value==='closed')hours[key]='closed';else if(fields[key+'Mode'].value==='open')hours[key]=fields[key+'Start'].value+'-'+fields[key+'End'].value;}
    for(const [key] of extraFields)if(fields['extra_'+key].value.trim())extras[key]=fields['extra_'+key].value.trim();
    const profile={...(total.value===''?{}:{capacity:{total:Number(total.value),unit:capacityUnit}}),province:fields.province.value.trim(),locality:fields.locality.value.trim(),description:fields.description.value.trim(),phone:fields.phone.value.trim(),socials:fields.socials.value.split(/\r?\n/).map((v:string)=>v.trim()).filter(Boolean),hours,extras};
    const result=await send({action:'update',id,profile,availability:{quantity:quantity.value===''?null:Number(quantity.value),unit:unit.value}});if(!result.ok)throw Error();status.textContent='Cambios guardados en tu ficha comercial.';
   }catch{status.textContent='No se guardaron los cambios. Revisa los datos y tu autorización antes de reintentar.';}
   finally{save.disabled=false;close.disabled=false;}
  };
 }catch{finished();status.textContent='No puedes editar esta ficha. Actualiza el panel para comprobar tu autorización.';}
}
