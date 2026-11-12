/** Dirección Temporal: draft-only form UI. Route integration must enforce authenticated owner and CSRF. */
export function renderTemporaryEventDraftForm(action='/v1/user/temporary-events',paymentsEnabled=false):string {
 if(!/^\/v1\/user\/[a-z0-9/-]+$/.test(action))throw Error('INVALID_FORM_ACTION');
 return `<style>
*{box-sizing:border-box}
body{margin:0;background:#eef3fa;color:#152c4a;font:16px/1.55 system-ui,-apple-system,sans-serif}
.temporary-event-form{max-width:940px;margin:0 auto;padding:32px 18px 64px}
.temporary-event-form h2{font-size:clamp(1.65rem,3vw,2.25rem);letter-spacing:-.035em;margin:12px 0}
.temporary-event-form>p{color:#52677f;max-width:68ch}
.temporary-event-form form{display:grid;gap:20px}
.temporary-event-form fieldset{border:1px solid #e0e8f3;border-radius:22px;padding:24px;background:#fff;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;box-shadow:0 7px 28px rgba(20,48,86,.045)}
.temporary-event-form legend{font-size:1.13rem;font-weight:750;letter-spacing:-.02em;padding:0 0 12px;color:#17375e;float:left;width:100%;line-height:1.4}.temporary-event-form fieldset::after{content:'';display:block;clear:both}
.temporary-event-form label{display:block;min-width:0;font-weight:570;color:#203b5c}
.temporary-event-form input:not([type=checkbox]):not([type=file]),.temporary-event-form textarea{display:block;width:100%;font:inherit;color:#183554;background:#f8fbff;padding:13px 14px;border:1.5px solid #b9c9de;border-radius:12px;margin-top:8px;min-height:48px;transition:border-color .18s,box-shadow .18s,background .18s}
.temporary-event-form textarea{min-height:112px;resize:vertical}
.temporary-event-form input:hover,.temporary-event-form textarea:hover{border-color:#6198e9}
.temporary-event-form input:focus-visible,.temporary-event-form textarea:focus-visible,.temporary-event-form button:focus-visible,.temporary-event-form a:focus-visible{outline:3px solid #91bfff;outline-offset:3px}
.temporary-event-form input:not([type=checkbox]):not([type=file]):focus,.temporary-event-form textarea:focus{background:#fff;border-color:#1760ce;box-shadow:0 0 0 4px rgba(23,96,206,.12);outline:0}
.temporary-event-form input[type=checkbox]{width:19px;height:19px;accent-color:#1760ce;vertical-align:middle;margin-right:8px;cursor:pointer}
.temporary-event-form input[type=file]{display:block;width:100%;margin-top:9px;padding:12px;border:1.5px dashed #8eadd6;border-radius:14px;background:#f5f9ff;color:#52677f;font:inherit;font-size:.9rem;cursor:pointer;transition:background .18s,border-color .18s,box-shadow .18s}
.temporary-event-form input[type=file]:hover{background:#eaf3ff;border-color:#1760ce}
.temporary-event-form input[type=file]::file-selector-button{background:#1760ce;color:#fff;border:0;border-radius:10px;padding:12px 15px;font:inherit;font-weight:700;margin-right:12px;cursor:pointer;transition:background .18s,transform .18s}
.temporary-event-form input[type=file]:hover::file-selector-button{background:#104ba8}
.temporary-event-form button,.temporary-event-form .event-link{padding:13px 19px;min-height:48px;border:1px solid transparent;border-radius:12px;background:#1760ce;color:#fff;font:inherit;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;margin:6px 0;text-decoration:none;transition:background .18s,box-shadow .18s,transform .18s}
.temporary-event-form button:hover:not(:disabled),.temporary-event-form .event-link:hover{background:#104ba8;box-shadow:0 7px 17px rgba(23,96,206,.2);transform:translateY(-1px)}
.temporary-event-form button:active:not(:disabled){background:#0b3a86;transform:translateY(1px);box-shadow:none}
.temporary-event-form button:disabled{opacity:.5;cursor:not-allowed}
#event-geolocation{background:#e8f1ff;color:#1454b5;border-color:#b7d2fa;justify-self:start}
#event-geolocation:hover{background:#d5e6ff;color:#0c408f}
#temporary-event-error:not(:empty){padding:12px 16px;background:#edf5ff;border-left:4px solid #1760ce;border-radius:10px}
#event-drafts a,.temporary-event-form a{overflow-wrap:anywhere}
#event-after-save{background:#fff;border:1px solid #e0e8f3;border-radius:20px;padding:24px;margin-top:20px}
#event-after-save[hidden]{display:none}
.temporary-event-form iframe{width:100%;height:600px;border:1px solid #a9b8cb}
@media(max-width:650px){.temporary-event-form fieldset{grid-template-columns:1fr;padding:20px 16px;gap:16px}.temporary-event-form{padding:20px 12px 40px}.temporary-event-form button[type=submit]{width:100%}.temporary-event-form input[type=file]::file-selector-button{margin-right:8px;padding:10px}}
@media(prefers-reduced-motion:reduce){.temporary-event-form *, .temporary-event-form *::file-selector-button{transition:none!important;transform:none!important}}
.temporary-event-form .event-map-group{grid-column:1/-1;display:grid;gap:12px}.temporary-event-form .event-coordinates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.temporary-event-form .event-map{height:310px;border:1px solid #b9c9de;border-radius:16px;overflow:hidden;background:#eaf2fb;z-index:0}.temporary-event-form .event-map-note{color:#52677f;font-size:.9rem;margin:0}.temporary-event-form .event-review-check{display:flex;align-items:center;gap:10px;padding:14px 16px;border:1.5px solid #c7d6ea;border-radius:12px;cursor:pointer;transition:background .18s,border-color .18s,box-shadow .18s}.temporary-event-form .event-review-check:hover{background:#e8f2ff;border-color:#1760ce}.temporary-event-form .event-review-check:has(input:checked){background:#e2f0ff;border-color:#1760ce;box-shadow:0 0 0 2px rgba(23,96,206,.09)}.temporary-event-form .event-review-check input{flex:none}.temporary-event-form #event-drafts a{display:inline-block;padding:7px 12px;background:#fff;border:1px solid #c5d5ec;border-radius:10px;text-decoration:none;color:#1454b5}.temporary-event-form #event-drafts a:hover{background:#e8f2ff}@media(max-width:650px){.temporary-event-form .event-coordinates{grid-template-columns:1fr}.temporary-event-form .event-map{height:260px}}</style><section class="temporary-event-form" aria-labelledby="temporary-heading">
 <nav id="event-drafts" aria-label="Mis eventos"></nav><h2 id="temporary-heading">Crear Dirección Temporal</h2>
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
 <fieldset><legend>Fotografías</legend><label>Foto principal obligatoria<input name="photo1" type="file" accept="image/jpeg,image/png,image/webp"></label><label>Fotografía 2 (opcional)<input name="photo2" type="file" accept="image/jpeg,image/png,image/webp"></label><label>Fotografía 3 (opcional)<input name="photo3" type="file" accept="image/jpeg,image/png,image/webp"></label><p>Hasta 3 fotos, máximo 8 MB cada una. Puedes guardar el borrador antes de subirlas.</p></fieldset>
 <button type="button" id="event-geolocation">Usar mi ubicación</button>
 <p id="temporary-event-error" role="alert" aria-live="polite"></p>
 <button type="submit">Guardar borrador</button>
 </form><section id="event-after-save" hidden><a id="event-preview-link" target="_blank" rel="noopener" class="event-link">Ver vista previa privada</a><p>Revisa la vista previa antes de pagar.</p><label class="event-review-check"><input id="event-reviewed" type="checkbox"> He revisado la vista previa</label><label>Celular Yappy<input id="event-alias" type="tel" inputmode="numeric" maxlength="8"></label><div id="event-pay-container">${paymentsEnabled?'<btn-yappy theme="blue"></btn-yappy>':'<p>Cobros desactivados. Puedes guardar y revisar tu borrador.</p>'}</div><button id="event-state" type="button">Consultar estado</button><p id="event-payment-message" role="status"></p></section></section>`;
}
/** Bind only on authenticated pages; server must independently validate and check session + CSRF. */
export const temporaryEventDraftClientScript=`(() => {
 const form=document.getElementById('temporary-event-draft');if(!form)return;
 const error=document.getElementById('temporary-event-error');let eventId=new URL(location.href).searchParams.get('draft');
 fetch('/v1/user/temporary-events',{cache:'no-store'}).then(r=>r.json()).then(data=>{const list=document.getElementById('event-drafts');for(const e of data.events||[]){const a=document.createElement('a');a.href='/panel/evento/nuevo?draft='+encodeURIComponent(e.id);a.textContent=e.title+' · '+e.status;const p=document.createElement('p');p.append(a);list.append(p)}}).catch(()=>{});
 const ajax={'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest'};
 const state=async()=>{if(!eventId)return;const r=await fetch('/v1/user/temporary-events/'+eventId,{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error('No se pudo recuperar el borrador');return data.event};
 const mapElement=document.getElementById('event-location-map'),mapStatus=document.getElementById('event-map-status');let eventMap=null,eventMarker=null;
 const setPoint=(lat,lon,move=true)=>{if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;form.elements.latitude.value=lat.toFixed(6);form.elements.longitude.value=lon.toFixed(6);if(mapStatus&&mapStatus.isConnected)mapStatus.textContent='Punto seleccionado: '+lat.toFixed(6)+', '+lon.toFixed(6);if(eventMap&&window.L){if(eventMarker)eventMarker.setLatLng([lat,lon]);else eventMarker=window.L.marker([lat,lon]).addTo(eventMap);if(move)eventMap.setView([lat,lon],Math.max(eventMap.getZoom(),15));}};
 const syncPoint=()=>{const lat=Number(form.elements.latitude.value),lon=Number(form.elements.longitude.value);if(form.elements.latitude.value!==''&&form.elements.longitude.value!==''&&Number.isFinite(lat)&&Number.isFinite(lon))setPoint(lat,lon)};
 form.elements.latitude.addEventListener('change',syncPoint);form.elements.longitude.addEventListener('change',syncPoint);
 const initMap=()=>{if(!window.L||!mapElement||!mapElement.isConnected)return;eventMap=window.L.map(mapElement).setView([8.5,-80],7);window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(eventMap);eventMap.on('click',e=>setPoint(e.latlng.lat,e.latlng.lng,false));syncPoint();};
 const mapCss=document.createElement('link');mapCss.rel='stylesheet';mapCss.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';mapCss.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyo2x5s3z8v+K3w=';mapCss.crossOrigin='anonymous';document.head.append(mapCss);
 const mapJs=document.createElement('script');mapJs.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';mapJs.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';mapJs.crossOrigin='anonymous';mapJs.onload=initMap;mapJs.onerror=()=>{if(mapStatus&&mapStatus.isConnected)mapStatus.textContent='El mapa no pudo cargar. Puedes introducir las coordenadas o usar tu ubicación.'};document.head.append(mapJs);
 document.getElementById('event-geolocation').onclick=()=>{if(!navigator.geolocation){error.textContent='Ubicación no disponible';return}navigator.geolocation.getCurrentPosition(p=>setPoint(p.coords.latitude,p.coords.longitude),()=>{error.textContent='No se pudo obtener la ubicación. Puedes escribir las coordenadas.'})};
 const after=()=>{document.getElementById('event-after-save').hidden=false;document.getElementById('event-preview-link').href='/v1/user/temporary-events/'+eventId+'/preview'};
 document.getElementById('event-state').onclick=async()=>{try{const e=await state();const m=document.getElementById('event-payment-message');m.textContent=e.status==='ACTIVE'?'Pago confirmado. Dirección publicada.':e.status==='EXPIRED'?'Evento finalizado.':'Estado: '+e.status;if(e.status==='ACTIVE'){const a=document.createElement('a');a.href='/evento/'+e.slug;a.textContent=' Abrir evento';m.append(a)}}catch(e){error.textContent=e.message}};
 if(eventId)state().then(e=>{const fields={title:'title',description:'description',responsibleName:'responsible_name',responsibleEmail:'responsible_email',responsiblePhone:'responsible_phone',countryCode:'country_code',province:'region',district:'municipality',corregimiento:'locality',reference:'reference',latitude:'latitude',longitude:'longitude',startsOn:'starts_on',endsOn:'ends_on',timezone:'event_timezone',hours:'hours_description',publicContactName:'public_contact_name',publicContactPhone:'public_contact_phone'};for(const [k,v]of Object.entries(fields))form.elements[k].value=e[v]??'';form.elements.publicContactConsent.checked=e.public_contact_consent;syncPoint();after()}).catch(e=>error.textContent=e.message);
 const pay=document.querySelector('btn-yappy');if(pay)pay.addEventListener('eventClick',async()=>{if(!eventId||!document.getElementById('event-reviewed').checked){error.textContent='Guarda y revisa la vista previa antes de pagar.';return}try{const r=await fetch('/v1/user/temporary-events/'+eventId+'/payment',{method:'POST',headers:ajax,body:JSON.stringify({alias:document.getElementById('event-alias').value})});const v=await r.json();if(!r.ok)throw Error(v.error);pay.eventPayment({transactionId:v.transactionId,token:v.token,documentName:v.documentName});document.getElementById('event-payment-message').textContent='Confirma en Yappy y consulta el estado.'}catch(e){error.textContent='No se pudo iniciar el pago: '+e.message}});

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
  for(const k of ['photo1','photo2','photo3'])delete payload[k];
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  try {
   const response=await fetch(eventId?form.dataset.action+'/'+eventId:form.dataset.action,{method:eventId?'PUT':'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest'},body:JSON.stringify(payload)});
   if(!response.ok)throw Error('No se pudo guardar el borrador ('+response.status+').');
   const data=await response.json();
   if(typeof data.id!=='string')throw Error('Respuesta de guardado inválida.');
   eventId=data.id;const u=new URL(location.href);u.searchParams.set('draft',eventId);history.replaceState(null,'',u);after();
   for(let slot=1;slot<=3;slot++){const f=form.elements['photo'+slot].files[0];if(!f)continue;const body=new FormData();body.set('slot',String(slot));body.set('photo',f);const result=await fetch('/v1/user/temporary-events/'+eventId+'/photos',{method:'POST',headers:{'X-Requested-With':'XMLHttpRequest'},body});if(!result.ok)throw Error('Borrador guardado; no se pudo subir la fotografía '+slot+'. Puedes reintentar.');form.elements['photo'+slot].value=''}
   error.textContent='Borrador guardado. Continúa con las fotografías y la vista previa.';
   form.dispatchEvent(new CustomEvent('temporary-event:saved',{bubbles:true,detail:{id:data.id}}));
  }catch(e){error.textContent=e instanceof Error?e.message:'Error de conexión';}
  finally{button.disabled=false;}
 });
})();`;
