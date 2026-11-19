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
