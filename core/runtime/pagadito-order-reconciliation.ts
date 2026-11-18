/**
 * Provider-neutral safety gate for Pagadito Sandbox order reconciliation.
 * No database writes or activation occur here. Caller must load the order
 * from its authenticated server-side store and perform the update atomically.
 */
export type PagaditoOrder = {
  id: string;
  ownerId: string;
  provider: 'PAGADITO';
  environment: 'sandbox' | 'production';
  amountCents: number;
  currency: 'USD';
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
};
export type PagaditoVerifiedPayment = {
  merchantTransactionId: string;
  environment: 'sandbox' | 'production';
  amountCents: number;
  currency: 'USD';
  authorization: string;
  approved: boolean;
};
/**
 * The verification object MUST come from an independently authenticated
 * provider-side result, never from browser input or a return URL.
 */
export function reconcilePagaditoPayment(order: PagaditoOrder, payment: PagaditoVerifiedPayment) {
  if (order.provider !== 'PAGADITO') return { action: 'REJECT', reason: 'PROVIDER_MISMATCH' } as const;
  if (order.id !== payment.merchantTransactionId) return { action: 'REJECT', reason: 'ORDER_MISMATCH' } as const;
  if (order.environment !== payment.environment) return { action: 'REJECT', reason: 'ENVIRONMENT_MISMATCH' } as const;
  if (order.amountCents !== payment.amountCents || order.currency !== payment.currency)
    return { action: 'REJECT', reason: 'AMOUNT_MISMATCH' } as const;
  if (order.status === 'PAID') return { action: 'NOOP', reason: 'ALREADY_PAID' } as const;
  if (order.status !== 'PENDING') return { action: 'REJECT', reason: 'ORDER_NOT_PENDING' } as const;
  if (!payment.approved || !payment.authorization.trim())
    return { action: 'PENDING', reason: 'PAYMENT_NOT_VERIFIED' } as const;
  return { action: 'MARK_PAID', reason: 'VERIFIED' } as const;
}
