import {test,expect} from 'bun:test';
import {reserveBusinessTrialInTransaction} from '../free-business-trial-claims-repository';
test('rejects prior strong match without inserting a new claim',async()=>{
 const statements:string[]=[];
 const fake={unsafe:async(q:string)=>{statements.push(q);if(q.includes('FROM ad507.free_business_trial_claims'))return [{name:'fonda tatiana',phone:'50760001111',countryCode:'PA',latitude:null,longitude:null}];return [];}};
 await expect(reserveBusinessTrialInTransaction(fake as any,'00000000-0000-0000-0000-000000000001',{name:'Fónda Tatiana',phone:'+507 6000-1111',countryCode:'PA'},new Date('2026-10-16T12:00:00Z'))).rejects.toThrow('FREE_TRIAL_ALREADY_USED');
 expect(statements.some(s=>s.includes('INSERT INTO ad507.free_business_trial_claims'))).toBe(false);
});
test('ambiguous identity requires admin review',async()=>{
 const fake={unsafe:async(q:string)=>q.includes('FROM ad507.free_business_trial_claims')?[{name:'another business',phone:'50760001111',countryCode:'PA',latitude:null,longitude:null}]:[]};
 await expect(reserveBusinessTrialInTransaction(fake as any,'00000000-0000-0000-0000-000000000001',{name:'Fonda Tatiana',phone:'50760001111',countryCode:'PA'},new Date('2026-10-16T12:00:00Z'))).rejects.toThrow('FREE_TRIAL_IDENTITY_REVIEW_REQUIRED');
});
