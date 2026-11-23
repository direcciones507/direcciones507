import type {Sql} from 'postgres';
import {commercialQuote} from './commercial-policy';
import {assertCountryCommerce} from './country-configuration';
import {isPayableClientRequest} from './paid-activation-policy';

/**
 * Pagadito Sandbox read-only bridge to the existing Core order/address tables.
 * Deliberately cannot create an order, charge a card or activate an address.
 * Write operations require a dedicated provider-specific ledger integration.
 */
export const CERTIFICATION_AMOUNTS:Readonly<Record<string,number>>=Object.freeze({CERTIFICATION_1:1844,CERTIFICATION_2:2379,CERTIFICATION_3:9991,CERTIFICATION_4:10412});
export const CERTIFICATION_REQUEST_ID='bcd3213d-1b3a-4072-9570-e83c97480fa4';
export const isCertificationMode=(mode:string)=>Object.hasOwn(CERTIFICATION_AMOUNTS,mode);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function createPagaditoSandboxOrderBridge(sql:Sql) {
  return Object.freeze({
    async quote(userId:string,addressId:string,mode='ANNUAL') {
      if(isCertificationMode(mode)&&addressId!==CERTIFICATION_REQUEST_ID)throw Error('PAYMENT_NOT_FOUND');
      if(!uuid.test(userId)||!uuid.test(addressId))throw Error('PAYMENT_NOT_FOUND');
      return sql.begin(async tx=>{
        const rows=await tx.unsafe(
          "SELECT a.* FROM ad507.addresses a JOIN ad507.address_ownership o ON o.address_id=a.id JOIN ad507.users u ON u.id=o.user_id WHERE a.id=$1::uuid AND o.user_id=$2::uuid AND o.ownership_role='OWNER' AND u.status='ACTIVE' AND a.source='USER_REQUEST' FOR SHARE OF a",
          [addressId,userId]
        );
        if(!rows.length)throw Error('PAYMENT_NOT_FOUND');
        const address=rows[0];
        assertCountryCommerce(address.request_data?.countryCode??address.country_code??'PA');
        // The existing certification fixture remains usable after its commercial
        // request stops awaiting payment. This read-only Sandbox exception is ID-bound.
        const certificationFixture=addressId===CERTIFICATION_REQUEST_ID&&address.address_type==='BUSINESS'&&['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(address.request_data?.plan);
        if(!certificationFixture&&!isPayableClientRequest(address))throw Error('INVALID_PAYMENT_REQUEST');
        if(address.request_data?.migration)throw Error('INVALID_PAYMENT_REQUEST');
        const plan=address.request_data?.plan;
        const quote=isCertificationMode(mode)?{amountCents:CERTIFICATION_AMOUNTS[mode]}:commercialQuote(plan,mode);
        if(quote.amountCents<=0)throw Error('PAYMENT_PRODUCT_NOT_AVAILABLE');
        if(plan==='RESIDENTIAL')throw Error('PAYMENT_PRODUCT_NOT_AVAILABLE');
        // An existing Yappy/PayPal order may settle later: never create a competing charge.
        const existing=await tx.unsafe(
          "SELECT id,provider,status,payment_environment FROM ad507.orders WHERE address_id=$1::uuid AND payment_environment='test' ORDER BY created_at DESC LIMIT 1",
          [addressId]
        );
        return {
          addressId,code:address.code,plan,mode,
          amountCents:quote.amountCents,currency:'USD' as const,
          available:existing.length===0,
          blockedByExistingOrder:existing.length>0,
          // No card/payment entry until provider-specific persisted orders are implemented.
          checkoutEnabled:false
        };
      });
    }
  });
}
