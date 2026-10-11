import type { Sql } from 'postgres';
import { createHash, randomBytes } from 'node:crypto';
import { paymentAmount, verifyYappyIPN, validateYappyConfiguration, type YappyConfiguration } from './payment-policy';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
// No HTTP provider calls and no activation/publication side effects. Persist an
// immutable intent before a future provider adapter sends its order identifier.
export function createPaymentRepository(sql:Sql,config:YappyConfiguration) {
  validateYappyConfiguration(config);
  const own=async(tx:any,userId:string,addressId:string)=>{
    if(!uuid.test(userId)||!uuid.test(addressId))throw Error('PAYMENT_NOT_FOUND');
    const rows=await tx.unsafe("SELECT a.*,o.user_id FROM ad507.addresses a JOIN ad507.address_ownership o ON o.address_id=a.id JOIN ad507.users u ON u.id=o.user_id WHERE a.id=$1::uuid AND o.user_id=$2::uuid AND o.ownership_role='OWNER' AND u.status='ACTIVE' AND a.source='USER_REQUEST' FOR UPDATE OF a",[addressId,userId]);
    if(!rows.length)throw Error('PAYMENT_NOT_FOUND');return rows[0];
  };
  return {
    async claimProviderOrder(orderId:string) {
      if(!uuid.test(orderId))throw Error('PAYMENT_NOT_FOUND');
      const rows=await sql.unsafe("UPDATE ad507.orders SET provider_reference='INITIALIZING:'||provider_order_id,updated_at=now() WHERE id=$1::uuid AND provider='YAPPY' AND payment_environment=$2 AND status='PENDING' AND provider_reference IS NULL RETURNING id",[orderId,config.environment]);
      if(!rows.length)throw Error('PAYMENT_ALREADY_INITIALIZED');
    },
    async completeProviderOrder(orderId:string,reference:string) {
      if(!uuid.test(orderId)||!reference||reference.length>300||reference.startsWith('INITIALIZING:'))throw Error('INVALID_PROVIDER_REFERENCE');
      const rows=await sql.unsafe("UPDATE ad507.orders SET provider_reference=$2,updated_at=now() WHERE id=$1::uuid AND provider='YAPPY' AND payment_environment=$3 AND provider_reference='INITIALIZING:'||provider_order_id RETURNING id",[orderId,reference,config.environment]);
      if(!rows.length)throw Error('PAYMENT_PROVIDER_REFERENCE_CONFLICT');
    },
    async quote(userId:string,addressId:string) {
      return sql.begin(async tx=>{const row=await own(tx,userId,addressId);if(row.request_data?.migration)throw Error('INVALID_PAYMENT_REQUEST');const plan=row.request_data?.plan;const orders=await tx.unsafe("SELECT id FROM ad507.orders WHERE address_id=$1::uuid AND user_id=$2::uuid AND provider='YAPPY' AND payment_environment=$3 ORDER BY created_at DESC LIMIT 1",[addressId,userId,config.environment]);return {addressId,code:row.code,plan,amountCents:paymentAmount(plan),currency:'USD',orderId:orders[0]?.id??null};});
    },
    // Backend adapter hook only; never expose this method directly to a client.
    async registerProviderOrder(orderId:string,reference:string) {
      if(!uuid.test(orderId)||typeof reference!=='string'||!reference||reference.length>300)throw Error('INVALID_PROVIDER_REFERENCE');
      const rows=await sql.unsafe("UPDATE ad507.orders SET provider_reference=$2,updated_at=now() WHERE id=$1::uuid AND provider='YAPPY' AND payment_environment=$3 AND status='PENDING' AND (provider_reference IS NULL OR provider_reference=$2) RETURNING id",[orderId,reference,config.environment]);
      if(!rows.length)throw Error('PAYMENT_PROVIDER_REFERENCE_CONFLICT');
    },
    async prepare(userId:string,addressId:string,key:string) {
      if(!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw Error('INVALID_IDEMPOTENCY_KEY');
      return sql.begin(async tx=>{
        const row=await own(tx,userId,addressId);
        if(row.request_data?.migration||row.status!=='PENDING_REVIEW')throw Error('INVALID_PAYMENT_REQUEST');
        const plan=row.request_data?.plan,amount=paymentAmount(plan);
        if(amount===0)return {required:false,amountCents:0};
        const operation=createHash('sha256').update(config.environment+':'+userId+':'+addressId+':'+key).digest('hex');
        const existing=await tx.unsafe("SELECT * FROM ad507.orders WHERE provider='YAPPY' AND operation_key=$1",[operation]);
        if(existing.length){const p=existing[0];if(p.payment_plan!==plan||p.amount_cents!==amount)throw Error('PAYMENT_AMOUNT_CHANGED');return {required:true,order:p};}
        // Do not replace rejected/expired intents automatically: late signed
        // execution can still settle the original order. Reconcile before retry.
        const active=await tx.unsafe("SELECT id FROM ad507.orders WHERE address_id=$1::uuid AND provider='YAPPY' AND payment_environment=$2",[addressId,config.environment]);
        if(active.length)throw Error('PAYMENT_ALREADY_EXISTS');
        const id=randomBytes(7).toString('hex');
        const orders=await tx.unsafe("INSERT INTO ad507.orders(user_id,address_id,amount_cents,provider,payment_plan,payment_environment,provider_order_id,operation_key) VALUES($1::uuid,$2::uuid,$3,'YAPPY',$4,$5,$6,$7) RETURNING *",[userId,addressId,amount,plan,config.environment,id,operation]);
        await tx.unsafe("INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id) VALUES($1::uuid,'USER','PAYMENT_PREPARED','ORDER',$2)",[userId,orders[0].id]);
        return {required:true,order:orders[0]};
      });
    },
    async read(userId:string,orderId:string) {
      if(!uuid.test(userId)||!uuid.test(orderId))throw Error('PAYMENT_NOT_FOUND');
      const rows=await sql.unsafe("SELECT p.id,p.address_id,p.payment_plan,p.amount_cents,p.currency,p.status,p.confirmed_at,a.code FROM ad507.orders p JOIN ad507.users u ON u.id=p.user_id JOIN ad507.addresses a ON a.id=p.address_id WHERE p.id=$1::uuid AND p.user_id=$2::uuid AND u.status='ACTIVE' AND p.provider='YAPPY' AND p.payment_environment=$3",[orderId,userId,config.environment]);
      if(!rows.length)throw Error('PAYMENT_NOT_FOUND');return rows[0];
    },
    async confirm(query:URLSearchParams) {
      const proof=verifyYappyIPN(query,config);
      return sql.begin(async tx=>{
        const rows=await tx.unsafe("SELECT * FROM ad507.orders WHERE provider='YAPPY' AND payment_environment=$1 AND provider_order_id=$2 FOR UPDATE",[config.environment,proof.orderId]);
        const row=rows[0];if(!row)throw Error('PAYMENT_NOT_FOUND');
        // Confirm only provider-registered intents. Timeouts remain pending for reconciliation.
        if(!row.provider_reference||row.provider_reference.startsWith('INITIALIZING:'))throw Error('PAYMENT_PROVIDER_REFERENCE_REQUIRED');
        if(row.amount_cents!==paymentAmount(row.payment_plan)||row.currency!=='USD')throw Error('PAYMENT_AMOUNT_CHANGED');
        if(row.status==='REFUNDED'||row.status==='PAID'||row.status===proof.status)return {id:row.id,status:row.status,unchanged:true};
        if(row.status!=='PENDING'&&proof.status!=='PAID')return {id:row.id,status:row.status,unchanged:true};
        await tx.unsafe("UPDATE ad507.orders SET status=$2,confirmed_at=CASE WHEN $2='PAID' THEN now() ELSE confirmed_at END,updated_at=now() WHERE id=$1::uuid",[row.id,proof.status]);
        await tx.unsafe("INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,before_json,after_json) VALUES('SYSTEM','YAPPY_PAYMENT_CONFIRMED','ORDER',$1,$2::jsonb,$3::jsonb)",[row.id,tx.json({status:row.status}),tx.json({status:proof.status,providerStatus:proof.providerStatus})]);
        return {id:row.id,status:proof.status,unchanged:false};
      });
    }
  };
}

// Invoke from the existing publication transaction, never from browser state.
export async function requireConfirmedPayment(tx:any,row:any,environment:'test'|'production') {
  if(row.request_data?.migration||row.address_type==='PLACE')return;
  const plan=row.request_data?.plan,amount=paymentAmount(plan);if(amount===0)return;
  const paid=await tx.unsafe("SELECT id FROM ad507.orders WHERE address_id=$1::uuid AND provider='YAPPY' AND payment_environment=$2 AND payment_plan=$3 AND amount_cents=$4 AND currency='USD' AND status='PAID' AND confirmed_at IS NOT NULL LIMIT 1",[row.id,environment,plan,amount]);
  if(!paid.length)throw Error('PAYMENT_CONFIRMATION_REQUIRED');
}
