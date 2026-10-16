import {test,expect} from 'bun:test';
import {reserveBusinessTrialInTransaction} from '../free-business-trial-claims-repository';
test('rejects prior strong match without inserting a new claim',async()=>{
 const statements:string[]=[];
 const fake={unsafe:async(q:string)=>{statements.push(q);if(q.includes('FROM ad507.free_business_trial_claims'))return [{name:'fonda tatiana',phone:'50760001111',countryCode:'PA',latitude:null,longitude:null}];return [];}};
 await expect(reserveBusinessTrialInTransaction(fake as any,'00000000-0000-0000-0000-000000000001',{name:'Fónda Tatiana',phone:'+507 6000-1111',countryCode:'PA'},new Date('2026-10-16T12:00:00Z'),new Date('2026-10-16T11:00:00Z'))).rejects.toThrow('FREE_TRIAL_ALREADY_USED');
 expect(statements.some(s=>s.includes('INSERT INTO ad507.free_business_trial_claims'))).toBe(false);
});
test('ambiguous identity requires admin review',async()=>{
 const fake={unsafe:async(q:string)=>q.includes('FROM ad507.free_business_trial_claims')?[{name:'another business',phone:'50760001111',countryCode:'PA',latitude:null,longitude:null}]:[]};
 await expect(reserveBusinessTrialInTransaction(fake as any,'00000000-0000-0000-0000-000000000001',{name:'Fonda Tatiana',phone:'50760001111',countryCode:'PA'},new Date('2026-10-16T12:00:00Z'),new Date('2026-10-16T11:00:00Z'))).rejects.toThrow('FREE_TRIAL_IDENTITY_REVIEW_REQUIRED');
});

test('ineligible address cannot create a permanent claim',async()=>{
 const statements:string[]=[];
 const fake={unsafe:async(q:string)=>{statements.push(q);if(q.includes('UPDATE ad507.addresses'))return [];return [];}};
 await expect(reserveBusinessTrialInTransaction(fake as any,'00000000-0000-0000-0000-000000000001',{name:'Fonda Tatiana',phone:'50760001111',countryCode:'PA'},new Date('2026-10-16T12:00:00Z'),new Date('2026-10-16T11:00:00Z'))).rejects.toThrow('FREE_TRIAL_ADDRESS_NOT_ELIGIBLE');
 expect(statements.some(q=>q.includes('INSERT INTO ad507.free_business_trial_claims'))).toBe(false);
});
test('eligible address writes one claim after successful address update',async()=>{
 const statements:string[]=[];
 const fake={unsafe:async(q:string)=>{statements.push(q);if(q.includes('UPDATE ad507.addresses'))return [{id:'00000000-0000-0000-0000-000000000001'}];return [];}};
 await reserveBusinessTrialInTransaction(fake as any,'00000000-0000-0000-0000-000000000001',{name:'Fonda Tatiana',phone:'50760001111',countryCode:'PA'},new Date('2026-10-16T12:00:00Z'),new Date('2026-10-16T11:00:00Z'));
 const update=statements.findIndex(q=>q.includes('UPDATE ad507.addresses'));
 const insert=statements.findIndex(q=>q.includes('INSERT INTO ad507.free_business_trial_claims'));
 expect(update).toBeGreaterThan(-1);
 expect(insert).toBeGreaterThan(update);
});

test('registration after campaign cutoff is denied before DB access',async()=>{
 let accessed=false;
 const fake={unsafe:async()=>{accessed=true;return [];}};
 await expect(reserveBusinessTrialInTransaction(fake as any,'00000000-0000-0000-0000-000000000001',{name:'Fonda Tatiana',phone:'50760001111',countryCode:'PA'},new Date('2026-11-12T12:00:00Z'),new Date('2026-11-10T05:00:00Z'))).rejects.toThrow('FREE_BUSINESS_OFFER_CLOSED');
 expect(accessed).toBe(false);
});
