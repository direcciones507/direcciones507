// Shared Core responses only. Preserve route-specific CSP, CORS, cookies,
 // media range responses and provider-specific headers. Legacy fallback remains unchanged.
const publicHosts=new Set(['direcciones507.com','www.direcciones507.com','cuenta.direcciones507.com','direcciones.lat','www.direcciones.lat','radar.direcciones.lat']);
const privateRoute=/^\/(?:admin|panel|mi-cuenta|crear-cuenta|auth|v1\/(?:admin|user|auth|payments|internal)|internal)(?:\/|$)/;
export function withCoreSecurityHeaders(handler:(req:Request)=>Promise<Response|null>){
 return async(req:Request):Promise<Response|null>=>{
  const response=await handler(req);if(!response)return null;
  const url=new URL(req.url),headers=new Headers(response.headers);
  const setDefault=(name:string,value:string)=>{if(!headers.has(name))headers.set(name,value);};
  setDefault('x-content-type-options','nosniff');
  setDefault('referrer-policy','strict-origin-when-cross-origin');
  // Host-only HSTS; no preload or includeSubDomains, protecting legacy DNS arrangements.
  if(publicHosts.has(url.hostname)&&(url.protocol==='https:'||req.headers.get('x-forwarded-proto')==='https'))
   setDefault('strict-transport-security','max-age=31536000');
  if(privateRoute.test(url.pathname)){
   headers.set('cache-control','no-store');
   headers.set('referrer-policy','no-referrer');
   setDefault('x-frame-options','DENY');
   setDefault('x-robots-tag','noindex, nofollow');
   // Only baseline CSP when none exists; don't change script/connect permissions
   // until the authorized payment provider and browser flows are verified.
   if(headers.get('content-type')?.includes('text/html'))
    setDefault('content-security-policy',"frame-ancestors 'none'; object-src 'none'; base-uri 'none'");
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 };
}
