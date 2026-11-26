import {expect,test} from "bun:test";
import {createRadarAddressResolver} from "../radar/address-resolver";
const business={establishment_id:"one",code:"AD507-TEST",source:"USER_REQUEST",address_type:"BUSINESS",country_code:"PA",request_data:{countryCode:"PA",plan:"BUSINESS_PREMIUM_PRO",publicCode:"nombre"}};

test("resolve linked CORE publications in one batch without reading unrelated public details",async()=>{
 let calls=0;
 const resolve=createRadarAddressResolver({unsafe:async(q,p)=>{
  calls++;
  expect(q).toContain("ad507.address_ownership");
  expect(q).toContain("publication_receipt IS NOT NULL");
  expect(q).toContain("a.address_type IN ('BUSINESS','PLACE')");
  expect(p).toEqual(["one,two","PA"]);
  return [business,{...business,establishment_id:"two",request_data:{countryCode:"PA"}}];
 }});
 expect((await resolve([],"PA")).size).toBe(0);
 const links=await resolve(["one","one","two"],"PA");
 expect(calls).toBe(1);
 expect(links.get("one")?.publicUrl).toBe("https://direcciones.lat/nombre/");
 expect(links.get("two")?.publicUrl).toContain("/AD507-TEST/");
});

test("exclude historical, mismatched country, expired and payment-held links",async()=>{
 const records=[
  {migration:{}},{countryCode:"CO"},
  {annualService:{policy:"annual-manual-20261113",startsAt:"2020-01-01",endsAt:"2021-01-01"}},
  {annualService:{policy:"annual-manual-20261113",startsAt:"2020-01-01",endsAt:"2099-01-01",paymentHold:true}},
  {annualService:{policy:"annual-manual-20261113",startsAt:"2020-01-01",endsAt:"invalid"}}
 ];
 const resolve=createRadarAddressResolver({unsafe:async()=>records.map(request_data=>({...business,request_data}))});
 expect((await resolve(["one"],"PA")).size).toBe(0);
});
