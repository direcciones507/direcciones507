import {test,expect} from "bun:test";
import {pulseRows,priorityFeatures,mapFeatures} from "../radar/ui/ui-model.js";
const now=2000000;
const feature=(id:string,liveUntil:number|null,category="shop",country="PA",featuredUntil:number|null=null)=>({id,geometry:{type:"Point",coordinates:[-80,8]},properties:{country,category,activity:"available",reportedAt:now-1000,source:"community",liveUntil,featuredUntil}});
test("pulse contains only active commercial live campaigns, regardless of reports",()=>{
 const live=feature("live",now+10000);
 live.properties.reportedAt=0;
 expect(pulseRows([feature("normal",null),live,feature("expired",now),feature("featured",null,"shop","PA",now+20000),feature("foreign",now+1,"shop","CO")],"PA","",now).map(r=>r.id)).toEqual(["live"]);
});
test("pulse category filter and expiry",()=>{
 const rows=[feature("bar",now+1000,"restaurant"),feature("hotel",now+2000,"hotel")];
 expect(pulseRows(rows,"PA","hotel",now).map(r=>r.id)).toEqual(["hotel"]);
 expect(pulseRows(rows,"PA","",now+2000)).toEqual([]);
});
test("commercial priority and normal visibility at every zoom",()=>{
 const rows=[{properties:{pin:"normal"}},{properties:{pin:"featured"}},{properties:{pin:"live"}}];
 expect(priorityFeatures(rows).map(r=>r.properties.pin)).toEqual(["live","featured"]);
 expect(mapFeatures(rows,12,12.6).map(r=>r.properties.pin)).toEqual(["normal","featured","live"]);
 expect(mapFeatures(rows,13,12.6)).toHaveLength(3);
});
