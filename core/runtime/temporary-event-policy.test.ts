import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {validateTemporaryEventDraft,publicTemporaryEvent,eventSlug} from './temporary-event-draft';
import {temporaryEventDuration,eventIsExpired,canPublishTemporaryEvent,publicEventStatus} from './temporary-event-lifecycle';
const base={
 title:'Fiesta de Santiago',description:'Encuentro público',
 responsibleName:'Organizador Privado',responsibleEmail:'organizador@example.com',responsiblePhone:'+50760000000',
 countryCode:'PA',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',
 reference:'Parque central',startsOn:'2026-11-10',endsOn:'2026-11-10',
 timezone:'America/Panama',hours:'18:00 a 23:00',latitude:8.1,longitude:-80.9
};
test('draft is valid and responsible private data never appears in public payload',()=>{
 const draft=validateTemporaryEventDraft(base);
 const serialized=JSON.stringify(publicTemporaryEvent(draft));
 for(const secret of ['Organizador Privado','organizador@example.com','+50760000000'])assert.equal(serialized.includes(secret),false);
});
test('public contact requires explicit consent',()=>{
 assert.throws(()=>validateTemporaryEventDraft({...base,publicContactPhone:'1234'}),/CONSENT/);
 assert.equal(publicTemporaryEvent(validateTemporaryEventDraft({...base,publicContactPhone:'1234',publicContactConsent:true})).publicContactPhone,'1234');
});
test('invalid dates, durations, coordinates and timezone are rejected',()=>{
 assert.throws(()=>validateTemporaryEventDraft({...base,startsOn:'2026-02-30'}));
 assert.throws(()=>validateTemporaryEventDraft({...base,endsOn:'2026-12-11'}));
 assert.throws(()=>validateTemporaryEventDraft({...base,latitude:91}));
 assert.throws(()=>validateTemporaryEventDraft({...base,timezone:'Not/A_Zone'}));
 assert.equal(temporaryEventDuration('2026-11-01','2026-11-30'),30);
});
test('expiration respects Panama local midnight on second day',()=>{
 assert.equal(eventIsExpired('2026-11-10','America/Panama',new Date('2026-11-12T04:59:59Z')),false);
 assert.equal(eventIsExpired('2026-11-10','America/Panama',new Date('2026-11-12T05:00:00Z')),true);
 assert.equal(publicEventStatus('ACTIVE','2026-11-10','America/Panama',new Date('2026-11-12T05:00:00Z')),'EXPIRED');
});
test('payment confirmation and primary photo are mandatory for activation',()=>{
 const input={status:'AWAITING_PAYMENT' as const,paymentOrderId:'order',paymentConfirmedAt:'2026-11-10T12:00:00Z',
 startsOn:'2026-11-10',endsOn:'2026-11-10',timezone:'America/Panama',
 now:new Date('2026-11-10T13:00:00Z'),photoCount:1,hasPrimaryPhoto:true};
 assert.equal(canPublishTemporaryEvent(input),true);
 assert.equal(canPublishTemporaryEvent({...input,paymentConfirmedAt:null}),false);
 assert.equal(canPublishTemporaryEvent({...input,hasPrimaryPhoto:false}),false);
 assert.equal(canPublishTemporaryEvent({...input,photoCount:4}),false);
});
test('slugs use controlled opaque suffix',()=>{
 assert.equal(eventSlug('Fiesta Pública','0123456789abcdef'),'fiesta-publica-0123456789abcdef');
 assert.throws(()=>eventSlug('Fiesta','guessable'));
});

test('blank coordinates are absent rather than pointing to zero-zero',()=>{
 const draft=validateTemporaryEventDraft({...base,latitude:'',longitude:''});
 assert.equal(draft.latitude,null);
 assert.equal(draft.longitude,null);
 assert.throws(()=>validateTemporaryEventDraft({...base,latitude:'',longitude:-80.9}),/COORDINATES/);
});
