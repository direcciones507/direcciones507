// Registration choice is UI context only; it never proves ownership or grants a role.
export function registrationIntent(kind){
 if(kind!=='user'&&kind!=='owner')throw Error('INVALID_REGISTRATION_KIND');
 return {type:'add',registrationKind:kind};
}
export function registrationKind(action){
 return action?.type==='add'&&(action.registrationKind==='user'||action.registrationKind==='owner')?action.registrationKind:null;
}
export function saveRegistrationChoice(storage,kind,now=Date.now()){
 const action={...registrationIntent(kind),savedAt:now};storage.setItem('radarAction',JSON.stringify(action));return action;
}
export function readRegistrationChoice(storage,now=Date.now()){
 try{const action=JSON.parse(storage.getItem('radarAction')||'null');return Number.isFinite(action?.savedAt)&&now>=action.savedAt&&now-action.savedAt<30*60*1000?registrationKind(action):null;}catch{return null;}
}
export const registrationChoiceMarkup='<dialog id="registrationChoiceDialog" class="dialog compact" aria-labelledby="registrationChoiceTitle"><div class="dialog-heading"><span class="eyebrow">AGREGAR ESTABLECIMIENTO</span><button type="button" class="icon-button" data-close aria-label="Cerrar elección de registro">×</button></div><h2 id="registrationChoiceTitle">¿Cómo deseas participar?</h2><button type="button" class="button silver wide" data-registration-kind="user">Soy usuario</button><p class="muted">Agrega establecimientos gratuitamente y comparte afluencia. Este registro no concede titularidad.</p><button type="button" class="button silver wide" data-registration-kind="owner">Soy propietario de un comercio</button><p class="muted">Completa la información comercial gratuitamente. La elección no concede permisos ni distintivos verificados.</p></dialog>';
const days=[['monday','Lunes'],['tuesday','Martes'],['wednesday','Miércoles'],['thursday','Jueves'],['friday','Viernes'],['saturday','Sábado'],['sunday','Domingo']];
// Shared name/category/country/GPS/PIN controls remain in the existing add form.
export const ownerRegistrationMarkup='<fieldset id="ownerRegistrationFields" class="coordinate-box" hidden disabled><legend>Información del comercio</legend><div class="form-grid"><label>Provincia o división territorial<input name="businessProvince" required maxlength="100" autocomplete="address-level1"></label><label>Localidad<input name="businessLocality" required maxlength="160" autocomplete="address-level2"></label></div><label>Descripción comercial<textarea name="businessDescription" required maxlength="1200"></textarea></label><label>Teléfono comercial público<input name="businessPhone" type="tel" maxlength="32" autocomplete="tel"></label><h3>Horario de atención</h3>'+days.map(([key,label])=>'<div class="hours-row"><label class="check"><input type="checkbox" name="businessClosed_'+key+'"> '+label+' · Cerrado</label><label>Apertura<input name="businessOpen_'+key+'" type="time" aria-label="'+label+' apertura"></label><label>Cierre<input name="businessClose_'+key+'" type="time" aria-label="'+label+' cierre"></label></div>').join('')+'<label>Redes sociales o sitio web<textarea name="businessSocials" maxlength="1000" placeholder="Un enlace público por línea"></textarea></label><div id="businessCategoryFields"></div><p class="muted">Publicación gratuita. No ingreses documentos personales ni información fiscal privada.</p></fieldset>';
export const categoryRegistrationFields=Object.freeze({
 restaurant:[['cuisine','Tipo de cocina'],['services','Servicios del restaurante']],
 hotel:[['accommodation','Tipo de alojamiento'],['services','Servicios del alojamiento']],
 shop:[['products','Productos o especialidad']],
 services:[['services','Servicios ofrecidos']],
 tourism:[['experiences','Experiencias o actividades'],['access','Acceso y recomendaciones']],
 other:[['services','Información adicional del establecimiento']]
});
export function setRegistrationKind(form,kind){
 registrationIntent(kind);form.dataset.registrationKind=kind;
 const fields=form.querySelector('#ownerRegistrationFields');if(fields){fields.hidden=kind!=='owner';fields.disabled=kind!=='owner';}
 // This changes required controls only, never any authentication or authorization state.
}
export function renderCategoryRegistrationFields(container,category,doc=document){
 container.replaceChildren();
 for(const [key,title] of (Object.hasOwn(categoryRegistrationFields,category)?categoryRegistrationFields[category]:categoryRegistrationFields.other)){const label=doc.createElement('label'),input=doc.createElement('input');label.textContent=title;input.name='businessExtra_'+key;input.maxLength=250;label.append(input);container.append(label);}
}
export function collectOwnerRegistration(form){
 const value=name=>String(form.elements.namedItem(name)?.value||'').trim(),hours={};
 for(const [key,label] of days){const start=value('businessOpen_'+key),end=value('businessClose_'+key);if(form.elements.namedItem('businessClosed_'+key)?.checked)hours[key]='closed';else if(start||end){if(!start||!end)throw Error('Completa apertura y cierre de '+label+'.');hours[key]=start+'-'+end;}}
 const extras={};for(const input of form.querySelectorAll('[name^="businessExtra_"]'))if(input.value.trim())extras[input.name.slice('businessExtra_'.length)]=input.value.trim();
 return {province:value('businessProvince'),locality:value('businessLocality'),description:value('businessDescription'),phone:value('businessPhone'),hours,socials:value('businessSocials').split(/\r?\n/).map(v=>v.trim()).filter(Boolean),extras};
}
export function restoreOwnerRegistration(form,profile){
 if(!profile)return;for(const [key,name] of [['province','businessProvince'],['locality','businessLocality'],['description','businessDescription'],['phone','businessPhone']])form.elements.namedItem(name).value=profile[key]||'';
 form.elements.namedItem('businessSocials').value=Array.isArray(profile.socials)?profile.socials.join('\n'):'';
 for(const [key] of days){const h=profile.hours?.[key],parts=typeof h==='string'&&h!=='closed'?h.split('-'):[];form.elements.namedItem('businessClosed_'+key).checked=h==='closed';form.elements.namedItem('businessOpen_'+key).value=parts[0]||'';form.elements.namedItem('businessClose_'+key).value=parts[1]||'';}
 for(const input of form.querySelectorAll('[name^="businessExtra_"]'))input.value=profile.extras?.[input.name.slice('businessExtra_'.length)]||'';
}
