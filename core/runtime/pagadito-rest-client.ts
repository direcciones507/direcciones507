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
    if(config.environment==='sandbox')console.info('Pagadito Sandbox transport start',{endpoint});
    let response:Response;
    try{
      response = await fetch(base + '/' + endpoint + '/', {
        method: 'POST',
        redirect: 'error',
        headers: { Authorization: auth, 'Content-Type': 'application/json;charset=UTF-8', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000)
      });
    }catch(error){
      if(config.environment==='sandbox'){
        const e=error as {name?:string;code?:string;message?:string};
        const code=typeof e?.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(e.code)?e.code:'UNKNOWN';
        const message=String(e?.message||'');
        const category=/redirect/i.test(message)?'REDIRECT':/certificate|tls|ssl/i.test(message)?'TLS':/dns|resolve|hostname/i.test(message)?'DNS':/timeout|timed out/i.test(message)?'TIMEOUT':/connect/i.test(message)?'CONNECT':'OTHER';
        console.warn('Pagadito Sandbox transport failed',{endpoint,code,category});
      }
      throw error;
    }
    const parsed = await response.json().catch(() => null);
    if (config.environment === 'sandbox') {
      const code = typeof parsed?.response_code === 'string' && /^PG[0-9]{3}-[0-9]{2}$/.test(parsed.response_code) ? parsed.response_code : 'UNAVAILABLE';
      console.info('Pagadito Sandbox response', { endpoint, httpStatus: response.status, responseCode: code });
    }
    if (!response.ok) throw new PagaditoApiError(response.status);
    if (parsed === null) throw new Error('PAGADITO_INVALID_JSON');
    return parsed as T;
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
