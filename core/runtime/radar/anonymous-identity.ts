import {createHmac} from "node:crypto";
import {isIP} from "node:net";
// Caller must supply a verified ingress peer, not client-controlled forwarded headers.
export function createAnonymousIdentity(secret:string|undefined,trustedPeer?:(req:Request)=>string|null){
 if(!secret||Buffer.byteLength(secret,"utf8")<32||!trustedPeer)return undefined;
 return (req:Request):string|null=>{
  const peer=trustedPeer(req)?.trim().toLowerCase();
  if(!peer||!isIP(peer))return null;
  const normalized=isIP(peer)===6?new URL("http://["+peer+"]").hostname:peer;
  return createHmac("sha256",secret).update("radar-anonymous:v1:"+normalized).digest("hex");
 };
}
