import { createHmac, timingSafeEqual } from 'node:crypto';

// Server-owned prices. Reconcile against the commercial authority before launch.
export const PAYMENT_PRICES = Object.freeze({ RESIDENTIAL:1299, BUSINESS_FREE:0,
  BUSINESS_PREMIUM:1999, BUSINESS_PREMIUM_PRO:3999, RENEWAL:1299, CORPORATE_PRO:3999 });
export type PaymentPlan = keyof typeof PAYMENT_PRICES;
export function paymentAmount(plan: string): number {
  if (!Object.hasOwn(PAYMENT_PRICES, plan)) throw Error('INVALID_PAYMENT_PLAN');
  return PAYMENT_PRICES[plan as PaymentPlan];
}
export function money(cents:number):string {
  if(!Number.isSafeInteger(cents)||cents<0)throw Error('INVALID_PAYMENT_AMOUNT');
  return (cents/100).toFixed(2);
}
export type YappyConfiguration = { environment:'test'|'production'; merchantId:string; domain:string; secret:string; ipnUrl:string };
// Deliberately no environment-variable activation in this release. Construction
// is for isolated tests; the authorized provider wiring is a separate release.
export const YAPPY_PAYMENTS_ENABLED = false;
export function yappyConfiguration(env:Record<string,string|undefined>):YappyConfiguration|null {
  try {return validateYappyConfiguration({environment:env.AD507_YAPPY_ENVIRONMENT as 'test'|'production',merchantId:env.AD507_YAPPY_MERCHANT_ID!,domain:env.AD507_YAPPY_DOMAIN!,secret:env.AD507_YAPPY_SECRET!,ipnUrl:env.AD507_YAPPY_IPN_URL!});}catch{return null;}
}
export function validateYappyConfiguration(config:YappyConfiguration) {
  if(!config||!['test','production'].includes(config.environment)||!config.merchantId?.trim())throw Error('INVALID_YAPPY_CONFIGURATION');
  for(const value of [config.domain,config.ipnUrl]) {
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||url.hash)throw Error('INVALID_YAPPY_CONFIGURATION');
  }
  const encoded=config.secret;
  if(typeof encoded!=='string'||!encoded||encoded.length>4096||! /^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Error('INVALID_YAPPY_CONFIGURATION');
  const decoded=Buffer.from(encoded,'base64').toString('utf8');
  if(!decoded.split('.')[0]||decoded.includes('\uFFFD'))throw Error('INVALID_YAPPY_CONFIGURATION');
  return config;
}
export type VerifiedPayment = { orderId:string; status:'PAID'|'FAILED'|'CANCELLED'; providerStatus:'E'|'R'|'C'|'X' };
// Official V2 IPN contract; never accepts a browser event as confirmation.
export function verifyYappyIPN(query:URLSearchParams,config:YappyConfiguration):VerifiedPayment {
  validateYappyConfiguration(config);
  for(const key of ['orderId','status','domain'])if(query.getAll(key).length!==1)throw Error('INVALID_PAYMENT_NOTIFICATION');
  if(query.getAll('hash').length+query.getAll('Hash').length!==1)throw Error('INVALID_PAYMENT_NOTIFICATION');
  const orderId=query.get('orderId')!,status=query.get('status')!,domain=query.get('domain')!,hash=query.get('hash')??query.get('Hash')!;
  if(!/^[A-Za-z0-9]{1,15}$/.test(orderId)||!['E','R','C','X'].includes(status)||domain!==config.domain||!/^[a-f0-9]{64}$/i.test(hash))throw Error('INVALID_PAYMENT_NOTIFICATION');
  const signature=createHmac('sha256',Buffer.from(config.secret,'base64').toString('utf8').split('.')[0]).update(orderId+status+domain).digest();
  if(!timingSafeEqual(signature,Buffer.from(hash,'hex')))throw Error('INVALID_PAYMENT_SIGNATURE');
  return {orderId,status:status==='E'?'PAID':status==='C'?'CANCELLED':'FAILED',providerStatus:status as VerifiedPayment['providerStatus']};
}
