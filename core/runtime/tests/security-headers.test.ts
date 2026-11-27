import {test,expect} from 'bun:test';
import {withCoreSecurityHeaders} from '../security-headers';
import {handlePaymentRoutes} from '../payment-routes';
import {handleSandboxCheckout} from '../pagadito-sandbox-checkout-route';

test('private pages and API responses receive baseline security headers without overriding CSP or losing cookies',async()=>{
 const source=new Headers({'content-type':'text/html','content-security-policy':"default-src 'self'; frame-ancestors 'none'",'cache-control':'public, max-age=3600'});
 source.append('set-cookie','one=1; Secure; HttpOnly');source.append('set-cookie','two=2; Secure; HttpOnly');
 const response=await withCoreSecurityHeaders(async()=>new Response('fixture',{headers:source}))(new Request('https://direcciones.lat/panel/payments/test'));
 expect(response!.headers.get('strict-transport-security')).toBe('max-age=31536000');
 expect(response!.headers.get('x-content-type-options')).toBe('nosniff');
 expect(response!.headers.get('referrer-policy')).toBe('no-referrer');
 expect(response!.headers.get('x-frame-options')).toBe('DENY');
 expect(response!.headers.get('cache-control')).toBe('no-store');
 expect(response!.headers.get('content-security-policy')).toBe(source.get('content-security-policy'));
 expect(response!.headers.getSetCookie()).toEqual(source.getSetCookie());
 expect(await response!.text()).toBe('fixture');
});
test('public cache and range responses remain intact; unknown hosts and legacy fallback are unaffected',async()=>{
 const handle=withCoreSecurityHeaders(async()=>new Response('part',{status:206,headers:{'cache-control':'public, max-age=300','content-range':'bytes 0-3/8'}}));
 const response=await handle(new Request('https://radar.direcciones.lat/media/a'));
 expect(response!.status).toBe(206);expect(response!.headers.get('cache-control')).toBe('public, max-age=300');expect(response!.headers.get('content-range')).toBe('bytes 0-3/8');
 expect(response!.headers.has('x-frame-options')).toBe(false);
 expect((await handle(new Request('http://localhost/media/a')))?.headers.has('strict-transport-security')).toBe(false);
 expect(await withCoreSecurityHeaders(async()=>null)(new Request('https://direcciones.lat/legacy'))).toBeNull();
});
test('anonymous, unauthorized and cross-site payment requests cannot reach repository or provider',async()=>{
 const id=crypto.randomUUID(),path='/v1/user/requests/'+id+'/payment';
 let calls=0;
 const trap=new Proxy({}, {get(){calls++;throw Error('unexpected repository/provider access')}});
 const req=(origin='https://direcciones.lat',site='same-origin')=>new Request('https://direcciones.lat'+path,{method:'POST',headers:{origin,'sec-fetch-site':site,'content-type':'application/json'},body:'{}'});
 for(const [user,origin,site,status] of [[null,'https://direcciones.lat','same-origin',401],[{id,roles:['VIEWER']},'https://direcciones.lat','same-origin',403],[{id,roles:['CLIENT']},'https://other.test','cross-site',403]] as const){
  const res=await handlePaymentRoutes(req(origin,site),{enabled:true,auth:{currentUser:async()=>user} as any,repository:trap as any,provider:trap as any});
  expect(res?.status).toBe(status);expect(calls).toBe(0);
 }
});
test('anonymous and cross-site sandbox checkout cannot call the payment handler',async()=>{
 let calls=0;
 for(const [origin,site] of [['https://direcciones.lat','same-origin'],['https://other.test','cross-site']]){
  const res=await handleSandboxCheckout(new Request('https://direcciones.lat/v1/user/pagadito/sandbox/requests/'+crypto.randomUUID()+'/checkout',{method:'POST',headers:{origin,'sec-fetch-site':site,'content-type':'application/json'},body:'{}'}),{enabled:true,auth:{currentUser:async()=>null},checkout:(async()=>{calls++;throw Error('unexpected checkout')}) as any,origin:'https://direcciones.lat',testCards:[],customerIp:null});
  expect(res?.status).toBe(403);
 }
 expect(calls).toBe(0);
});
