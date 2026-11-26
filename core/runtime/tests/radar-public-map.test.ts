import {test,expect} from "bun:test";
import {publicFeatures,type Establishment} from "../radar/public-map";
const bounds={west:-83,south:7,east:-77,north:10};
const base:Establishment={id:"a",name:"Negocio",category:"shop",country:"PA",latitude:8,longitude:-80,published:true,reports:[]};
const address={publicUrl:"https://direcciones507.com/example",publiclyVisible:true,residential:false,active:true};
test("only published establishments in requested country and bounds",()=>{
 const r=publicFeatures([base,{...base,id:"b",published:false},{...base,id:"c",country:"CO"},{...base,id:"d",latitude:30}],bounds,"PA",0);
 expect(r.features.map(f=>f.id)).toEqual(["a"]);
 expect(r.features[0].geometry.coordinates).toEqual([-80,8]);
});
test("digital address link respects privacy, expiration and host",()=>{
 for(const a of [{...address,residential:true},{...address,active:false},{...address,publiclyVisible:false},{...address,publicUrl:"https://example.org"}]){
 expect(publicFeatures([{...base,digitalAddress:a}],bounds,"PA",0).features[0].properties.digitalAddressUrl).toBeNull();
 }
 expect(publicFeatures([{...base,digitalAddress:address}],bounds,"PA",0).features[0].properties.digitalAddressUrl).toBe(address.publicUrl);
});
test("invalid bounds rejected",()=>expect(()=>publicFeatures([base],{...bounds,north:99},"PA",0)).toThrow());

test("Radar commercial policy projects only fields allowed by active benefits",()=>{
 const now=Date.parse("2026-11-25T16:00:00Z");
 const fixture={...base,country:"PA" as const,registrationProfile:{
  province:"Veraguas",locality:"Santiago",description:"Privada hasta activar",phone:"+507 6000 0000",
  whatsapp:"+50760000000",hours:{wednesday:"08:00-18:00"},
  socials:["https://www.instagram.com/radar/","https://example.test/"],extras:{legalName:"Privado"}
 }};
 const free=publicFeatures([fixture],bounds,"PA",now,true,true).features[0].properties;
 expect(free).toMatchObject({phone:"+507 6000 0000",openStatus:"Abierto ahora",pin:"normal"});
 expect(free).not.toHaveProperty("registrationProfile");
 expect(free).not.toHaveProperty("details");
 const annual=publicFeatures([{...fixture,annualUntil:now+1}],bounds,"PA",now,true,true).features[0].properties;
 expect(annual).toMatchObject({annualUntil:now+1,registrationProfile:{description:"Privada hasta activar",socials:["https://www.instagram.com/radar/"]}});
 expect(annual).not.toHaveProperty("registrationProfile.extras");
 const promo={kind:"live" as const,startsAt:now-1,endsAt:now+1};
 expect(publicFeatures([{...fixture,campaign:promo}],bounds,"PA",now,true,true).features[0].properties).toMatchObject({pin:"live",annualUntil:null});
 expect(publicFeatures([{...fixture,campaign:promo,annualUntil:now+1}],bounds,"PA",now+1,true,true).features[0].properties).not.toHaveProperty("registrationProfile");
});

test("commercial map keeps the independent corporate link without granting commercial visibility",()=>{
 const code=publicFeatures([{...base,digitalAddress:address}],bounds,"PA",1,true,true).features[0].properties;
 expect(code).toMatchObject({corporate:true,digitalAddressUrl:address.publicUrl,pin:"normal"});
 expect(code).not.toHaveProperty("registrationProfile");
 const residential=publicFeatures([{...base,digitalAddress:{...address,residential:true}}],bounds,"PA",1,true,true).features[0].properties;
 expect(residential).toMatchObject({corporate:false});
 expect(residential).not.toHaveProperty("digitalAddressUrl");
});
