import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {Script} from 'node:vm';
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
 assert.ok(js.includes("if(reset){if(!eventId){form.elements.latitude.value="));
 assert.ok(js.includes('form.elements.publicContactConsent.checked=e.public_contact_consent;applyCountry();'));
 assert.ok(js.includes('countrySettings[form.elements.countryCode.value]'));
});

// Match the account browser bootstrap: every generated inline script must parse.
test('temporary form embeds shared labels as executable data without breaking account bootstrap',()=>{
 const html=renderTemporaryEventDraftForm()+'<script>'+temporaryEventDraftClientScript+'</script>';
 for(const [,source] of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new Script(source));
});
