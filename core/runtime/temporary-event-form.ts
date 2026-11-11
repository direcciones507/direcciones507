import {validateTemporaryEventDraft,type TemporaryEventDraft} from './temporary-event-validation';

/** Standalone form for the authenticated panel; server must still authenticate and validate.
 * No payment or publication occurs on submit until the backend endpoint is connected.
 */
export function temporaryEventFormHtml():string{
 return `<section class="temporary-event-form" aria-labelledby="temporary-event-title">
 <h2 id="temporary-event-title">Crear Dirección Temporal</h2>
 <p>Evento de 1 a 30 días · Precio único: $7.99. La dirección se activa después del pago confirmado.</p>
 <form id="temporaryEventForm" enctype="multipart/form-data">
 <label>Nombre del evento <input name="eventName" maxlength="160" required placeholder="Fiesta de 15 años de María Sofía"></label>
 <label>Tipo de evento <input name="eventType" maxlength="100" required placeholder="Cumpleaños, boda, feria..."></label>
 <label>Homenajeado u organizador (opcional) <input name="honoreeOrOrganizer" maxlength="160"></label>
 <label>Descripción <textarea name="description" maxlength="4000"></textarea></label>
 <label>Fecha de inicio <input type="date" name="startDate" required></label>
 <label>Fecha final <input type="date" name="endDate" required></label>
 <fieldset><legend>Responsable (información privada, no visible al público)</legend>
 <label>Nombre <input name="responsibleName" maxlength="160" required></label>
 <label>Teléfono <input type="tel" name="responsiblePhone" maxlength="30" required></label>
 <label>Correo <input type="email" name="responsibleEmail" maxlength="160" required></label>
 </fieldset>
 <fieldset><legend>Contacto público</legend>
 <label>Nombre de contacto <input name="publicContactName" maxlength="160" required></label>
 <label><input type="checkbox" name="publishPublicPhone"> Autorizar publicación del teléfono de contacto</label>
 <label>Teléfono público <input type="tel" name="publicContactPhone" maxlength="30"></label>
 </fieldset>
 <fieldset><legend>Ubicación</legend>
 <label>País <input name="countryCode" maxlength="2" value="PA" required></label>
 <label>Zona horaria del evento <select name="timeZone" required><option value="America/Panama">Panamá</option><option value="America/Bogota">Colombia</option><option value="America/Costa_Rica">Costa Rica</option><option value="America/Guatemala">Guatemala</option><option value="America/El_Salvador">El Salvador</option><option value="America/Tegucigalpa">Honduras</option><option value="America/Managua">Nicaragua</option><option value="America/Mexico_City">México (centro)</option></select></label>
 <label>Provincia <input name="region" maxlength="120" required></label>
 <label>Distrito <input name="municipality" maxlength="120" required></label>
 <label>Corregimiento <input name="locality" maxlength="120"></label>
 <label>Referencia <textarea name="reference" maxlength="1000" required></textarea></label>
 <label>Latitud <input name="latitude" type="number" min="-90" max="90" step="any" required></label>
 <label>Longitud <input name="longitude" type="number" min="-180" max="180" step="any" required></label>
 </fieldset>
 <label>Foto principal <input name="mainPhoto" type="file" accept="image/jpeg,image/png,image/webp" required></label>
 <label>Foto adicional 1 (opcional) <input name="photo2" type="file" accept="image/jpeg,image/png,image/webp"></label>
 <label>Foto adicional 2 (opcional) <input name="photo3" type="file" accept="image/jpeg,image/png,image/webp"></label>
 <p>La ficha tendrá un enlace con el nombre del evento, no tendrá código AD507 y no será indexable.</p>
 <button type="submit">Guardar evento y continuar al pago</button>
 <p id="temporaryEventFeedback" role="status" aria-live="polite"></p>
 </form></section>`;
}
export function temporaryEventFormDraft(form:FormData):TemporaryEventDraft{
 const get=(name:string)=>String(form.get(name)??'');
 const files=['mainPhoto','photo2','photo3'].map(k=>form.get(k)).filter((f):f is File=>typeof File!=='undefined'&&f instanceof File&&f.size>0);
 if(typeof File==='undefined'||!(form.get('mainPhoto') instanceof File)||(form.get('mainPhoto') as File).size===0)throw Error('MAIN_PHOTO_REQUIRED');
 return validateTemporaryEventDraft({
 eventName:get('eventName'),eventType:get('eventType'),honoreeOrOrganizer:get('honoreeOrOrganizer'),region:get('region'),municipality:get('municipality'),locality:get('locality'),timeZone:get('timeZone'),description:get('description'),startDate:get('startDate'),endDate:get('endDate'),
 responsibleName:get('responsibleName'),responsiblePhone:get('responsiblePhone'),responsibleEmail:get('responsibleEmail'),
 publicContactName:get('publicContactName'),publicContactPhone:get('publicContactPhone'),
 publishPublicPhone:form.get('publishPublicPhone')==='on',
 countryCode:get('countryCode'),reference:get('reference'),
 latitude:Number(get('latitude')),longitude:Number(get('longitude')),photoCount:files.length
 });
}
