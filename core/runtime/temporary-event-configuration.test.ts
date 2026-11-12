import {test,expect} from 'bun:test';
import {temporaryYappyConfiguration} from './temporary-event-configuration';
const env={AD507_TEMPORARY_EVENTS_ENABLED:'true',AD507_TEMPORARY_PAYMENTS_ENABLED:'true',AD507_COMMERCIAL_WORKFLOW_ENABLED:'true',AD507_YAPPY_PAYMENTS_ENABLED:'true',AD507_YAPPY_ENVIRONMENT:'production',AD507_YAPPY_MERCHANT_ID:'fixture',AD507_YAPPY_DOMAIN:'https://direcciones.lat',AD507_YAPPY_SECRET:Buffer.from('fixture.secret').toString('base64'),AD507_YAPPY_IPN_URL:'https://direcciones.lat/v1/payments/yappy/ipn',AD507_TEMPORARY_YAPPY_IPN_URL:'https://direcciones.lat/v1/payments/temporary-events/yappy/ipn'};
test('event charges require every explicit release switch and their own provider callback',()=>{
 expect(temporaryYappyConfiguration({})).toBeNull();expect(temporaryYappyConfiguration(env)?.ipnUrl).toBe(env.AD507_TEMPORARY_YAPPY_IPN_URL);
 for(const key of ['AD507_TEMPORARY_EVENTS_ENABLED','AD507_TEMPORARY_PAYMENTS_ENABLED','AD507_COMMERCIAL_WORKFLOW_ENABLED','AD507_YAPPY_PAYMENTS_ENABLED'])expect(temporaryYappyConfiguration({...env,[key]:'false'})).toBeNull();
 expect(temporaryYappyConfiguration({...env,AD507_YAPPY_DOMAIN:'https://direcciones507.com'})?.domain).toBe('https://direcciones507.com');
 expect(env.AD507_YAPPY_IPN_URL).toBe('https://direcciones.lat/v1/payments/yappy/ipn');
});
test('missing or malformed event callback safely disables payment without crashing startup',()=>{
 for(const ipn of ['', 'invalid', 'http://direcciones.lat/v1/payments/temporary-events/yappy/ipn','https://evil.example/v1/payments/temporary-events/yappy/ipn','https://direcciones.lat/v1/payments/yappy/ipn',env.AD507_TEMPORARY_YAPPY_IPN_URL+'?redirect=evil'])expect(temporaryYappyConfiguration({...env,AD507_TEMPORARY_YAPPY_IPN_URL:ipn})).toBeNull();
 expect(temporaryYappyConfiguration({...env,AD507_YAPPY_SECRET:''})).toBeNull();
});
