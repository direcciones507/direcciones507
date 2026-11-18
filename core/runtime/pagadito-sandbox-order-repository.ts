import type {Sql} from 'postgres';
import {createHash,randomBytes} from 'node:crypto';
import {commercialQuote} from './commercial-policy';
import {assertCountryCommerce} from './country-configuration';
import {isPayableClientRequest} from './paid-activation-policy';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const idempotency=/^[A-Za-z0-9_-]{16,128}$/;

/**
 * Server-side order creation for Pagadito, environment-isolated.
 * NOT registered as an HTTP route. The proposed database constraints must be
 * reviewed/applied before this adapter is enabled.
 * No card data, provider API call or address activation happens here.
 */
export function createPagaditoOrderRepository(sql:Sql,environment:'sandbox'|'production'='sandbox') {
  const paymentEnvironment=environment==='sandbox'?'test':'production';
  return Object.freeze({
    async prepare(userId:string,addressId:string,key:string,mode='ANNUAL') {
      if(!uuid.test(userId)||!uuid.test(addressId))throw Error('PAYMENT_NOT_FOUND');
      if(!idempotency.test(key))throw Error('INVALID_IDEMPOTENCY_KEY');
      if(!['ANNUAL','INSTALLMENTS'].includes(mode))throw Error('INVALID_PAYMENT_MODE');
      return sql.begin(async tx=>{
        const rows=await tx.unsafe(
          "SELECT a.* FROM ad507.addresses a JOIN ad507.address_ownership o ON o.address_id=a.id JOIN ad507.users u ON u.id=o.user_id WHERE a.id=$1::uuid AND o.user_id=$2::uuid AND o.ownership_role='OWNER' AND u.status='ACTIVE' AND a.source='USER_REQUEST' FOR UPDATE OF a",
          [addressId,userId]
        );
        if(!rows.length)throw Error('PAYMENT_NOT_FOUND');
        const address=rows[0];
        assertCountryCommerce(address.request_data?.countryCode??'PA');
        if(address.request_data?.migration||!isPayableClientRequest(address))throw Error('INVALID_PAYMENT_REQUEST');
        const plan=address.request_data?.plan;
        const quote=commercialQuote(plan,mode);
        if(quote.amountCents<=0||plan==='RESIDENTIAL')throw Error('PAYMENT_PRODUCT_NOT_AVAILABLE');
        const operation=createHash('sha256').update('pagadito:'+paymentEnvironment+':'+userId+':'+addressId+':'+key).digest('hex');
        const existing=await tx.unsafe(
          "SELECT * FROM ad507.orders WHERE provider='PAGADITO' AND operation_key=$1",
          [operation]
        );
        if(existing.length){
          const previous=existing[0];
          if(String(previous.user_id)!==userId||String(previous.address_id)!==addressId||
             previous.payment_plan!==plan||previous.amount_cents!==quote.amountCents||
             previous.payment_environment!==paymentEnvironment)throw Error('PAYMENT_AMOUNT_CHANGED');
          return {required:true,order:previous,reused:true};
        }
        // Includes other payment providers, failed orders and uncertain timeouts.
        // A late settlement must never result in a duplicate payment.
        const other=await tx.unsafe(
          "SELECT id FROM ad507.orders WHERE address_id=$1::uuid AND payment_environment=$2 LIMIT 1",
          [addressId,paymentEnvironment]
        );
        if(other.length)throw Error('PAYMENT_ALREADY_EXISTS');
        const inserted=await tx.unsafe(
          "INSERT INTO ad507.orders(user_id,address_id,amount_cents,provider,payment_plan,payment_environment,provider_order_id,operation_key) VALUES($1::uuid,$2::uuid,$3,'PAGADITO',$4,$5,$6,$7) RETURNING *",
          [userId,addressId,quote.amountCents,plan,paymentEnvironment,randomBytes(7).toString('hex'),operation]
        );
        await tx.unsafe(
          "INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id) VALUES($1::uuid,'USER','PAGADITO_SANDBOX_ORDER_PREPARED','ORDER',$2)",
          [userId,inserted[0].id]
        );
        return {required:true,order:inserted[0],reused:false};
      });
    }
  });
}

/** Backwards-compatible sandbox adapter for staged callers. */
export function createPagaditoSandboxOrderRepository(sql:Sql){
  return createPagaditoOrderRepository(sql,'sandbox');
}
