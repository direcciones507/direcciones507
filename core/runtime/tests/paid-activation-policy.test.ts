import {test,expect} from 'bun:test';
import {isAutomaticPaidPlan,automaticPaidStateAllowed} from '../paid-activation-policy';
test('only paid products use automatic activation; free and historical records remain manual',()=>{
 for(const [type,plan]of [['RESIDENTIAL','RESIDENTIAL'],['BUSINESS','BUSINESS_PREMIUM'],['BUSINESS','BUSINESS_PREMIUM_PRO']])expect(isAutomaticPaidPlan({type,plan})).toBe(true);
 for(const [type,plan]of [['PLACE','PLACE'],['BUSINESS','BUSINESS_FREE'],['BUSINESS','RESIDENTIAL']])expect(isAutomaticPaidPlan({type,plan})).toBe(false);
 expect(isAutomaticPaidPlan({address_type:'BUSINESS',request_data:{plan:'BUSINESS_PREMIUM',migration:{}}})).toBe(false);
});
test('automatic eligibility distinguishes completed pending payment from incomplete drafts and exceptional review',()=>{
 const row={address_type:'BUSINESS',request_data:{plan:'BUSINESS_PREMIUM',workflow:'PAYMENT_PENDING'},status:'DRAFT'};
 expect(automaticPaidStateAllowed(row)).toBe(true);expect(automaticPaidStateAllowed({...row,request_data:{plan:'BUSINESS_PREMIUM'}})).toBe(false);
 expect(automaticPaidStateAllowed({...row,status:'PENDING_REVIEW'})).toBe(false);
 expect(automaticPaidStateAllowed({...row,status:'PENDING_REVIEW',review_decision:'APPROVED',request_data:{plan:'BUSINESS_PREMIUM',workflow:'SECURITY_REVIEW'}})).toBe(true);
});
