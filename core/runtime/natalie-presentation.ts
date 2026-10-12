/** Presentation only: Railway may pass HTTP after terminating public HTTPS.
 * This grants no conversation permission; the preserved API validates Origin.
 */
export function nataliePresentationAllowed(url:URL,env:Record<string,string|undefined>){
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port)return false;
 return ['direcciones507.com','www.direcciones507.com'].includes(url.host)||
   (url.host==='direcciones.lat'&&env.AD507_INTERNATIONAL_DOMAIN_VERIFIED==='true');
}
