import {createPagaditoRestClient} from './pagadito-rest-client';
import {pagaditoTransactionFromOrder} from './pagadito-transaction';
import {verifiedPagaditoResponse} from './pagadito-verified-response';

type Client=ReturnType<typeof createPagaditoRestClient>;
type Order=Parameters<typeof pagaditoTransactionFromOrder>[0];
export type SandboxCard={
 number:string; expirationDate:string; cvv:string; cardHolderName:string;
 firstName:string; lastName:string; email:string;
 billingAddress:{city:string;state:string;zip:string;countryId:string;line1:string;phone:string};
};

/** Server-only Sandbox transport. Caller must atomically reserve a unique
 * payment attempt before invoking this function; never retry an uncertain charge.
 * Never persist or log the card, CVV, or raw provider response.
 */
export async function executeSandboxFirstPayment(
 client:Client,order:Order,card:SandboxCard,
 browserInfo:{deviceFingerprintID:string;customerIp:string}
){
 if(client.environment!=='sandbox')throw Error('PAGADITO_SANDBOX_REQUIRED');
 const transaction=pagaditoTransactionFromOrder(order,'sandbox');
 if(!browserInfo.deviceFingerprintID.trim()||!browserInfo.customerIp.trim())
   throw Error('PAGADITO_BROWSER_INFO_REQUIRED');
 const raw=await client.createCustomer({card,transaction,browserInfo});
 const verified=verifiedPagaditoResponse(raw,'sandbox');
 if(verified.merchantTransactionId!==order.id||verified.amountCents!==order.amount_cents)
   throw Error('PAGADITO_RESPONSE_ORDER_MISMATCH');
 return verified;
}
