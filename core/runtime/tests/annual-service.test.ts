import {test,expect} from 'bun:test';
import {annualEnd,serviceExpired,ANNUAL_POLICY} from '../annual-service';
test('one calendar year preserves UTC time, clamps leap day, never grants monthly or lifetime service',()=>{
 expect(annualEnd('2028-02-29T12:34:56.789Z')).toBe('2029-02-28T12:34:56.789Z');
 expect(annualEnd('2026-12-31T23:59:59.000Z')).toBe('2027-12-31T23:59:59.000Z');
 expect(()=>annualEnd('invalid')).toThrow();
});
test('expiry gates new contracts only, preserving all prior and historical rights',()=>{
 const now=Date.parse('2027-01-01T00:00:00Z');
 expect(serviceExpired({},now)).toBe(false);
 expect(serviceExpired({annualService:{policy:'old',endsAt:'2020-01-01'}},now)).toBe(false);
 expect(serviceExpired({migration:{},annualService:{policy:ANNUAL_POLICY,endsAt:'2020-01-01'}},now)).toBe(false);
 expect(serviceExpired({annualService:{policy:ANNUAL_POLICY,startsAt:'2026-01-01',endsAt:'2027-01-01T00:00:00Z'}},now)).toBe(true);
 expect(serviceExpired({annualService:{policy:ANNUAL_POLICY,startsAt:'2026-01-01',endsAt:'2027-01-01T00:00:01Z'}},now)).toBe(false);
 expect(serviceExpired({annualService:{policy:ANNUAL_POLICY,startsAt:'2026-01-01',endsAt:'bad'}},now)).toBe(true);
});

test('approved purchase modes use exact integer cents, yearly service and explicit installment totals',async()=>{
 const {commercialQuote:q}=await import('../commercial-policy');
 expect(q('BUSINESS_PREMIUM','ANNUAL').amountCents).toBe(2999);expect(q('BUSINESS_PREMIUM_PRO','ANNUAL').amountCents).toBe(4999);
 expect(q('BUSINESS_PREMIUM','INSTALLMENTS')).toMatchObject({amountCents:1650,totalCents:3300,durationMonths:12,installments:2});
 expect(q('BUSINESS_PREMIUM_PRO','SECOND_INSTALLMENT')).toMatchObject({amountCents:2750,totalCents:5500,durationMonths:12,installments:2});
 expect(q('PLACE','PLACE_AD_30')).toMatchObject({amountCents:1499,durationDays:30});expect(q('PLACE','PLACE_AD_365')).toMatchObject({amountCents:16189,durationDays:365});
 expect(()=>q('RESIDENTIAL','INSTALLMENTS')).toThrow();expect(()=>q('BUSINESS_PREMIUM','PLACE_AD_365')).toThrow();expect(()=>q('BUSINESS_FREE','ANNUAL')).toThrow();
 const {effectiveServicePlan:p}=await import('../annual-service');
 const data={annualService:{policy:ANNUAL_POLICY,mode:'INSTALLMENTS',fullyPaid:false,startsAt:'2026-01-01T00:00:00Z',endsAt:'2027-01-01T00:00:00Z',secondDueAt:'2026-01-31T00:00:00Z'}};
 expect(p(data,'BUSINESS_PREMIUM',Date.parse('2026-05-01'))).toBe('BUSINESS_PREMIUM');
 expect(p(data,'BUSINESS_PREMIUM',Date.parse('2026-07-01'))).toBe('BUSINESS_FREE');
 expect(p(data,'BUSINESS_PREMIUM_PRO',Date.parse('2026-02-06'))).toBe('BUSINESS_PREMIUM');
 expect(p(data,'BUSINESS_PREMIUM_PRO',Date.parse('2027-01-01'))).toBe('BUSINESS_FREE');
});
