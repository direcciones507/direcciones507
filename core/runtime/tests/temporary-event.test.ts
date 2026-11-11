import {test,expect} from 'bun:test';
import {paymentAmount} from '../payment-policy';
import {validateTemporaryEventDraft,temporaryEventExpiryCalendarDate,TEMPORARY_EVENT_PRICE_CENTS} from '../temporary-event-validation';
import {temporaryEventSlug,temporaryEventShareMeta} from '../temporary-event-share';
const draft={
 eventName:'Fiesta de 15 años de María Sofía',responsibleName:'Responsable privado',
 responsiblePhone:'61234567',responsibleEmail:'responsable@example.com',
 publicContactName:'Organización',publicContactPhone:'69999999',publishPublicPhone:false,
 startDate:'2026-11-30',endDate:'2026-11-30',countryCode:'PA',
 reference:'Salón principal',description:'Celebración',latitude:8.1,longitude:-80.9,photoCount:3
};
test('temporary event validates 1 to 30 days and 1 to 3 photos',()=>{
 expect(validateTemporaryEventDraft(draft).photoCount).toBe(3);
 expect(validateTemporaryEventDraft({...draft,photoCount:1}).photoCount).toBe(1);
 expect(()=>validateTemporaryEventDraft({...draft,photoCount:4})).toThrow('INVALID_PHOTO_COUNT');
 expect(()=>validateTemporaryEventDraft({...draft,endDate:'2026-12-30'})).toThrow('INVALID_EVENT_DURATION');
 expect(()=>validateTemporaryEventDraft({...draft,endDate:'2026-11-29'})).toThrow('INVALID_EVENT_DURATION');
 expect(TEMPORARY_EVENT_PRICE_CENTS).toBe(799);
 expect(paymentAmount('TEMPORARY_ADDRESS')).toBe(799);
 expect(paymentAmount('BUSINESS_PREMIUM')).toBe(1999);
 expect(paymentAmount('BUSINESS_PREMIUM_PRO')).toBe(3999);
});
test('private responsible data never becomes public contact',()=>{
 const event=validateTemporaryEventDraft(draft);
 expect(event.publicContactPhone).toBeNull();
 expect(event.responsiblePhone).toBe('61234567');
 expect(validateTemporaryEventDraft({...draft,publishPublicPhone:true}).publicContactPhone).toBe('69999999');
});
test('event remains valid through following calendar day',()=>{
 expect(temporaryEventExpiryCalendarDate('2026-11-30')).toBe('2026-12-02');
});
test('share slug and OG contain no AD507 and noindex',()=>{
 expect(temporaryEventSlug('Fiesta de 15 años de María Sofía')).toBe('fiesta-de-15-anos-de-maria-sofia');
 const meta=temporaryEventShareMeta({name:draft.eventName,description:'Invitación',imageUrl:'https://example.com/main.webp',canonicalUrl:'https://direcciones.lat/evento/fiesta-de-15-anos-de-maria-sofia'});
 expect(meta).toContain('noindex,nofollow');
 expect(meta).toContain('https://example.com/main.webp');
 expect(meta).toContain('summary_large_image');
 expect(meta).not.toContain('AD507-');
});
test('escape HTML in event metadata',()=>{
 const meta=temporaryEventShareMeta({name:'<script>alert(1)</script>',description:'"quoted"',imageUrl:'https://example.com/main.webp',canonicalUrl:'https://direcciones507.com/evento/prueba'});
 expect(meta).not.toContain('<script>');
 expect(meta).toContain('&lt;script&gt;');
 expect(meta).toContain('&quot;quoted&quot;');
});
