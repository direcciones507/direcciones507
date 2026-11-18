import {commercialQuote} from './commercial-policy';
import type {PagaditoTransaction} from './pagadito-rest-client';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/**
 * Build Pagadito's payment transaction ONLY from a persisted server-owned
 * Core order, never from amount, plan or reference submitted by the browser.
 * This is not a checkout endpoint and does not trigger a payment.
 */
export function pagaditoTransactionFromOrder(order:{
  id:string;provider:string;payment_environment:string;status:string;
  amount_cents:number;currency:string;payment_plan:string;
}):PagaditoTransaction {
  if(!uuid.test(order.id)||order.provider!=='PAGADITO'||
     order.payment_environment!=='test'||order.status!=='PENDING'||
     order.currency!=='USD'||!Number.isSafeInteger(order.amount_cents)||
     order.amount_cents<=0)throw Error('INVALID_PAGADITO_ORDER');
  // Quotes may have different amounts for installments, renewals and ads.
  // The persisted server-side quote is authoritative; do not recalculate it
  // from the browser's current plan selection.
  if(!['RESIDENTIAL','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO','PLACE'].includes(order.payment_plan))
    throw Error('INVALID_PAGADITO_ORDER');
  const amount=(order.amount_cents/100).toFixed(2);
  return {
    merchantTransactionId:order.id,
    currencyId:'USD',
    transactionDetails:[{
      quantity:'1',
      description:'Direccion digital - '+order.payment_plan,
      amount
    }]
  };
}

/** Verify an initial quote before persisting a new Sandbox order. */
export function pagaditoInitialQuote(plan:string,mode:string) {
  if(mode!=='ANNUAL'&&mode!=='INSTALLMENTS')throw Error('INVALID_PAYMENT_MODE');
  const quote=commercialQuote(plan,mode);
  if(quote.amountCents<=0)throw Error('INVALID_PAGADITO_ORDER');
  return quote;
}
