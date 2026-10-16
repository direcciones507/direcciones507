import {test,expect} from 'bun:test';
import {businessTrialDuplicateSignal,normalizeBusinessName,freeTrialReviewDecision} from '../free-business-trial-identity';
test('normalizes accents and case',()=>expect(normalizeBusinessName(' Fónda   TATIANA! ')).toBe('fonda tatiana'));
test('identifies prior business with name and phone',()=>expect(businessTrialDuplicateSignal({name:'Fonda Tatiana',phone:'+507 6000-1111',countryCode:'PA'},{name:'FÓNDA TATIANA',phone:'50760001111',countryCode:'PA'})).toBe('SAME_NAME_AND_PHONE'));
test('does not automatically deny a different business sharing phone',()=>expect(businessTrialDuplicateSignal({name:'Negocio Uno',phone:'50760001111',countryCode:'PA'},{name:'Negocio Dos',phone:'50760001111',countryCode:'PA'})).toBe('REVIEW_REQUIRED'));

test('any identity overlap requires review',()=>{expect(freeTrialReviewDecision(['REVIEW_REQUIRED'])).toBe('REVIEW_REQUIRED');expect(freeTrialReviewDecision(['NONE'])).toBe('NO_MATCH');});
