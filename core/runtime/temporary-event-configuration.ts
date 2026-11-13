import {yappyConfiguration} from './payment-policy';
/** Fail closed without breaking existing services when a new event setting is malformed. */
export function temporaryYappyConfiguration(env:Record<string,string|undefined>){
 if(env.AD507_TEMPORARY_EVENTS_ENABLED!=='true'||env.AD507_TEMPORARY_PAYMENTS_ENABLED!=='true'||env.AD507_YAPPY_ENVIRONMENT!=='production'||!env.AD507_TEMPORARY_YAPPY_IPN_URL)return null;
 // A live trial is scoped to a single existing event; permanent-payment flags stay unchanged.
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(env.AD507_TEMPORARY_YAPPY_EVENT_ID||''))return null;
 const config=yappyConfiguration({...env,AD507_YAPPY_IPN_URL:env.AD507_TEMPORARY_YAPPY_IPN_URL});
 if(!config)return null;
 const ipn=new URL(config.ipnUrl);
 if(ipn.origin!=='https://direcciones.lat'||ipn.pathname!=='/v1/payments/temporary-events/yappy/ipn'||ipn.search)return null;
 return config;
}
