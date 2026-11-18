/**
 * Pagadito REST Sandbox transport. Server-only, not connected to production routes.
 * API contract: Pagadito Tokenization Postman collection.
 * Never log card details, CVV, payment tokens, UID or WSK.
 * The caller must handle PCI requirements before submitting card data.
 */
export type PagaditoEnvironment = 'sandbox' | 'production';
export type PagaditoConfig = {
  environment: PagaditoEnvironment;
  uid: string;
  wsk: string;
};
export type PagaditoTransaction = {
  merchantTransactionId: string;
  currencyId: 'USD';
  transactionDetails: Array<{ quantity: string; description: string; amount: string }>;
};
export type PagaditoBrowserInfo = {
  deviceFingerprintID: string;
  customerIp: string;
};
export type PagaditoPaymentByToken = {
  payment_token: string;
  transaction: PagaditoTransaction;
  browserInfo: PagaditoBrowserInfo;
};
export type PagaditoRefund = { authorization: string; reason: string };

export class PagaditoApiError extends Error {
  constructor(public readonly status: number) {
    super('Pagadito request failed (' + status + ')');
    this.name = 'PagaditoApiError';
  }
}

export function createPagaditoRestClient(config: PagaditoConfig) {
  if (!config.uid || !config.wsk) throw new Error('Missing Pagadito credentials');
  const base = config.environment === 'sandbox'
    ? 'https://sandbox-api.pagadito.com/v1'
    : 'https://api.pagadito.com/v1';
  const auth = 'Basic ' + Buffer.from(config.uid + ':' + config.wsk, 'utf8').toString('base64');

  async function post<T>(endpoint: 'payment' | 'refund' | 'customer', payload: unknown): Promise<T> {
    const response = await fetch(base + '/' + endpoint, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new PagaditoApiError(response.status);
    return await response.json() as T;
  }
  return Object.freeze({
    environment: config.environment,
    // Only use after Pagadito confirms tokenization and the server validates the order.
    paymentByToken: (payload: PagaditoPaymentByToken) => post<unknown>('payment', payload),
    refund: (payload: PagaditoRefund) => post<unknown>('refund', payload),
    // Requires a PCI-compliant card collection strategy; not exposed to public routes.
    createCustomer: (payload: unknown) => post<unknown>('customer', payload)
  });
}
