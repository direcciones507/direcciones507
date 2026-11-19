import type {PagaditoVerifiedPayment} from './pagadito-order-reconciliation';
import type {PagaditoEnvironment} from './pagadito-rest-client';

/** Parse only a direct authenticated Pagadito API response, never browser JSON.
 * Do not persist the raw response: it may contain a reusable payment token.
 */
export function verifiedPagaditoResponse(raw:unknown,environment:PagaditoEnvironment):PagaditoVerifiedPayment{
 if(!raw||typeof raw!=='object')throw Error('PAGADITO_RESPONSE_INVALID');
 const response=raw as Record<string,unknown>;
 if(response.response_code!=='PG200-00')throw Error('PAGADITO_PAYMENT_UNCONFIRMED');
 const reply=response.customer_reply;
 if(!reply||typeof reply!=='object')throw Error('PAGADITO_RESPONSE_INVALID');
 const r=reply as Record<string,unknown>;
 if(typeof r.merchantTransactionId!=='string'||typeof r.authorization!=='string'||
    !r.authorization.trim()||typeof r.totalAmount!=='string'||!/^\d+\.\d{2}$/.test(r.totalAmount))
   throw Error('PAGADITO_RESPONSE_INVALID');
 const [whole,fraction]=r.totalAmount.split('.');
 const amountCents=Number(whole)*100+Number(fraction);
 if(!Number.isSafeInteger(amountCents)||amountCents<=0)throw Error('PAGADITO_RESPONSE_INVALID');
 return {merchantTransactionId:r.merchantTransactionId,authorization:r.authorization,
   environment,amountCents,currency:'USD',approved:true};
}
