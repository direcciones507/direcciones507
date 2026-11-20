import {expect,test} from "bun:test";
import {createRadarAddressResolver} from "../radar/address-resolver";
const row={code:"AD507-TEST",address_type:"BUSINESS",status:"ACTIVE",country_code:"PA"};
const pub={type:"BUSINESS",url:"https://direcciones.lat/AD507-TEST/",extras:{countryCode:"PA",historical:false}};
test("resolve only matching public CORE publication",async()=>{
 const resolve=createRadarAddressResolver({unsafe:async(q,p)=>{expect(q).toContain("ad507.address_ownership");expect(p).toEqual(["id","PA"]);return [row];}},async()=>pub);
 expect((await resolve("id","PA"))?.publicUrl).toBe(pub.url);
});
test("deny missing ownership, publication, historical or mismatched country",async()=>{
 for(const publication of [null,{...pub,extras:{countryCode:"PA",historical:true}},{...pub,extras:{countryCode:"CO",historical:false}},{...pub,type:"RESIDENTIAL"}]){
  expect(await createRadarAddressResolver({unsafe:async()=>[row]},async()=>publication)("id","PA")).toBeNull();
 }
 expect(await createRadarAddressResolver({unsafe:async()=>[]},async()=>{throw Error("Must not resolve");})("id","PA")).toBeNull();
});

test("expired annual service or payment hold suppresses link before publication lookup",async()=>{
 for(const annualService of [
 {policy:"annual-manual-20261113",startsAt:"2020-01-01",endsAt:"2021-01-01"},
 {policy:"annual-manual-20261113",startsAt:"2020-01-01",endsAt:"2099-01-01",paymentHold:true},
 {policy:"annual-manual-20261113",startsAt:"2020-01-01",endsAt:"invalid"}
 ]){
 const resolve=createRadarAddressResolver({unsafe:async()=>[{...row,request_data:{annualService}}]},async()=>{throw Error("Ineligible publication must not resolve");});
 expect(await resolve("id","PA")).toBeNull();
 }
});
