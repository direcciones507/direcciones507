import {
 ownerRegistrationMarkup,collectOwnerRegistration,collectOwnerPrivate,
 setOwnerPrivateEnabled,renderCategoryRegistrationFields,
 capacityUnit,applyCategoryUnits
} from './ui/registration-form.js';

// The same trusted business fields and validation used in Radar are reused
// inside the authenticated CORE account panel. No second identity or session.
export async function openRadarOwnerCreate(
 doc:any=document,data:any={},refreshPanel:any=()=>{},
 send:any=(body:unknown)=>fetch('/v1/user/radar/business',{
  method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},
  body:JSON.stringify(body)
 })
){
 const region=doc.getElementById('radarOwnerRegistration');
 if(!region)return;
 region.hidden=false;
 const names:any={PA:'Panamá',CO:'Colombia',CR:'Costa Rica',GT:'Guatemala',SV:'El Salvador',HN:'Honduras',NI:'Nicaragua',MX:'México'};
 const formMarkup='<form id="radarOwnerCreateForm" class="radar-owner-editor">'
  +'<h3>Agregar mi local a Radar</h3>'
  +'<p>Registra tu establecimiento y administra después sus horarios y disponibilidad desde este mismo panel.</p>'
  +'<label>Nombre del establecimiento<input name="name" required maxlength="160" autocomplete="organization"></label>'
  +'<label>Categoría<select name="category" required></select></label>'
  +'<label>País<select name="country" required></select></label>'
  +'<fieldset><legend>Ubicación del establecimiento</legend><p>Introduce las coordenadas del negocio o usa la ubicación actual del dispositivo. Revisa que correspondan a tu local.</p>'
  +'<button type="button" id="radarOwnerGps">Usar mi ubicación</button>'
  +'<label>Latitud<input name="latitude" type="number" step="any" min="-90" max="90" required inputmode="decimal"></label>'
  +'<label>Longitud<input name="longitude" type="number" step="any" min="-180" max="180" required inputmode="decimal"></label></fieldset>'
  +ownerRegistrationMarkup
  +'<button type="submit" id="radarOwnerCreateSubmit">Guardar mi local</button>'
  +'<button type="button" id="radarOwnerCreateCancel">Cancelar</button>'
  +'<p id="radarOwnerCreateStatus" role="status" aria-live="polite"></p></form>';
 region.innerHTML=formMarkup;
 const form:any=region.querySelector('#radarOwnerCreateForm');
 const status:any=region.querySelector('#radarOwnerCreateStatus');
 const category:any=form.elements.namedItem('category');
 const country:any=form.elements.namedItem('country');
 const latitude:any=form.elements.namedItem('latitude');
 const longitude:any=form.elements.namedItem('longitude');
 const fields:any=region.querySelector('#ownerRegistrationFields');
 fields.hidden=false;fields.disabled=false;
 for(const [code,label] of Object.entries(names)){
  const option=doc.createElement('option');option.value=code;option.textContent=String(label);country.append(option);
 }
 country.value='PA';
 const privateEnabled=data.ownerPrivateRequired===true;
 const updateCountry=()=>setOwnerPrivateEnabled(form,privateEnabled,country.value);
 country.onchange=updateCountry;updateCountry();
 const categories:any[]=[
  {id:'shop',label:'Comercio',capacityUnit:'units'},
  {id:'restaurant',label:'Restaurante',capacityUnit:'tables'},
  {id:'cafe',label:'Cafetería',capacityUnit:'tables'},
  {id:'hotel',label:'Alojamiento',capacityUnit:'rooms'},
  {id:'services',label:'Servicios',capacityUnit:'places'},
  {id:'tourism',label:'Turismo',capacityUnit:'places'},
  {id:'health',label:'Salud',capacityUnit:'places'},
  {id:'other',label:'Otra categoría',capacityUnit:'units'}
 ];
 const submit:any=region.querySelector('#radarOwnerCreateSubmit');
 submit.disabled=true;status.textContent='Cargando categorías de Radar…';
 try{
  const response=await send({action:'catalog'});
  if(!response.ok)throw Error('CATEGORY_UNAVAILABLE');
  const catalog=await response.json();
  if(catalog.dynamic){
   if(!Array.isArray(catalog.categories)||!Array.isArray(catalog.groups))throw Error('CATEGORY_UNAVAILABLE');
   const activeGroups=new Set(catalog.groups.filter((g:any)=>g.active===true).map((g:any)=>g.id));
   categories.splice(0,categories.length,...catalog.categories.filter((c:any)=>c.active===true&&activeGroups.has(c.groupId)));
  }
  if(!categories.length)throw Error('CATEGORY_UNAVAILABLE');
  applyCategoryUnits(categories);
  for(const c of categories){
   const option=doc.createElement('option');option.value=c.id;option.textContent=c.label;category.append(option);
  }
  const refreshFields=()=>renderCategoryRegistrationFields(region.querySelector('#businessCategoryFields'),category.value,doc);
  category.onchange=refreshFields;refreshFields();
  submit.disabled=false;status.textContent='';
 }catch{status.textContent='No pudimos cargar las categorías. Actualiza tu panel e inténtalo de nuevo.';}
 region.querySelector('#radarOwnerGps').onclick=()=>{
  const button:any=region.querySelector('#radarOwnerGps');
  if(!doc.defaultView?.navigator?.geolocation){status.textContent='La ubicación no está disponible. Escribe las coordenadas manualmente.';return;}
  button.disabled=true;status.textContent='Consultando tu ubicación…';
  doc.defaultView.navigator.geolocation.getCurrentPosition((position:any)=>{
   latitude.value=String(position.coords.latitude);longitude.value=String(position.coords.longitude);
   button.disabled=false;status.textContent='Ubicación copiada. Comprueba que el punto corresponde a tu local.';
  },()=>{button.disabled=false;status.textContent='No se obtuvo la ubicación. Puedes escribir las coordenadas manualmente.';},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 };
 region.querySelector('#radarOwnerCreateCancel').onclick=()=>{region.hidden=true;region.replaceChildren();};
 form.onsubmit=async(e:any)=>{
  e.preventDefault();if(submit.disabled||!form.reportValidity())return;
  const read=(key:string)=>String(form.elements.namedItem(key)?.value||'').trim();
  let profile:any,ownerPrivate:any;
  try{
   profile=collectOwnerRegistration(form);
   if(privateEnabled)ownerPrivate=collectOwnerPrivate(form);
  }catch(error:any){status.textContent=error?.message||'Revisa la información comercial.';return;}
  const draft:any={name:read('name'),category:read('category'),country:read('country'),
   latitude:Number(read('latitude')),longitude:Number(read('longitude')),
   registrationKind:'owner',profile,...(ownerPrivate?{ownerPrivate}:{})};
  submit.disabled=true;status.textContent='Publicando tu local…';
  try{
   const response=await send({action:'register',draft});
   const result=await response.json().catch(()=>({}));
   if(!response.ok){
    const errors:any={DUPLICATE:'Ya existe un establecimiento con ese nombre y ubicación.',INVALID_CATEGORY:'Elige una categoría disponible.',INVALID_ESTABLISHMENT:'Revisa los datos, horarios, enlaces y coordenadas.',REGISTRATION_RATE_LIMIT:'Alcanzaste el límite de registros. Inténtalo más tarde.',PROFILE_MANAGEMENT_DISABLED:'El registro comercial no está disponible.'};
    status.textContent=errors[result.error]||'No se pudo guardar. Revisa tu información y vuelve a intentar.';
    return;
   }
   region.replaceChildren();
   const done=doc.createElement('p');done.setAttribute('role','status');
   done.textContent='Local publicado correctamente. Ya puedes editar su ficha y disponibilidad desde Mi panel.';
   const link=doc.createElement('a');link.href='https://radar.direcciones.lat/';
   link.textContent='Continuar en Radar';
   region.append(done,link);
   if(typeof refreshPanel==='function')await refreshPanel();
  }catch{status.textContent='No se pudo conectar. Comprueba tu conexión y vuelve a intentar.';}
  finally{submit.disabled=false;}
 };
}
const days=[['monday','Lunes'],['tuesday','Martes'],['wednesday','Miércoles'],['thursday','Jueves'],['friday','Viernes'],['saturday','Sábado'],['sunday','Domingo']];
export const ownerPanelCreateScript=
 'const ownerRegistrationMarkup='+JSON.stringify(ownerRegistrationMarkup)+';'+
 'const days='+JSON.stringify(days)+';'+
 'const dynamicUnits=new Map();'+
 'const capacityUnit='+capacityUnit.toString()+';'+
 'const applyCategoryUnits='+applyCategoryUnits.toString()+';'+
 'const renderCategoryRegistrationFields='+renderCategoryRegistrationFields.toString()+';'+
 'const collectOwnerRegistration='+collectOwnerRegistration.toString()+';'+
 'const collectOwnerPrivate='+collectOwnerPrivate.toString()+';'+
 'const setOwnerPrivateEnabled='+setOwnerPrivateEnabled.toString()+';'+
 'const openRadarOwnerCreate='+openRadarOwnerCreate.toString()+';';
