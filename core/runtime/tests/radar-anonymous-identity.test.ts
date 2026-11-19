import {test,expect} from "bun:test";
import {createAnonymousIdentity} from "../radar/anonymous-identity";
const req=new Request("https://radar.direcciones.lat",{headers:{"x-forwarded-for":"192.0.2.4"}});
const secret="s".repeat(32);
test("anonymous identity fails closed without trusted peer and secret",()=>{
 expect(createAnonymousIdentity(secret)).toBeUndefined();
 expect(createAnonymousIdentity("short",()=>"192.0.2.8")).toBeUndefined();
 expect(createAnonymousIdentity(secret,()=>null)?.(req)).toBeNull();
});
test("anonymous identity is keyed and not supplied by browser",()=>{
 const resolve=createAnonymousIdentity(secret,()=>"192.0.2.8")!;
 expect(resolve(req)).toMatch(/^[a-f0-9]{64}$/);
 expect(resolve(req)).toBe(resolve(new Request(req.url)));
 expect(resolve(req)).not.toBe(createAnonymousIdentity(secret,()=>"192.0.2.9")!(req));
});
