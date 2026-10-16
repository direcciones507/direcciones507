import {test,expect} from 'bun:test';
import {freeBusinessOfferEligible,freeBusinessTrialEndsAt,freeBusinessTrialState,firstUpgradeAmountCents} from '../free-business-trial';
test('Panama campaign cutoff',()=>{
 expect(freeBusinessOfferEligible(new Date('2026-11-10T04:59:59.999Z'))).toBe(true);
 expect(freeBusinessOfferEligible(new Date('2026-11-10T05:00:00.000Z'))).toBe(false);
});
test('one calendar month and expiration boundary',()=>{
 const end=freeBusinessTrialEndsAt(new Date('2026-10-31T12:00:00Z'));
 expect(end.toISOString()).toBe('2026-11-30T12:00:00.000Z');
 expect(freeBusinessTrialState(end,new Date(end.getTime()-1))).toBe('ACTIVE');
 expect(freeBusinessTrialState(end,end)).toBe('EXPIRED');
});
test('discount only before expiry and on first premium/pro upgrade',()=>{
 const end=new Date('2026-11-16T12:00:00Z'),before=new Date(end.getTime()-1),after=new Date('2026-11-22T12:00:00Z');
 expect(firstUpgradeAmountCents('BUSINESS_PREMIUM',1999,true,false,end,before)).toBe(1499);
 expect(firstUpgradeAmountCents('BUSINESS_PREMIUM_PRO',3999,true,false,end,before)).toBe(2999);
 expect(firstUpgradeAmountCents('BUSINESS_PREMIUM',1999,true,true,end,before)).toBe(1999);
 expect(firstUpgradeAmountCents('BUSINESS_PREMIUM',1999,false,false,end,before)).toBe(1999);
 expect(firstUpgradeAmountCents('BUSINESS_PREMIUM',1999,true,false,end,end)).toBe(1999);
 expect(firstUpgradeAmountCents('BUSINESS_PREMIUM_PRO',3999,true,false,end,after)).toBe(3999);
});

test('Panama local month boundary near midnight UTC rollover',()=>{
 // Oct 31, 23:30 in Panama is Nov 1, 04:30 UTC.
 expect(freeBusinessTrialEndsAt(new Date('2026-11-01T04:30:00Z')).toISOString()).toBe('2026-12-01T04:30:00.000Z');
 // Oct 30, 23:30 in Panama remains the 30th in November.
 expect(freeBusinessTrialEndsAt(new Date('2026-10-31T04:30:00Z')).toISOString()).toBe('2026-12-01T04:30:00.000Z');
});

test('rejects activation after Panama offer cutoff and invalid dates',()=>{
 expect(()=>freeBusinessTrialEndsAt(new Date('2026-11-10T05:00:00.000Z'))).toThrow('FREE_BUSINESS_OFFER_CLOSED');
 expect(()=>freeBusinessTrialEndsAt(new Date('invalid'))).toThrow('INVALID_ACTIVATION_DATE');
});
test('Panama Oct 31 evening ends on Nov 30 evening',()=>{
 const activated=new Date('2026-11-01T04:30:00.000Z');
 const end=freeBusinessTrialEndsAt(activated);
 expect(end.toISOString()).toBe('2026-12-01T04:30:00.000Z');
 expect(freeBusinessTrialState(end,new Date('2026-12-01T04:29:59.999Z'))).toBe('ACTIVE');
 expect(freeBusinessTrialState(end,new Date('2026-12-01T04:30:00.000Z'))).toBe('EXPIRED');
});
