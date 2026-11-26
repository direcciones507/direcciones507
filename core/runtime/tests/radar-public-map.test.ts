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


test("commercial occupancy is public independently of promotions and owner capacity",()=>{
 const now=Date.now();
 const rows:Establishment[]=[{...base,details:{hours:{monday:"08:00-17:00"},quantity:18,unit:"tables",updatedAt:now},
  reports:[{state:"available",source:"community",createdAt:now-2},{state:"incident",source:"community",createdAt:now-1},{state:"full",source:"verified_owner",createdAt:now}]}];
 const features=(e:Establishment,at=now)=>publicFeatures([e],bounds,"PA",at,true,true).features[0].properties;
 expect(features(rows[0])).toMatchObject({activity:"available",reportedAt:now-2});
 for(const key of ["phone","openStatus","details","registrationProfile","coverAvailable"])expect(features(rows[0])).not.toHaveProperty(key);
 expect(features({...rows[0],annualUntil:now+10})).not.toHaveProperty("coverAvailable");
 const promoted={...rows[0],annualUntil:now+10,campaign:{kind:"featured" as const,startsAt:now-10,endsAt:now+1}};
 expect(features(promoted)).toMatchObject({coverAvailable:true,activity:"available"});
 expect(features(promoted,now+1)).not.toHaveProperty("coverAvailable");
 expect(features(rows[0],now+30*60*1000)).not.toHaveProperty("activity");
});
