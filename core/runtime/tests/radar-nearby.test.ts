import {test,expect} from "bun:test";
import {nearbyBounds,nearbyRows} from "../radar/ui/ui-model.js";
test("nearby queries use coarse bounds rather than precise location",()=>{
 expect(nearbyBounds(8.9824,-79.5199,5)).toEqual([-79.75,8.75,-79.25,9.25]);
 expect(nearbyBounds(8.987,-79.52,5)).toEqual(nearbyBounds(8.9824,-79.5199,5));
 expect(nearbyBounds(99,0,5)).toBeNull();
 expect(nearbyBounds(8,-80,50)).toBeNull();
});
test("nearby sorts by distance, filters country/category/radius and expires stale activity",()=>{
 const now=2000000;
 const f=(id:string,lng:number,category="shop",country="PA")=>({id,geometry:{type:"Point",coordinates:[lng,8]},properties:{country,category,activity:"full",reportedAt:1}});
 const rows=nearbyRows([f("far",-80.5),f("second",-80.02),f("first",-80),f("wrong",-80,"cafe"),f("foreign",-80,"shop","CO")],8,-80,5,"shop","PA",now);
 expect(rows.map(r=>r.feature.id)).toEqual(["first","second"]);
 expect(rows[0].feature.properties.activity).toBe("unknown");
});
