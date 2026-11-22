import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {renderTemporaryEventDraftForm,temporaryEventDraftClientScript} from './temporary-event-form';

test('temporary event country selector precedes dates and timezone',()=>{
 const html=renderTemporaryEventDraftForm();
 const country=html.indexOf('<select name="countryCode"');
 assert.ok(country>0);
 assert.ok(country<html.indexOf('name="startsOn"'));
 assert.ok(country<html.indexOf('name="timezone"'));
 for(const code of ['PA','CR','CO','GT','SV','HN','NI','MX'])assert.ok(html.includes('value="'+code+'"'));
 assert.ok(!html.includes('País (código ISO)'));
});

test('country controls timezone, territory labels and map center without altering stored coordinates on draft restoration',()=>{
 const js=temporaryEventDraftClientScript;
 assert.ok(js.includes("CR:{zone:'America/Costa_Rica'"));
 assert.ok(js.includes("form.elements.countryCode.addEventListener('change',()=>applyCountry(true))"));
 assert.ok(js.includes('if(reset)input.value='));
 assert.ok(js.includes('if(reset){form.elements.latitude.value='));
 assert.ok(js.includes('form.elements.publicContactConsent.checked=e.public_contact_consent;applyCountry();'));
 assert.ok(js.includes('countrySettings[form.elements.countryCode.value]'));
});
