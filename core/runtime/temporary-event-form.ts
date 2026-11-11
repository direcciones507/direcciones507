/** Dirección Temporal: draft-only form UI. Route integration must enforce authenticated owner and CSRF. */
export function renderTemporaryEventDraftForm(action='/v1/user/temporary-events'):string {
 if(!/^\/v1\/user\/[a-z0-9/-]+$/.test(action))throw Error('INVALID_FORM_ACTION');
 return `<section class="temporary-event-form" aria-labelledby="temporary-heading">
 <h2 id="temporary-heading">Crear Dirección Temporal</h2>
 <p>Publica una fiesta o evento por US$7.99, durante 1 a 30 días. El evento no se publica hasta confirmar el pago.</p>
 <form id="temporary-event-draft" data-action="${action}" novalidate>
 <fieldset><legend>Información del evento</legend>
 <label>Nombre del evento <input name="title" required minlength="3" maxlength="160" autocomplete="off"></label>
 <label>Descripción <textarea name="description" maxlength="5000"></textarea></label>
 <label>Fecha inicial <input name="startsOn" type="date" required></label>
 <label>Fecha final <input name="endsOn" type="date" required></label>
 <label>Horario <input name="hours" maxlength="400" placeholder="Ej. 6:00 p. m. a 11:00 p. m."></label>
 <label>Zona horaria <input name="timezone" required value="America/Panama"></label>
 </fieldset>
 <fieldset><legend>Ubicación</legend>
 <label>País (código ISO) <input name="countryCode" required maxlength="2" value="PA"></label>
 <label>Provincia <input name="province" required maxlength="120"></label>
 <label>Distrito <input name="district" required maxlength="120"></label>
 <label>Corregimiento <input name="corregimiento" required maxlength="120"></label>
 <label>Referencia <input name="reference" maxlength="300"></label>
 <label>Latitud <input name="latitude" type="number" step="any" min="-90" max="90"></label>
 <label>Longitud <input name="longitude" type="number" step="any" min="-180" max="180"></label>
 </fieldset>
 <fieldset><legend>Responsable (información privada)</legend>
 <p>Estos datos no aparecerán en la página pública.</p>
 <label>Nombre <input name="responsibleName" required maxlength="160"></label>
 <label>Correo <input name="responsibleEmail" type="email" required maxlength="254"></label>
 <label>Teléfono <input name="responsiblePhone" type="tel" required maxlength="40"></label>
 </fieldset>
 <fieldset><legend>Contacto público opcional</legend>
 <label>Nombre visible <input name="publicContactName" maxlength="160"></label>
 <label>Teléfono visible <input name="publicContactPhone" type="tel" maxlength="40"></label>
 <label><input name="publicContactConsent" type="checkbox"> Autorizo publicar estos datos de contacto en la ficha del evento.</label>
 </fieldset>
 <p id="temporary-event-error" role="alert" aria-live="polite"></p>
 <button type="submit">Guardar borrador</button>
 </form></section>`;
}
/** Bind only on authenticated pages; server must independently validate and check session + CSRF. */
export const temporaryEventDraftClientScript=`(() => {
 const form=document.getElementById('temporary-event-draft');if(!form)return;
 const error=document.getElementById('temporary-event-error');
 form.addEventListener('submit',async ev=>{
  ev.preventDefault();error.textContent='';
  if(!form.reportValidity())return;
  const values=Object.fromEntries(new FormData(form).entries());
  const start=Date.parse(String(values.startsOn)+'T00:00:00Z');
  const end=Date.parse(String(values.endsOn)+'T00:00:00Z');
  const days=(end-start)/86400000+1;
  if(!Number.isFinite(days)||days<1||days>30){error.textContent='Selecciona una duración de 1 a 30 días.';return;}
  if((values.publicContactName||values.publicContactPhone)&&!values.publicContactConsent){
   error.textContent='Autoriza el contacto público o deja esos campos vacíos.';return;
  }
  const payload={...values,publicContactConsent:values.publicContactConsent==='on'};
  for(const key of ['latitude','longitude'])payload[key]=values[key]===''?null:Number(values[key]);
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  try {
   const response=await fetch(form.dataset.action,{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest'},body:JSON.stringify(payload)});
   if(!response.ok)throw Error('No se pudo guardar el borrador ('+response.status+').');
   const data=await response.json();
   if(typeof data.id!=='string')throw Error('Respuesta de guardado inválida.');
   error.textContent='Borrador guardado. Continúa con las fotografías y la vista previa.';
   form.dispatchEvent(new CustomEvent('temporary-event:saved',{bubbles:true,detail:{id:data.id}}));
  }catch(e){error.textContent=e instanceof Error?e.message:'Error de conexión';}
  finally{button.disabled=false;}
 });
})();`;
