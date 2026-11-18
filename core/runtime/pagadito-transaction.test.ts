import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {pagaditoTransactionFromOrder,pagaditoInitialQuote} from './pagadito-transaction';

const order={
 id:'11111111-1111-4111-8111-111111111111',
 provider:'PAGADITO',payment_environment:'test',status:'PENDING',
 amount_cents:2999,currency:'USD',payment_plan:'BUSINESS_PREMIUM'
};
test('persisted Core amount becomes a USD Pagadito transaction',()=>{
 const tx=pagaditoTransactionFromOrder(order);
 assert.equal(tx.merchantTransactionId,order.id);
 assert.equal(tx.currencyId,'USD');
 assert.equal(tx.transactionDetails[0].amount,'29.99');
});
test('never construct checkout from other providers, environments or settled orders',()=>{
 for(const invalid of [
  {...order,provider:'YAPPY'},
  {...order,payment_environment:'production'},
  {...order,status:'PAID'},
  {...order,amount_cents:0},
  {...order,amount_cents:2999.5},
  {...order,currency:'EUR'},
  {...order,id:'invalid'}
 ])assert.throws(()=>pagaditoTransactionFromOrder(invalid),/INVALID_PAGADITO_ORDER/);
});
test('server calculates current annual and installment quotes',()=>{
 assert.equal(pagaditoInitialQuote('BUSINESS_PREMIUM','ANNUAL').amountCents,2999);
 assert.equal(pagaditoInitialQuote('BUSINESS_PREMIUM','INSTALLMENTS').amountCents,1650);
 assert.throws(()=>pagaditoInitialQuote('BUSINESS_PREMIUM','RENEWAL'));
});
