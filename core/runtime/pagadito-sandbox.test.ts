import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {reconcilePagaditoPayment, type PagaditoOrder, type PagaditoVerifiedPayment} from './pagadito-order-reconciliation';
import {pagaditoSandboxConfiguration} from './pagadito-sandbox-configuration';

const order:PagaditoOrder={
  id:'order-123',ownerId:'user-1',provider:'PAGADITO',environment:'sandbox',
  amountCents:2999,currency:'USD',status:'PENDING'
};
const payment:PagaditoVerifiedPayment={
  merchantTransactionId:'order-123',environment:'sandbox',amountCents:2999,
  currency:'USD',authorization:'AUTH-123',approved:true
};

test('matching authenticated provider proof may advance a pending order',()=>{
  assert.equal(reconcilePagaditoPayment(order,payment).action,'MARK_PAID');
});
test('mismatched order, environment and amount never activate',()=>{
  assert.equal(reconcilePagaditoPayment(order,{...payment,merchantTransactionId:'other'}).action,'REJECT');
  assert.equal(reconcilePagaditoPayment(order,{...payment,environment:'production'}).action,'REJECT');
  assert.equal(reconcilePagaditoPayment(order,{...payment,amountCents:1499}).action,'REJECT');
});
test('rejected, incomplete, duplicate and cancelled payments never activate',()=>{
  assert.equal(reconcilePagaditoPayment(order,{...payment,approved:false}).action,'PENDING');
  assert.equal(reconcilePagaditoPayment(order,{...payment,authorization:'  '}).action,'PENDING');
  assert.equal(reconcilePagaditoPayment({...order,status:'PAID'},payment).action,'NOOP');
  assert.equal(reconcilePagaditoPayment({...order,status:'CANCELLED'},payment).action,'REJECT');
});
test('sandbox config is default-off and refuses production environment',()=>{
  const env={AD507_PAGADITO_ENABLED:'true',AD507_PAGADITO_ENVIRONMENT:'sandbox',
    AD507_PAGADITO_UID:'test-uid',AD507_PAGADITO_WSK:'test-wsk'};
  assert.deepEqual(pagaditoSandboxConfiguration(env),{environment:'sandbox',uid:'test-uid',wsk:'test-wsk'});
  assert.equal(pagaditoSandboxConfiguration({...env,AD507_PAGADITO_ENABLED:'false'}),null);
  assert.equal(pagaditoSandboxConfiguration({...env,AD507_PAGADITO_ENVIRONMENT:'production'}),null);
  assert.throws(()=>pagaditoSandboxConfiguration({...env,AD507_PAGADITO_WSK:''}),/INVALID_PAGADITO/);
});
