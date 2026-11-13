import {createAdvertisingRepository,confirmPlaceAdvertising} from './place-advertising';
import {commercialQuote} from './commercial-policy';
import {ANNUAL_POLICY,annualPlans,applyAnnualRenewal,applyCommercialRefund} from './annual-service';
import { assertCountryCommerce } from './country-configuration';
import type { createPayPalSandboxProvider } from './paypal-provider';
import type { Sql } from 'postgres';
import { createHash, randomBytes } from 'node:crypto';
import { acceptedOrderAmounts,validStoredOrderAmount,paymentAmount, verifyYappyIPN, validateYappyConfiguration, type YappyConfiguration } from './payment-policy';
import {isPayableClientRequest} from './paid-activation-policy';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
// Shared orders and audit ledger. PayPal hooks are backend-only sandbox preparation;
// Optional verified-payment callback is wired separately; providers remain disabled.
export function createPaymentRepository(sql:Sql,config:YappyConfiguration|{provider:'PAYPAL';environment:'test'},options:{commercialEnabled?:boolean;placeAdvertisingEnabled?:boolean;onVerifiedPayment?:(addressId:string)=>Promise<unknown>}={}) {
  const paypal='provider' in config&&config.provider==='PAYPAL';
  if(!paypal)validateYappyConfiguration(config as YappyConfiguration);
  const requireYappy=()=>{if(paypal)throw Error('PAYMENT_PROVIDER_NOT_ENABLED');};
  const requirePayPal=()=>{if(!paypal||config.environment!=='test')throw Error('PAYMENT_PROVIDER_NOT_ENABLED');};
  const requireCommercial=()=>paypal?requirePayPal():requireYappy();
  const own=async(tx:any,userId:string,addressId:string)=>{
    if(!uuid.test(userId)||!uuid.test(addressId))throw Error('PAYMENT_NOT_FOUND');
    const rows=await tx.unsafe("SELECT a.*,o.user_id FROM ad507.addresses a JOIN ad507.address_ownership o ON o.address_id=a.id JOIN ad507.users u ON u.id=o.user_id WHERE a.id=$1::uuid AND o.user_id=$2::uuid AND o.ownership_role='OWNER' AND u.status='ACTIVE' AND a.source='USER_REQUEST' FOR UPDATE OF a",[addressId,userId]);
    if(!rows.length)throw Error('PAYMENT_NOT_FOUND');assertCountryCommerce(rows[0].request_data?.countryCode??'PA');return rows[0];
  };
  const validOrder=async(tx:any,row:any)=>{
    if(!options.commercialEnabled)return validStoredOrderAmount(row.payment_plan,row.amount_cents);
    const terms=await tx.unsafe('SELECT quote FROM ad507.commercial_payment_terms WHERE order_id=$1::uuid',[row.id]);
    if(!terms.length)return validStoredOrderAmount(row.payment_plan,row.amount_cents);
    const q=terms[0].quote;try{return q.plan===row.payment_plan&&row.amount_cents===commercialQuote(q.plan,q.mode).amountCents&&Object.entries(commercialQuote(q.plan,q.mode)).every(([key,value])=>q[key]===value)}catch{return false}
  };
  const advertising=createAdvertisingRepository(sql,config.environment,!!options.commercialEnabled&&!!options.placeAdvertisingEnabled,paypal?'PAYPAL':'YAPPY');
  return {
    quoteAdvertising:advertising.quote,prepareAdvertising:advertising.prepare,
    async acceptPurchase(userId:string,orderId:string,evidence:any){
      return sql.begin(async tx=>{const rows=await tx.unsafe("SELECT id FROM ad507.orders WHERE id=$1::uuid AND user_id=$2::uuid FOR UPDATE",[orderId,userId]);if(!rows.length)throw Error('PAYMENT_NOT_FOUND');
        const previous=await tx.unsafe("SELECT 1 FROM ad507.audit_log WHERE entity_type='ORDER' AND entity_id=$1 AND action='CHECKOUT_LEGAL_ACCEPTED' AND metadata->>'version'=$2",[orderId,evidence.version]);if(!previous.length)await tx.unsafe("INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,metadata) VALUES($1::uuid,'USER','CHECKOUT_LEGAL_ACCEPTED','ORDER',$2,$3::jsonb)",[userId,orderId,tx.json(evidence)]);
      });
    },

    // PayPal preparation shares orders, ownership, server prices, state and audit.
    // Backend-only sandbox hooks; no public routes are enabled in this release.
    async preparePayPal(userId:string,addressId:string,key:string,mode='ANNUAL') {
      requirePayPal();
      if(!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw Error('INVALID_IDEMPOTENCY_KEY');
      return sql.begin(async tx=>{
        const row=await own(tx,userId,addressId);
        if(row.request_data?.migration||!(row.status==='PENDING_REVIEW'||row.status==='DRAFT'&&row.request_data?.workflow==='PAYMENT_PENDING'))throw Error('INVALID_PAYMENT_REQUEST');
        const plan=row.request_data?.plan,q=commercialQuote(plan,mode),amount=q.amountCents;if(!options.commercialEnabled&&mode!=='ANNUAL')throw Error('PAYMENT_MODALITY_NOT_ENABLED');
        if(amount===0)return {required:false,amountCents:0};
        const operation=createHash('sha256').update('paypal:test:'+userId+':'+addressId+':'+key).digest('hex');
        const previous=await tx.unsafe("SELECT * FROM ad507.orders WHERE provider='PAYPAL' AND operation_key=$1",[operation]);
        if(previous.length){if(previous[0].payment_plan!==plan||!await validOrder(tx,previous[0]))throw Error('PAYMENT_AMOUNT_CHANGED');return {required:true,order:previous[0]};}
        const active=await tx.unsafe("SELECT id FROM ad507.orders WHERE address_id=$1::uuid AND payment_environment='test'",[addressId]);
        if(active.length)throw Error('PAYMENT_ALREADY_EXISTS');
        const rows=await tx.unsafe("INSERT INTO ad507.orders(user_id,address_id,amount_cents,provider,payment_plan,payment_environment,provider_order_id,operation_key) VALUES($1::uuid,$2::uuid,$3,'PAYPAL',$4,'test',$5,$6) RETURNING *",[userId,addressId,amount,plan,randomBytes(7).toString('hex'),operation]);
        if(options.commercialEnabled){
          await tx.unsafe("INSERT INTO ad507.commercial_payment_terms(order_id,address_id,payment_environment,purpose,cycle,quote) VALUES($1::uuid,$2::uuid,'test','INITIAL',$2::text,$3::jsonb)",[rows[0].id,addressId,tx.json(q)]);
          await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{annualService}',$2::jsonb) WHERE id=$1::uuid",[addressId,tx.json({policy:ANNUAL_POLICY,plan,mode,fullyPaid:mode==='ANNUAL',orderId:rows[0].id,startsAt:null,endsAt:null})]);
        }
        await tx.unsafe("INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id) VALUES($1::uuid,'USER','PAYMENT_PREPARED','ORDER',$2)",[userId,rows[0].id]);
        return {required:true,order:rows[0]};
      });
    },
    async initializePayPal(userId:string,orderId:string,provider:ReturnType<typeof createPayPalSandboxProvider>) {
      requirePayPal();if(!uuid.test(orderId))throw Error('PAYMENT_NOT_FOUND');
      const row=await sql.begin(async tx=>{
        const orders=await tx.unsafe("SELECT * FROM ad507.orders WHERE id=$1::uuid AND user_id=$2::uuid AND provider='PAYPAL' AND payment_environment='test'",[orderId,userId]);
        if(!orders.length)throw Error('PAYMENT_NOT_FOUND');await own(tx,userId,orders[0].address_id);
        const locked=await tx.unsafe("SELECT * FROM ad507.orders WHERE id=$1::uuid FOR UPDATE",[orderId]);const p=locked[0];
        if(p.status!=='PENDING'||p.provider_reference)throw Error('PAYMENT_ALREADY_INITIALIZED');
        if(!await validOrder(tx,p)||p.currency!=='USD')throw Error('PAYMENT_AMOUNT_CHANGED');
        await tx.unsafe("UPDATE ad507.orders SET provider_reference='INITIALIZING:'||id::text,updated_at=now() WHERE id=$1::uuid",[orderId]);return p;
      });
      // Keep the committed initialization marker on uncertain failures; never replace the intent.
      const result=await provider.createOrder({id:row.id,amountCents:row.amount_cents,currency:'USD',provider_reference:null});
      await sql.begin(async tx=>{
        const rows=await tx.unsafe("UPDATE ad507.orders SET provider_reference=$2,updated_at=now() WHERE id=$1::uuid AND provider='PAYPAL' AND provider_reference='INITIALIZING:'||id::text RETURNING id",[orderId,result.providerOrderId]);
        if(!rows.length)throw Error('PAYMENT_PROVIDER_REFERENCE_CONFLICT');
        await tx.unsafe("INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id) VALUES('SYSTEM','PAYPAL_ORDER_REGISTERED','ORDER',$1)",[orderId]);
      });
      return {orderId,providerOrderId:result.providerOrderId};
    },
    async confirmPayPal(userId:string,orderId:string,provider:ReturnType<typeof createPayPalSandboxProvider>,capture=false) {
      requirePayPal();if(!uuid.test(orderId)||!uuid.test(userId))throw Error('PAYMENT_NOT_FOUND');
      const rows=await sql.unsafe("SELECT * FROM ad507.orders WHERE id=$1::uuid AND user_id=$2::uuid AND provider='PAYPAL' AND payment_environment='test'",[orderId,userId]);
      if(!rows.length)throw Error('PAYMENT_NOT_FOUND');const p=rows[0];await own(sql,userId,p.address_id);
      if(!await validOrder(sql,p)||p.currency!=='USD')throw Error('PAYMENT_AMOUNT_CHANGED');
      const proof=await provider.confirmedCapture({id:p.id,amountCents:p.amount_cents,currency:'USD',provider_reference:p.provider_reference},capture);
      const confirmation=await sql.begin(async tx=>{
        await own(tx,userId,p.address_id);
        const orders=await tx.unsafe("SELECT * FROM ad507.orders WHERE id=$1::uuid FOR UPDATE",[orderId]);const current=orders[0];
        if(current.provider_reference!==p.provider_reference||current.amount_cents!==p.amount_cents||current.payment_plan!==p.payment_plan)throw Error('PAYMENT_AMOUNT_CHANGED');
        if(current.status==='REFUNDED'||current.status===proof.status)return {id:orderId,status:current.status,unchanged:true};
        if(proof.status==='REFUNDED'&&current.status!=='PAID')throw Error('INVALID_PAYMENT_STATE');
        await tx.unsafe("UPDATE ad507.orders SET status=$2,confirmed_at=CASE WHEN $2='PAID' THEN now() ELSE confirmed_at END,updated_at=now() WHERE id=$1::uuid",[orderId,proof.status]);
        await tx.unsafe("INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,before_json,after_json) VALUES('SYSTEM','PAYPAL_PAYMENT_CONFIRMED','ORDER',$1,$2::jsonb,$3::jsonb)",[orderId,tx.json({status:current.status}),tx.json({status:proof.status,captureId:proof.captureId})]);
        if(proof.status==='REFUNDED'&&options.commercialEnabled)await applyCommercialRefund(tx,{...current,status:'REFUNDED'});
        if(proof.status==='PAID'){const paid={...current,status:'PAID',confirmed_at:new Date().toISOString()};await applyAnnualRenewal(tx,paid);await confirmPlaceAdvertising(tx,paid);}
        return {id:orderId,status:proof.status,unchanged:false};
      });
      if(confirmation.status==='PAID'&&options.onVerifiedPayment)await options.onVerifiedPayment(p.address_id);
      return confirmation;
    },
    async claimProviderOrder(orderId:string) {
      requireYappy();
      if(!uuid.test(orderId))throw Error('PAYMENT_NOT_FOUND');
      const rows=await sql.unsafe("UPDATE ad507.orders SET provider_reference='INITIALIZING:'||provider_order_id,updated_at=now() WHERE id=$1::uuid AND provider='YAPPY' AND payment_environment=$2 AND status='PENDING' AND provider_reference IS NULL RETURNING id",[orderId,config.environment]);
      if(!rows.length)throw Error('PAYMENT_ALREADY_INITIALIZED');
    },
    async completeProviderOrder(orderId:string,reference:string) {
      requireYappy();
      if(!uuid.test(orderId)||!reference||reference.length>300||reference.startsWith('INITIALIZING:'))throw Error('INVALID_PROVIDER_REFERENCE');
      const rows=await sql.unsafe("UPDATE ad507.orders SET provider_reference=$2,updated_at=now() WHERE id=$1::uuid AND provider='YAPPY' AND payment_environment=$3 AND provider_reference='INITIALIZING:'||provider_order_id RETURNING id",[orderId,reference,config.environment]);
      if(!rows.length)throw Error('PAYMENT_PROVIDER_REFERENCE_CONFLICT');
    },
    async quote(userId:string,addressId:string,mode='ANNUAL') {
      requireYappy();
      return sql.begin(async tx=>{
        const row=await own(tx,userId,addressId);if(!isPayableClientRequest(row))throw Error('INVALID_PAYMENT_REQUEST');
        const plan=row.request_data.plan,q=commercialQuote(plan,mode);
        const orders=await tx.unsafe("SELECT * FROM ad507.orders WHERE address_id=$1::uuid AND user_id=$2::uuid AND provider='YAPPY' AND payment_environment=$3 ORDER BY created_at DESC LIMIT 1",[addressId,userId,config.environment]);
        const saved=orders.length&&options.commercialEnabled?await tx.unsafe('SELECT quote FROM ad507.commercial_payment_terms WHERE order_id=$1::uuid',[orders[0].id]):[];
        return {...(saved[0]?.quote??q),addressId,code:row.code,modalitiesEnabled:!!options.commercialEnabled,amountCents:orders.length&&await validOrder(tx,orders[0])?orders[0].amount_cents:q.amountCents,orderId:orders[0]?.id??null};
      });
    },
    // Backend adapter hook only; never expose this method directly to a client.
    async registerProviderOrder(orderId:string,reference:string) {
      requireYappy();
      if(!uuid.test(orderId)||typeof reference!=='string'||!reference||reference.length>300)throw Error('INVALID_PROVIDER_REFERENCE');
      const rows=await sql.unsafe("UPDATE ad507.orders SET provider_reference=$2,updated_at=now() WHERE id=$1::uuid AND provider='YAPPY' AND payment_environment=$3 AND status='PENDING' AND (provider_reference IS NULL OR provider_reference=$2) RETURNING id",[orderId,reference,config.environment]);
      if(!rows.length)throw Error('PAYMENT_PROVIDER_REFERENCE_CONFLICT');
    },
    async prepare(userId:string,addressId:string,key:string,mode='ANNUAL') {
      requireYappy();
      if(!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw Error('INVALID_IDEMPOTENCY_KEY');
      return sql.begin(async tx=>{
        const row=await own(tx,userId,addressId);
        if(!isPayableClientRequest(row))throw Error('INVALID_PAYMENT_REQUEST');
        if(!options.commercialEnabled&&mode!=='ANNUAL')throw Error('PAYMENT_MODALITY_NOT_ENABLED');
        const plan=row.request_data.plan,q=commercialQuote(plan,mode),amount=q.amountCents;
        const operation=createHash('sha256').update(config.environment+':'+userId+':'+addressId+':'+key).digest('hex');
        const existing=await tx.unsafe("SELECT * FROM ad507.orders WHERE provider='YAPPY' AND operation_key=$1",[operation]);
        if(existing.length){const p=existing[0];if(p.payment_plan!==plan||!await validOrder(tx,p))throw Error('PAYMENT_AMOUNT_CHANGED');return {required:true,order:p};}
        // Do not replace rejected/expired intents automatically: late signed
        // execution can still settle the original order. Reconcile before retry.
        const active=await tx.unsafe("SELECT id FROM ad507.orders WHERE address_id=$1::uuid AND payment_environment=$2",[addressId,config.environment]);
        if(active.length)throw Error('PAYMENT_ALREADY_EXISTS');
        const id=randomBytes(7).toString('hex');
        const orders=await tx.unsafe("INSERT INTO ad507.orders(user_id,address_id,amount_cents,provider,payment_plan,payment_environment,provider_order_id,operation_key) VALUES($1::uuid,$2::uuid,$3,'YAPPY',$4,$5,$6,$7) RETURNING *",[userId,addressId,amount,plan,config.environment,id,operation]);
        if(options.commercialEnabled)await tx.unsafe("INSERT INTO ad507.commercial_payment_terms(order_id,address_id,payment_environment,purpose,cycle,quote) VALUES($1::uuid,$2::uuid,$3,'INITIAL',$2::text,$4::jsonb)",[orders[0].id,addressId,config.environment,tx.json(q)]);
        if(options.commercialEnabled&&annualPlans.includes(plan)&&!row.request_data?.migration){
          await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{annualService}',$2::jsonb) WHERE id=$1::uuid",[addressId,tx.json({policy:ANNUAL_POLICY,plan,mode,fullyPaid:mode==='ANNUAL',orderId:orders[0].id,startsAt:null,endsAt:null})]);
        }
        await tx.unsafe("INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id) VALUES($1::uuid,'USER','PAYMENT_PREPARED','ORDER',$2)",[userId,orders[0].id]);
        return {required:true,order:orders[0]};
      });
    },
    async quoteSecond(userId:string,addressId:string){
      requireCommercial();if(!options.commercialEnabled)throw Error('PAYMENT_MODALITY_NOT_ENABLED');
      return sql.begin(async tx=>{const row=await own(tx,userId,addressId),s=row.request_data?.annualService;
        if(row.status!=='ACTIVE'||row.request_data?.migration||s?.policy!==ANNUAL_POLICY||s.mode!=='INSTALLMENTS'||s.fullyPaid||!s.startsAt||Date.parse(s.endsAt)<=Date.now())throw Error('INVALID_PAYMENT_REQUEST');
        return {...commercialQuote(s.plan,'SECOND_INSTALLMENT'),addressId,orderId:s.pendingSecondOrderId??null,endsAt:s.endsAt,secondDueAt:s.secondDueAt};
      });
    },
    async prepareSecond(userId:string,addressId:string,key:string){
      requireCommercial();if(!options.commercialEnabled)throw Error('PAYMENT_MODALITY_NOT_ENABLED');if(!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw Error('INVALID_IDEMPOTENCY_KEY');
      return sql.begin(async tx=>{const row=await own(tx,userId,addressId),s=row.request_data?.annualService;
        if(row.status!=='ACTIVE'||row.request_data?.migration||s?.policy!==ANNUAL_POLICY||s.mode!=='INSTALLMENTS'||s.fullyPaid||!s.startsAt||Date.parse(s.endsAt)<=Date.now())throw Error('INVALID_PAYMENT_REQUEST');
        if(s.pendingSecondOrderId){const rows=await tx.unsafe('SELECT * FROM ad507.orders WHERE id=$1::uuid',[s.pendingSecondOrderId]);return {required:true,order:rows[0]};}
        const q=commercialQuote(s.plan,'SECOND_INSTALLMENT'),operation=createHash('sha256').update('second:'+config.environment+':'+addressId+':'+s.orderId).digest('hex');
        const rows=await tx.unsafe("INSERT INTO ad507.orders(user_id,address_id,amount_cents,provider,payment_plan,payment_environment,provider_order_id,operation_key) VALUES($1::uuid,$2::uuid,$3,$8,$4,$5,$6,$7) RETURNING *",[userId,addressId,q.amountCents,s.plan,config.environment,randomBytes(7).toString('hex'),operation,paypal?'PAYPAL':'YAPPY']);
        await tx.unsafe("INSERT INTO ad507.commercial_payment_terms(order_id,address_id,payment_environment,purpose,cycle,quote) VALUES($1::uuid,$2::uuid,$3,'INSTALLMENT',$4,$5::jsonb)",[rows[0].id,addressId,config.environment,s.orderId,tx.json(q)]);
        await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{annualService}',$2::jsonb) WHERE id=$1::uuid",[addressId,tx.json({...s,pendingSecondOrderId:rows[0].id})]);
        return {required:true,order:rows[0]};
      });
    },
    async quoteRenewal(userId:string,addressId:string){
      requireCommercial();if(!options.commercialEnabled)throw Error('PAYMENT_MODALITY_NOT_ENABLED');return sql.begin(async tx=>{
        const row=await own(tx,userId,addressId),s=row.request_data?.annualService;
        if(row.status!=='ACTIVE'||!row.publication_receipt||row.request_data?.migration||s?.policy!==ANNUAL_POLICY||!s.endsAt||!annualPlans.includes(s.plan)||s.plan!==row.request_data.plan)throw Error('INVALID_PAYMENT_REQUEST');
        if(s.paymentHold&&Date.parse(s.endsAt)>Date.now())throw Error('PAYMENT_RECONCILIATION_REQUIRED');
        if(s.mode==='INSTALLMENTS'&&!s.fullyPaid&&Date.parse(s.endsAt)>Date.now())throw Error('PAYMENT_INSTALLMENT_PENDING');
        const orders=s.pendingRenewalOrderId?await tx.unsafe("SELECT id,amount_cents FROM ad507.orders WHERE id=$1::uuid AND address_id=$2::uuid AND payment_environment=$3",[s.pendingRenewalOrderId,addressId,config.environment]):[];
        return {addressId,plan:s.plan,amountCents:orders[0]?.amount_cents??paymentAmount(s.plan),currency:'USD',orderId:orders[0]?.id??null,endsAt:s.endsAt,renewal:true};
      });
    },
    async prepareRenewal(userId:string,addressId:string,key:string){
      requireCommercial();if(!options.commercialEnabled)throw Error('PAYMENT_MODALITY_NOT_ENABLED');if(!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw Error('INVALID_IDEMPOTENCY_KEY');
      return sql.begin(async tx=>{
        const row=await own(tx,userId,addressId),s=row.request_data?.annualService;
        if(row.status!=='ACTIVE'||!row.publication_receipt||row.request_data?.migration||s?.policy!==ANNUAL_POLICY||!s.endsAt||!annualPlans.includes(s.plan)||s.plan!==row.request_data.plan)throw Error('INVALID_PAYMENT_REQUEST');
        if(s.paymentHold&&Date.parse(s.endsAt)>Date.now())throw Error('PAYMENT_RECONCILIATION_REQUIRED');
        if(s.mode==='INSTALLMENTS'&&!s.fullyPaid&&Date.parse(s.endsAt)>Date.now())throw Error('PAYMENT_INSTALLMENT_PENDING');
        const operation=createHash('sha256').update('renew:'+config.environment+':'+userId+':'+addressId+':'+key).digest('hex');
        const existing=await tx.unsafe("SELECT * FROM ad507.orders WHERE provider=$2 AND operation_key=$1",[operation,paypal?'PAYPAL':'YAPPY']);
        if(existing.length)return {required:true,order:existing[0]};
        // At most one explicitly requested renewal per service period. A second
        // browser/key must reuse/reconcile the original intent, never create a charge.
        if(s.pendingRenewalOrderId||s.renewalForEnd===s.endsAt)throw Error('PAYMENT_ALREADY_EXISTS');
        const orders=await tx.unsafe("INSERT INTO ad507.orders(user_id,address_id,amount_cents,provider,payment_plan,payment_environment,provider_order_id,operation_key) VALUES($1::uuid,$2::uuid,$3,$8,$4,$5,$6,$7) RETURNING *",[userId,addressId,paymentAmount(s.plan),s.plan,config.environment,randomBytes(7).toString('hex'),operation,paypal?'PAYPAL':'YAPPY']);
        await tx.unsafe("INSERT INTO ad507.commercial_payment_terms(order_id,address_id,payment_environment,purpose,cycle,quote) VALUES($1::uuid,$2::uuid,$3,'RENEWAL',$4,$5::jsonb)",[orders[0].id,addressId,config.environment,s.endsAt,tx.json({...commercialQuote(s.plan,'RENEWAL'),priorService:s})]);
        await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{annualService}',$2::jsonb) WHERE id=$1::uuid",[addressId,tx.json({...s,pendingRenewalOrderId:orders[0].id,renewalForEnd:s.endsAt})]);
        await tx.unsafe("INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id) VALUES($1::uuid,'USER','MANUAL_RENEWAL_PREPARED','ORDER',$2)",[userId,orders[0].id]);
        return {required:true,order:orders[0]};
      });
    },
    async read(userId:string,orderId:string) {
      requireYappy();
      if(!uuid.test(userId)||!uuid.test(orderId))throw Error('PAYMENT_NOT_FOUND');
      const rows=await sql.unsafe("SELECT p.id,p.address_id,p.payment_plan,p.amount_cents,p.currency,p.status,p.confirmed_at,a.code,a.country_code FROM ad507.orders p JOIN ad507.users u ON u.id=p.user_id JOIN ad507.addresses a ON a.id=p.address_id WHERE p.id=$1::uuid AND p.user_id=$2::uuid AND u.status='ACTIVE' AND p.provider='YAPPY' AND p.payment_environment=$3",[orderId,userId,config.environment]);
      if(!rows.length)throw Error('PAYMENT_NOT_FOUND');assertCountryCommerce(rows[0].country_code??'PA');
      // Reconcile an already-confirmed Yappy payment on authenticated status reads.
      // A provider notification may persist PAID but fail during subsequent publication.
      // Never create a new order or mark a pending order paid from a browser request.
      if(rows[0].status==='PAID'&&options.onVerifiedPayment){
        try { await options.onVerifiedPayment(rows[0].address_id); }
        catch(error) { console.error('PAID_ADDRESS_RECONCILIATION_FAILED',rows[0].id,error instanceof Error?error.message:'unknown'); }
      }
      return rows[0];
    },
    async confirm(query:URLSearchParams) {
      requireYappy();
      const proof=verifyYappyIPN(query,config as YappyConfiguration);
      const confirmation=await sql.begin(async tx=>{
        const intent=await tx.unsafe("SELECT address_id FROM ad507.orders WHERE provider='YAPPY' AND payment_environment=$1 AND provider_order_id=$2",[config.environment,proof.orderId]);
        if(intent[0])await tx.unsafe("SELECT id FROM ad507.addresses WHERE id=$1::uuid FOR UPDATE",[intent[0].address_id]);
        const rows=await tx.unsafe("SELECT * FROM ad507.orders WHERE provider='YAPPY' AND payment_environment=$1 AND provider_order_id=$2 FOR UPDATE",[config.environment,proof.orderId]);
        const row=rows[0];if(!row)throw Error('PAYMENT_NOT_FOUND');
        // Confirm only provider-registered intents. Timeouts remain pending for reconciliation.
        if(!row.provider_reference||row.provider_reference.startsWith('INITIALIZING:'))throw Error('PAYMENT_PROVIDER_REFERENCE_REQUIRED');
        if(!await validOrder(tx,row)||row.currency!=='USD')throw Error('PAYMENT_AMOUNT_CHANGED');
        if(row.status==='PAID'){await applyAnnualRenewal(tx,row);await confirmPlaceAdvertising(tx,row);}
        if(row.status==='REFUNDED'||row.status==='PAID'||row.status===proof.status)return {id:row.id,status:row.status,unchanged:true,addressId:row.address_id};
        if(row.status!=='PENDING'&&proof.status!=='PAID')return {id:row.id,status:row.status,unchanged:true,addressId:row.address_id};
        await tx.unsafe("UPDATE ad507.orders SET status=$2,confirmed_at=CASE WHEN $2='PAID' THEN now() ELSE confirmed_at END,updated_at=now() WHERE id=$1::uuid",[row.id,proof.status]);
        await tx.unsafe("INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,before_json,after_json) VALUES('SYSTEM','YAPPY_PAYMENT_CONFIRMED','ORDER',$1,$2::jsonb,$3::jsonb)",[row.id,tx.json({status:row.status}),tx.json({status:proof.status,providerStatus:proof.providerStatus})]);
        if(proof.status==='PAID'){const paid={...row,status:'PAID',confirmed_at:new Date().toISOString()};await applyAnnualRenewal(tx,paid);await confirmPlaceAdvertising(tx,paid);}
        return {id:row.id,status:proof.status,unchanged:false,addressId:row.address_id};
      });
      if(confirmation.status==='PAID'&&options.onVerifiedPayment){
        // Payment has already been committed. Publication failure must not
        // reject a valid signed IPN, which would make Yappy retry a paid order.
        // Authenticated payment reads retry publication idempotently.
        try { await options.onVerifiedPayment(confirmation.addressId); }
        catch(error) { console.error('YAPPY_PAID_PUBLICATION_PENDING',confirmation.id,error instanceof Error?error.message:'unknown'); }
      }
      const {addressId,...result}=confirmation;return result;
    }
  };
}

// Invoke from the existing publication transaction, never from browser state.
export async function requireConfirmedPayment(tx:any,row:any,environment:'test'|'production') {
  if(row.request_data?.migration||row.address_type==='PLACE')return;
  const plan=row.request_data?.plan,amount=paymentAmount(plan);if(amount===0)return;
  const paid=await tx.unsafe("SELECT id FROM ad507.orders WHERE address_id=$1::uuid AND payment_environment=$2 AND payment_plan=$3 AND amount_cents=ANY($4::integer[]) AND currency='USD' AND status='PAID' AND confirmed_at IS NOT NULL LIMIT 1",[row.id,environment,plan,acceptedOrderAmounts(plan)]);
  if(!paid.length){
    if(row.request_data?.annualService?.policy!==ANNUAL_POLICY)throw Error('PAYMENT_CONFIRMATION_REQUIRED');
    const installments=await tx.unsafe("SELECT o.id,t.quote FROM ad507.orders o JOIN ad507.commercial_payment_terms t ON t.order_id=o.id WHERE o.address_id=$1::uuid AND o.payment_environment=$2 AND o.payment_plan=$3 AND o.status='PAID' AND o.confirmed_at IS NOT NULL AND o.currency='USD' AND t.purpose='INITIAL' AND t.quote->>'mode'='INSTALLMENTS' AND o.amount_cents=(t.quote->>'amountCents')::integer",[row.id,environment,plan]);
    if(!installments.some((i:any)=>Object.entries(commercialQuote(plan,'INSTALLMENTS')).every(([k,v])=>i.quote[k]===v)))throw Error('PAYMENT_CONFIRMATION_REQUIRED');
  }
}
