import type {Sql} from 'postgres';
import type {createPagaditoRestClient} from './pagadito-rest-client';
import {createPagaditoSandboxOrderRepository} from './pagadito-sandbox-order-repository';
import {executeSandboxFirstPayment,type SandboxCard} from './pagadito-sandbox-first-payment';

export function createSandboxCheckout(sql:Sql,client:ReturnType<typeof createPagaditoRestClient>){
 if(client.environment!=='sandbox')throw Error('PAGADITO_SANDBOX_REQUIRED');
 const repository=createPagaditoSandboxOrderRepository(sql);
 return async function checkout(input:{userId:string;addressId:string;key:string;mode:string;card:SandboxCard;browserInfo:{deviceFingerprintID:string;customerIp:string}}){
  const {order}=await repository.prepare(input.userId,input.addressId,input.key,input.mode);
  const reservation=await sql.unsafe(
   "INSERT INTO ad507.pagadito_sandbox_attempts(order_id,state) SELECT id,'SUBMITTING' FROM ad507.orders WHERE id=$1::uuid AND provider='PAGADITO' AND payment_environment='test' AND status='PENDING' ON CONFLICT DO NOTHING RETURNING order_id",[order.id]);
  if(reservation.length!==1)throw Error('PAGADITO_ATTEMPT_ALREADY_EXISTS');
  try{
   const verified=await executeSandboxFirstPayment(client,order,input.card,input.browserInfo);
   await sql.begin(async tx=>{
    const saved=await tx.unsafe("UPDATE ad507.pagadito_sandbox_attempts SET state='VERIFIED',authorization=$2,updated_at=now() WHERE order_id=$1::uuid AND state='SUBMITTING' RETURNING order_id",[order.id,verified.authorization]);
    if(saved.length!==1)throw Error('PAGADITO_ATTEMPT_STATE_CHANGED');
   });
   // Sandbox certification only: never activate a real address or mark a production order paid.
   return {orderId:order.id,amountCents:verified.amountCents,currency:verified.currency,authorization:verified.authorization,state:'VERIFIED' as const};
  }catch{
   await sql.unsafe("UPDATE ad507.pagadito_sandbox_attempts SET state='UNCERTAIN',updated_at=now() WHERE order_id=$1::uuid AND state='SUBMITTING'",[order.id]);
   throw Error('PAGADITO_ATTEMPT_REQUIRES_REVIEW');
  }
 };
}
