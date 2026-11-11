import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {renderTemporaryEventPage} from './temporary-event-page';
import {renderTemporaryEventDraftForm} from './temporary-event-form';
import {validateTemporaryEventDraft} from './temporary-event-draft';
const draft=validateTemporaryEventDraft({
 title:'Fiesta <privada>',description:'Música & baile',responsibleName:'Nombre SECRETO',
 responsibleEmail:'secreto@example.com',responsiblePhone:'+50761234567',
 countryCode:'PA',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',
 reference:'Parque central',startsOn:'2026-11-11',endsOn:'2026-11-11',
 timezone:'America/Panama',hours:'19:00',latitude:8.1,longitude:-80.9
});
const event={draft,slug:'fiesta-0123456789abcdef',status:'ACTIVE' as const,
 paymentConfirmedAt:'2026-11-11T12:00:00Z',photos:['https://example.com/photo.jpg']};
test('public page escapes HTML and never exposes responsible identity',()=>{
 const html=renderTemporaryEventPage(event);
 assert.match(html,/Fiesta &lt;privada&gt;/);
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/Google Maps/);
 assert.match(html,/Waze/);
 for(const secret of ['Nombre SECRETO','secreto@example.com','+50761234567'])assert.equal(html.includes(secret),false);
});
test('unpaid events cannot render as active',()=>{
 assert.throws(()=>renderTemporaryEventPage({...event,paymentConfirmedAt:null}),/UNPAID/);
});
test('expired event removes navigation and photos',()=>{
 const html=renderTemporaryEventPage({...event,status:'EXPIRED'});
 assert.match(html,/evento ha finalizado/);
 assert.doesNotMatch(html,/Google Maps/);
 assert.doesNotMatch(html,/photo.jpg/);
});
test('rejects untrusted photo URLs',()=>{
 const html=renderTemporaryEventPage({...event,photos:['javascript:alert(1)','http://example.com/photo.jpg']});
 assert.doesNotMatch(html,/javascript:alert/);
 assert.doesNotMatch(html,/photo.jpg/);
});
test('draft form is draft-only and requires private responsible details',()=>{
 const html=renderTemporaryEventDraftForm();
 assert.match(html,/Guardar borrador/);
 assert.match(html,/responsibleEmail/);
 assert.match(html,/publicContactConsent/);
 assert.throws(()=>renderTemporaryEventDraftForm('https://untrusted.example/submit'),/INVALID_FORM_ACTION/);
});
