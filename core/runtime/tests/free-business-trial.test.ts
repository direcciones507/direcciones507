import {test,expect} from 'bun:test';
import {freeBusinessOfferEligible,freeBusinessTrialEndsAt,freeBusinessTrialState,firstUpgradeAmountCents} from '../free-business-trial';
test('Panama campaign cutoff',()=>{
 expect(freeBusinessOfferEligible(new Date('2026-11-10T04:59:59.999Z'))).toBe(true);
 expect(freeBusinessOfferEligible(new Date('2026-11-10T05:00:00.000Z'))).toBe(false);
});
test('two calendar months and expiration boundary',()=>{
 const end=freeBusinessTrialEndsAt(new Date('2026-10-31T12:00:00Z'));
 expect(end.toISOString()).toBe('2026-12-31T12:00:00.000Z');
 expect(freeBusinessTrialState(end,new Date(end.getTime()-1))).toBe('ACTIVE');
 expect(freeBusinessTrialState(end,end)).toBe('EXPIRED');
});
test('discount only first premium/pro upgrade',()=>{
 expect(firstUpgradeAmountCents('BUSINESS_PREMIUM',1999,true,false)).toBe(1499);
 expect(firstUpgradeAmountCents('BUSINESS_PREMIUM_PRO',3999,true,false)).toBe(2999);
 expect(firstUpgradeAmountCents('BUSINESS_PREMIUM',1999,true,true)).toBe(1999);
 expect(firstUpgradeAmountCents('BUSINESS_PREMIUM',1999,false,false)).toBe(1999);
});
